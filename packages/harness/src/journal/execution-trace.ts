/**
 * Execution Trace Logger
 *
 * Meta-Harness optimization (arxiv 2603.28052): Store full execution traces
 * (commands run, outputs, errors, timing) so the AI proposer can do
 * counterfactual diagnosis — tracing a failure back to the specific
 * code/command decision that caused it, rather than guessing from a score.
 *
 * Key insight: A single evaluation can produce up to 10M tokens of diagnostic
 * information. Both OpenEvolve and PUCT compress history into a fixed prompt
 * format, discarding the execution traces that Meta-Harness uses for targeted
 * diagnosis.
 *
 * Output: .harness/journal/tasks/{epic}/tasks/{task}/attempts/{N}/trace.jsonl
 *
 * The AI doesn't need to read the entire trace — it can grep/search for
 * specific patterns (errors, timeouts, exit codes) as needed.
 */

import { appendFile, mkdir, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/**
 * Classification of trace entry actions
 */
export type TraceAction =
  | 'tool_call'     // AI tool invocation (Read, Write, Bash, etc.)
  | 'file_write'    // File created or modified
  | 'file_read'     // File read by the system
  | 'command'       // Shell command executed
  | 'ai_response'   // AI model response received
  | 'check_run'     // Validation check executed
  | 'gap_detected'  // Gap detected during evaluation
  | 'strategy_try'  // Repair strategy attempted
  | 'error'         // Error occurred
  | 'milestone';    // Significant event (task start, phase change, etc.)

/**
 * A single execution trace entry.
 * Designed to be compact when serialized (~100-200 bytes per entry).
 */
export interface TraceEntry {
  /** ISO timestamp */
  ts: string;
  /** Action classification */
  action: TraceAction;
  /** What was attempted (command, tool name, file path, etc.) */
  input: string;
  /** What happened (stdout, result summary, error message) — truncated to limit size */
  output: string;
  /** Duration in milliseconds */
  ms: number;
  /** Exit code for commands, HTTP status for APIs */
  code?: number;
  /** Whether this action succeeded */
  ok: boolean;
  /** Optional category for grouping (e.g., 'check', 'repair', 'build') */
  cat?: string;
}

/**
 * Trace summary statistics for quick diagnosis
 */
export interface TraceSummary {
  /** Total trace entries */
  totalEntries: number;
  /** Total duration of traced actions */
  totalDurationMs: number;
  /** Count by action type */
  byAction: Record<string, number>;
  /** Count of failures by action type */
  failuresByAction: Record<string, number>;
  /** Last N errors (most recent first) */
  recentErrors: Array<{ input: string; output: string; ts: string }>;
  /** Commands with non-zero exit codes */
  failedCommands: Array<{ input: string; code: number; output: string }>;
}

/* ------------------------------------------------------------------ */
/*  Trace Logger                                                       */
/* ------------------------------------------------------------------ */

export class ExecutionTraceLogger {
  private tracePath: string;
  private buffer: TraceEntry[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  /** Max output length per trace entry (prevents bloat from large stdout) */
  private static readonly MAX_OUTPUT_LENGTH = 500;
  /** Flush buffer every N entries or after this delay */
  private static readonly FLUSH_THRESHOLD = 10;
  private static readonly FLUSH_DELAY_MS = 2000;

  constructor(attemptDir: string) {
    this.tracePath = join(attemptDir, 'trace.jsonl');
  }

  /**
   * Log a trace entry. Buffered for performance.
   */
  async log(entry: Omit<TraceEntry, 'ts'>): Promise<void> {
    const full: TraceEntry = {
      ts: new Date().toISOString(),
      ...entry,
      output: this.truncateOutput(entry.output),
    };

    this.buffer.push(full);

    if (this.buffer.length >= ExecutionTraceLogger.FLUSH_THRESHOLD) {
      await this.flush();
    } else if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => {
        void this.flush();
      }, ExecutionTraceLogger.FLUSH_DELAY_MS);
    }
  }

  /**
   * Log a shell command execution
   */
  async logCommand(cmd: string, output: string, exitCode: number, durationMs: number, category?: string): Promise<void> {
    await this.log({
      action: 'command',
      input: cmd,
      output,
      ms: durationMs,
      code: exitCode,
      ok: exitCode === 0,
      cat: category,
    });
  }

  /**
   * Log a validation check result
   */
  async logCheck(checkId: string, cmd: string, passed: boolean, output: string, durationMs: number): Promise<void> {
    await this.log({
      action: 'check_run',
      input: `${checkId}: ${cmd}`,
      output,
      ms: durationMs,
      ok: passed,
      cat: 'check',
    });
  }

  /**
   * Log a repair strategy attempt
   */
  async logStrategy(strategyName: string, success: boolean, reason: string, durationMs: number): Promise<void> {
    await this.log({
      action: 'strategy_try',
      input: strategyName,
      output: reason,
      ms: durationMs,
      ok: success,
      cat: 'repair',
    });
  }

  /**
   * Log a gap detection event
   */
  async logGap(gapId: string, description: string, kind: string): Promise<void> {
    await this.log({
      action: 'gap_detected',
      input: `${kind}: ${gapId}`,
      output: description,
      ms: 0,
      ok: false,
      cat: 'gap',
    });
  }

  /**
   * Log a milestone event
   */
  async logMilestone(event: string, details: string = ''): Promise<void> {
    await this.log({
      action: 'milestone',
      input: event,
      output: details,
      ms: 0,
      ok: true,
    });
  }

  /**
   * Log an error
   */
  async logError(context: string, error: string): Promise<void> {
    await this.log({
      action: 'error',
      input: context,
      output: error,
      ms: 0,
      ok: false,
      cat: 'error',
    });
  }

  /**
   * Flush buffered entries to disk
   */
  async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.buffer.length === 0) return;

    const entries = this.buffer.splice(0);
    const lines = entries.map(e => JSON.stringify(e)).join('\n') + '\n';

    const dir = dirname(this.tracePath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    await appendFile(this.tracePath, lines, 'utf-8');
  }

  /**
   * Stop the logger and flush remaining entries
   */
  async stop(): Promise<void> {
    await this.flush();
  }

  /**
   * Build a concise summary of the trace for AI prompt inclusion.
   * Focuses on failures and errors — the most diagnostic information.
   */
  async buildSummary(): Promise<TraceSummary> {
    await this.flush(); // Ensure all entries are written

    const entries = await this.readAll();

    const byAction: Record<string, number> = {};
    const failuresByAction: Record<string, number> = {};
    const recentErrors: TraceSummary['recentErrors'] = [];
    const failedCommands: TraceSummary['failedCommands'] = [];
    let totalDurationMs = 0;

    for (const entry of entries) {
      byAction[entry.action] = (byAction[entry.action] || 0) + 1;
      totalDurationMs += entry.ms;

      if (!entry.ok) {
        failuresByAction[entry.action] = (failuresByAction[entry.action] || 0) + 1;

        if (entry.action === 'error') {
          recentErrors.push({ input: entry.input, output: entry.output, ts: entry.ts });
        }

        if (entry.action === 'command' && entry.code !== undefined && entry.code !== 0) {
          failedCommands.push({ input: entry.input, code: entry.code, output: entry.output });
        }
      }
    }

    return {
      totalEntries: entries.length,
      totalDurationMs,
      byAction,
      failuresByAction,
      recentErrors: recentErrors.slice(-5),
      failedCommands: failedCommands.slice(-5),
    };
  }

  /**
   * Format trace summary as a concise string for AI prompts.
   * ~200-400 tokens — much cheaper than raw trace.
   */
  async formatSummaryForPrompt(): Promise<string | null> {
    const summary = await this.buildSummary();
    if (summary.totalEntries === 0) return null;

    const lines: string[] = [
      `## Execution Trace Summary (${summary.totalEntries} events, ${Math.round(summary.totalDurationMs / 1000)}s)`,
      '',
    ];

    // Failed commands (most diagnostic)
    if (summary.failedCommands.length > 0) {
      lines.push('### Failed Commands');
      for (const cmd of summary.failedCommands) {
        lines.push(`- \`${cmd.input}\` → exit ${cmd.code}: ${cmd.output.slice(0, 150)}`);
      }
      lines.push('');
    }

    // Recent errors
    if (summary.recentErrors.length > 0) {
      lines.push('### Recent Errors');
      for (const err of summary.recentErrors) {
        lines.push(`- ${err.input}: ${err.output.slice(0, 150)}`);
      }
      lines.push('');
    }

    // Failure counts by action
    if (Object.keys(summary.failuresByAction).length > 0) {
      lines.push('### Failure Counts');
      for (const [action, count] of Object.entries(summary.failuresByAction)) {
        lines.push(`- ${action}: ${count} failures`);
      }
      lines.push('');
    }

    // If nothing failed, note success
    if (summary.failedCommands.length === 0 && summary.recentErrors.length === 0) {
      lines.push('All traced actions succeeded.');
    }

    lines.push(`\nFull trace: ${this.tracePath}`);

    return lines.join('\n');
  }

  /** Get path to trace file */
  get path(): string {
    return this.tracePath;
  }

  private truncateOutput(output: string): string {
    if (output.length <= ExecutionTraceLogger.MAX_OUTPUT_LENGTH) return output;
    return output.slice(0, ExecutionTraceLogger.MAX_OUTPUT_LENGTH) + '…[truncated]';
  }

  private async readAll(): Promise<TraceEntry[]> {
    if (!existsSync(this.tracePath)) return [];
    try {
      const raw = await readFile(this.tracePath, 'utf-8');
      return raw
        .split('\n')
        .filter(l => l.trim())
        .map(l => {
          try {
            return JSON.parse(l) as TraceEntry;
          } catch {
            return null;
          }
        })
        .filter((e): e is TraceEntry => e !== null);
    } catch {
      return [];
    }
  }
}
