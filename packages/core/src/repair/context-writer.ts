/**
 * Filesystem-Based Context Writer
 *
 * Meta-Converge core optimization (arxiv 2603.28052): Instead of stuffing all
 * context into a single prompt (expensive, wasteful), write structured context
 * files to the filesystem and let the AI agent read only what it needs.
 *
 * The Meta-Converge proposer reads a median of 82 files per iteration but from
 * a pool of thousands — it's selective. A single evaluation can produce up to
 * 10M tokens of diagnostic context, roughly three orders of magnitude beyond
 * the largest feedback budgets used in prior text optimization settings.
 *
 * Instead of:
 *   prompt = contextDoc + skillMd + inputs(50 files) + outputs + checks + plan + learn
 *   → 3000-8000 tokens every iteration
 *
 * We write:
 *   .converge/journal/{epic}/{task}/attempts/wip/context/
 *     ├── inputs-manifest.md      # Input file listing
 *     ├── outputs-status.md       # Output exists: yes/no
 *     ├── checks-results.md       # Check pass/fail with output
 *     ├── gaps-summary.md         # Compact gap representation
 *     ├── history-summary.md      # What was tried before
 *     ├── trace-summary.md        # Execution trace highlights
 *     └── prior-attempts/         # Indexed history of all attempts
 *
 * Then the repair prompt becomes:
 *   "Context files are at {path}. Read what you need to diagnose and fix."
 *   → ~200 tokens + agent reads selectively
 *
 * Token savings: ~60-75% per repair iteration
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { Gap } from '../gap/types.ts';
import { formatCompactGaps } from '../gap/types.ts';
import { HistoryIndexBuilder } from './history-index.ts';
import { ExecutionTraceLogger } from '../journal/execution-trace.ts';
import type { JournalContext } from './types.ts';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ContextWriterParams {
  projectDir: string;
  journalCtx: JournalContext;
  attemptDir: string;
  /** Current gaps to write context for */
  gaps: Gap[];
  /** Output file paths and their existence status */
  outputStatus?: Array<{ path: string; exists: boolean }>;
  /** Check results (if available) */
  checkResults?: Array<{ id: string; cmd: string; passed: boolean; output: string }>;
  /** Execution trace logger (if available) */
  traceLogger?: ExecutionTraceLogger;
}

export interface ContextWriterResult {
  /** Path to context directory */
  contextDir: string;
  /** Relative path from project root (for prompt inclusion) */
  relContextDir: string;
  /** Files that were written */
  writtenFiles: string[];
}

/* ------------------------------------------------------------------ */
/*  Main writer                                                        */
/* ------------------------------------------------------------------ */

/**
 * Write structured repair context to filesystem.
 * Returns paths for the repair prompt to reference.
 */
export async function writeRepairContext(params: ContextWriterParams): Promise<ContextWriterResult> {
  const {
    projectDir, journalCtx, attemptDir,
    gaps, outputStatus, checkResults, traceLogger,
  } = params;

  const contextDir = join(attemptDir, 'context');
  await mkdir(contextDir, { recursive: true });

  const relContextDir = relative(projectDir, contextDir).replace(/\\/g, '/');
  const writtenFiles: string[] = [];

  // 1. Gaps summary (compact format)
  if (gaps.length > 0) {
    const gapsMd = formatCompactGaps(gaps);
    await writeFile(join(contextDir, 'gaps-summary.md'), gapsMd);
    writtenFiles.push('gaps-summary.md');
  }

  // 2. Output status
  if (outputStatus && outputStatus.length > 0) {
    const lines = ['# Output Status', ''];
    for (const o of outputStatus) {
      const icon = o.exists ? '✓' : '✗';
      lines.push(`- ${icon} \`${o.path}\` ${o.exists ? 'exists' : 'MISSING'}`);
    }
    await writeFile(join(contextDir, 'outputs-status.md'), lines.join('\n'));
    writtenFiles.push('outputs-status.md');
  }

  // 3. Check results (only if we have results)
  if (checkResults && checkResults.length > 0) {
    const lines = ['# Check Results', ''];
    const failed = checkResults.filter(c => !c.passed);
    const passed = checkResults.filter(c => c.passed);

    if (failed.length > 0) {
      lines.push(`## Failed (${failed.length})`, '');
      for (const c of failed) {
        lines.push(`### ${c.id}`);
        lines.push(`Command: \`${c.cmd}\``);
        if (c.output.trim()) {
          lines.push('```', c.output.trim().slice(0, 500), '```');
        }
        lines.push('');
      }
    }

    if (passed.length > 0) {
      lines.push(`## Passed (${passed.length})`, '');
      for (const c of passed) {
        lines.push(`- ✓ ${c.id}`);
      }
    }

    await writeFile(join(contextDir, 'checks-results.md'), lines.join('\n'));
    writtenFiles.push('checks-results.md');
  }

  // 4. History summary (cross-attempt credit assignment)
  try {
    const historyBuilder = new HistoryIndexBuilder(projectDir, journalCtx);
    const historySummary = await historyBuilder.formatForPrompt();
    if (historySummary) {
      await writeFile(join(contextDir, 'history-summary.md'), historySummary);
      writtenFiles.push('history-summary.md');
    }
  } catch {
    // Non-fatal
  }

  // 5. Trace summary (execution diagnostics)
  if (traceLogger) {
    try {
      const traceSummary = await traceLogger.formatSummaryForPrompt();
      if (traceSummary) {
        await writeFile(join(contextDir, 'trace-summary.md'), traceSummary);
        writtenFiles.push('trace-summary.md');
      }
    } catch {
      // Non-fatal
    }
  }

  return { contextDir, relContextDir, writtenFiles };
}

/**
 * Build a compact repair prompt that references filesystem context
 * instead of inlining all context.
 *
 * Token cost: ~200-300 tokens (vs 3000-8000 for inline context)
 */
export function buildFilesystemRepairPrompt(
  contextResult: ContextWriterResult,
  taskMdPath: string,
  checkMdPath: string,
): string {
  const { relContextDir, writtenFiles } = contextResult;

  const contextFileList = writtenFiles.map(f => `  - \`${relContextDir}/${f}\``).join('\n');

  return `## Repair Task

Fix the gaps identified in this task. Context files are available on the filesystem — read only what you need.

### Key Files

- **Task definition**: Read \`${taskMdPath}\` for task instructions
- **Checks**: Read \`${checkMdPath}\` for validation commands

### Diagnostic Context (read as needed)

${contextFileList}

### Instructions

1. Read \`${relContextDir}/gaps-summary.md\` to understand what's broken
2. If available, read \`${relContextDir}/history-summary.md\` to see what was already tried (DO NOT repeat failed approaches)
3. If available, read \`${relContextDir}/trace-summary.md\` for execution diagnostics
4. Read \`${relContextDir}/checks-results.md\` for exact error output
5. Fix the root cause
6. Run all checks to verify

**IMPORTANT**: Read the history first. If a strategy was tried and failed, try a different approach.`;
}
