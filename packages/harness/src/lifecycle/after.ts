/**
 * After Phase
 *
 * Runs after the agent completes, replacing the bare ctx.checkOutputs() call.
 * Runs all declared checks with stdout capture, computes a file diff vs the
 * before-phase snapshot, and writes structured artifacts to after/.
 */

import { stat, writeFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { getTaskAfterDir } from '../journal/structure.ts';
import { logTaskEvent } from '../journal/writer.ts';
import type { InputSnapshot, InputFile } from './before.ts';
import { healChecks, isBrokenCommand } from './check-healer.ts';
import type { TaskMdDef } from '../config/task-md-definition.ts';
import type { BacklogDef, BacklogItem } from '../scan/types.ts';
import { runBacklogs } from '../scan/backlog-runner.ts';

const execAsync = promisify(exec);

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface CheckDef {
  id: string;
  cmd: string;
  description: string;
}

export interface CheckRunResult {
  id: string;
  description: string;
  cmd: string;
  passed: boolean;
  exitCode: number | string;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export interface FileDiff {
  capturedAt: string;
  created: string[];
  modified: string[];
  deleted: string[];
}

export interface TaskOutcome {
  taskId: string;
  epicId: string;
  success: boolean;
  attempt: number;
  correctionAttempts: number;
  durationMs: number;
  checksTotal: number;
  checksPassed: number;
  failedChecks: CheckRunResult[];
  filesCreated: string[];
  filesModified: string[];
  /** Advisory: count of backlog items collected (non-blocking) */
  backlogItems?: number;
  /** 2-3 sentence summary for downstream sibling/child tasks */
  summaryForDownstream: string;
}

export interface AfterPhaseResult {
  diff: FileDiff;
  checkResults: CheckRunResult[];
  allChecksPassed: boolean;
  outcome: TaskOutcome;
}

export interface AfterPhaseMeta {
  taskId: string;
  epicId: string;
  attempt: number;
  correctionAttempts: number;
  startMs: number;
  description?: string;
  outputs?: string[];
  /** Backlog scan definitions from TASK.md frontmatter */
  backlogs?: BacklogDef[];
  /** When provided, broken check commands are auto-healed and written back to SKILL.md */
  healCtx?: {
    taskMdPath: string;
    def: TaskMdDef;
    body: string;
  };
}

/* ------------------------------------------------------------------ */
/*  Main entry point                                                    */
/* ------------------------------------------------------------------ */

export async function runAfterPhase(
  projectDir: string,
  epicId: string,
  taskId: string,
  checks: CheckDef[],
  inputSnapshot: InputSnapshot,
  meta: AfterPhaseMeta,
): Promise<AfterPhaseResult> {
  const afterDir = getTaskAfterDir(projectDir, epicId, taskId);
  await mkdir(afterDir, { recursive: true });

  await logTaskEvent(projectDir, epicId, taskId, 'LIFECYCLE_AFTER_START',
    `After phase starting — running ${checks.length} check(s)`);

  // 1. Compute file diff
  const diff = await computeDiff(projectDir, inputSnapshot, meta.outputs ?? []);
  await writeFile(join(afterDir, 'diff.json'), JSON.stringify(diff, null, 2));
  await logTaskEvent(projectDir, epicId, taskId, 'DIFF_CAPTURED',
    `Diff: +${diff.created.length} created, ~${diff.modified.length} modified, -${diff.deleted.length} deleted`);

  // 2. Run checks
  await logTaskEvent(projectDir, epicId, taskId, 'CHECKS_RUN',
    `Running ${checks.length} verification check(s)`);

  const checkResults: CheckRunResult[] = [];
  for (const check of checks) {
    const result = await runCheck(projectDir, check);
    checkResults.push(result);
    if (result.passed) {
      await logTaskEvent(projectDir, epicId, taskId, 'CHECK_PASSED',
        `✓ ${check.description}`, { checkId: check.id });
    } else {
      await logTaskEvent(projectDir, epicId, taskId, 'CHECK_FAILED_DETAIL',
        `✗ ${check.description}: ${result.stdout.slice(0, 200) || result.stderr.slice(0, 200)}`,
        { checkId: check.id, exitCode: result.exitCode, stdout: result.stdout, stderr: result.stderr });
    }
  }

  // 2b. Self-heal broken check commands (exit 127 / "command not found")
  //     If any check failed due to a missing binary, patch SKILL.md and re-run immediately.
  if (meta.healCtx) {
    const brokenFailed = checkResults.filter(r => !r.passed && isBrokenCommand(r));
    if (brokenFailed.length > 0) {
      const healResult = await healChecks(
        meta.healCtx.taskMdPath,
        meta.healCtx.def,
        meta.healCtx.body,
        brokenFailed,
        afterDir, // Pass the afterDir as logDir for AI healing attempts
      );
      if (healResult.patched) {
        await logTaskEvent(projectDir, epicId, taskId, 'CHECK_SELF_HEALED',
          `Healed ${healResult.healed.length} broken check(s) in SKILL.md`,
          { healed: healResult.healed.map(h => h.id) });
        // Re-run healed checks with the new commands
        for (const healed of healResult.healed) {
          const idx = checkResults.findIndex(r => r.id === healed.id);
          if (idx === -1) continue;
          const rerun = await runCheck(projectDir, healed);
          checkResults[idx] = rerun;
          await logTaskEvent(projectDir, epicId, taskId,
            rerun.passed ? 'CHECK_PASSED' : 'CHECK_FAILED_DETAIL',
            `${rerun.passed ? '✓' : '✗'} [healed] ${healed.description}`,
            { checkId: healed.id, exitCode: rerun.exitCode });
          console.log(`   ${rerun.passed ? '✅' : '❌'} [healed] ${healed.id}`);
        }
        // Persist updated results
        await writeFile(join(afterDir, 'check-results.json'), JSON.stringify(checkResults, null, 2));
      }
    }
  }

  await writeFile(join(afterDir, 'check-results.json'), JSON.stringify(checkResults, null, 2));

  const allChecksPassed = checks.length === 0 || checkResults.every(r => r.passed);
  const checksPassed = checkResults.filter(r => r.passed).length;
  const failedChecks = checkResults.filter(r => !r.passed);
  const durationMs = Date.now() - meta.startMs;

  // 2c. Run backlog scans (non-blocking, advisory)
  let backlogItemCount = 0;
  if (meta.backlogs && meta.backlogs.length > 0) {
    const backlogItems = runBacklogs(meta.backlogs, projectDir);
    backlogItemCount = backlogItems.length;
    if (backlogItems.length > 0) {
      const jsonl = backlogItems.map(item => JSON.stringify(item)).join('\n') + '\n';
      await writeFile(join(afterDir, 'backlogs.jsonl'), jsonl);
      await logTaskEvent(projectDir, epicId, taskId, 'BACKLOGS_COLLECTED',
        `Backlog scan: ${backlogItems.length} item(s) from ${meta.backlogs.length} category(ies)`);
    }
  }

  // 3. Build outcome
  const outcome: TaskOutcome = {
    taskId: meta.taskId,
    epicId: meta.epicId,
    success: allChecksPassed,
    attempt: meta.attempt,
    correctionAttempts: meta.correctionAttempts,
    durationMs,
    checksTotal: checks.length,
    checksPassed,
    failedChecks,
    filesCreated: diff.created,
    filesModified: diff.modified,
    backlogItems: backlogItemCount || undefined,
    summaryForDownstream: buildDownstreamSummary(meta, diff, allChecksPassed, failedChecks),
  };
  await writeFile(join(afterDir, 'outcome.json'), JSON.stringify(outcome, null, 2));
  await logTaskEvent(projectDir, epicId, taskId, 'OUTCOME_WRITTEN',
    `Outcome: ${allChecksPassed ? 'SUCCESS' : 'FAILED'} — ${checksPassed}/${checks.length} checks passed`,
    { success: allChecksPassed, durationMs });

  await logTaskEvent(projectDir, epicId, taskId, 'LIFECYCLE_AFTER_COMPLETE',
    `After phase complete — ${allChecksPassed ? 'all checks passed' : `${failedChecks.length} check(s) failed`}`);

  return { diff, checkResults, allChecksPassed, outcome };
}

/* ------------------------------------------------------------------ */
/*  Read last outcome (for external use)                               */
/* ------------------------------------------------------------------ */

export async function readLastOutcome(
  projectDir: string,
  epicId: string,
  taskId: string,
): Promise<TaskOutcome | null> {
  const afterDir = getTaskAfterDir(projectDir, epicId, taskId);
  const path = join(afterDir, 'outcome.json');
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(await readFile(path, 'utf8')) as TaskOutcome;
  } catch { return null; }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

async function runCheck(projectDir: string, check: CheckDef): Promise<CheckRunResult> {
  const start = Date.now();
  try {
    const shell = process.platform === 'win32' ? 'bash' : '/bin/bash';
    const { stdout, stderr } = await execAsync(check.cmd, {
      cwd: projectDir,
      timeout: 30_000,
      shell,
    });
    return {
      id: check.id,
      description: check.description,
      cmd: check.cmd,
      passed: true,
      exitCode: 0,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      durationMs: Date.now() - start,
    };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; code?: number | string };
    return {
      id: check.id,
      description: check.description,
      cmd: check.cmd,
      passed: false,
      exitCode: e.code ?? 1,
      stdout: (e.stdout ?? '').trim(),
      stderr: (e.stderr ?? '').trim(),
      durationMs: Date.now() - start,
    };
  }
}

async function computeDiff(
  projectDir: string,
  inputSnapshot: InputSnapshot,
  declaredOutputs: string[],
): Promise<FileDiff> {
  // Build a map of all previously known files
  const knownFiles = new Map<string, InputFile>();
  for (const inp of inputSnapshot.inputs) {
    for (const f of inp.files) {
      knownFiles.set(f.path, f);
    }
  }

  // Stat declared outputs + any file that was in the snapshot
  const filesToCheck = new Set<string>([
    ...knownFiles.keys(),
    ...declaredOutputs,
  ]);

  const created: string[] = [];
  const modified: string[] = [];
  const deleted: string[] = [];

  for (const rel of filesToCheck) {
    const absPath = join(projectDir, rel);
    const wasKnown = knownFiles.has(rel);
    try {
      const s = await stat(absPath);
      if (!s.isFile()) continue;
      if (!wasKnown) {
        created.push(rel);
      } else {
        const prev = knownFiles.get(rel)!;
        if (s.mtimeMs > prev.mtimeMs || s.size !== prev.sizeBytes) {
          modified.push(rel);
        }
      }
    } catch {
      if (wasKnown) deleted.push(rel);
      // If neither known nor exists → created output not yet created (tracked by checks)
    }
  }

  return { capturedAt: new Date().toISOString(), created, modified, deleted };
}

function buildDownstreamSummary(
  meta: AfterPhaseMeta,
  diff: FileDiff,
  success: boolean,
  failedChecks: CheckRunResult[],
): string {
  const desc = meta.description ?? meta.taskId;
  if (success) {
    const files = diff.created.length > 0
      ? `Created: ${diff.created.slice(0, 3).join(', ')}${diff.created.length > 3 ? ` (+${diff.created.length - 3} more)` : ''}.`
      : 'No new files created.';
    return `Task "${desc}" completed successfully after ${meta.attempt} attempt(s). ${files}`;
  } else {
    const failing = failedChecks.slice(0, 2).map(c => c.description).join(', ');
    return `Task "${desc}" failed after ${meta.attempt} attempt(s) + ${meta.correctionAttempts} correction(s). Failing checks: ${failing || 'none recorded'}.`;
  }
}
