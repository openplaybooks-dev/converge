/**
 * After Phase
 *
 * Runs after the agent completes, replacing the bare ctx.checkOutputs() call.
 * Runs all declared checks with stdout capture, computes a file diff vs the
 * before-phase snapshot, and writes structured artifacts to after/.
 */

import { stat, writeFile, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { exec, spawn } from "node:child_process";
import { promisify } from "node:util";
import { getTaskAfterDir } from "../../journal/structure.ts";
import { logTaskEvent } from "../../journal/writer.ts";
import type { InputSnapshot, InputFile } from "./before.ts";
import { runAiCheck, loadProjectAIConfig } from "../checks/ai-check.ts";

const execAsync = promisify(exec);

/**
 * Run a check command in its own process group so background processes it
 * spawns (e.g. `pnpm preview &`) get killed along with it. Without this,
 * checks that spawn long-running children leak orphans across attempts —
 * the orphans hold ports/files and cause subsequent attempts to fail.
 *
 * On Unix-like systems uses `detached: true` + negative-PID kill on the
 * group. On Windows falls back to plain exec (no process-group concept).
 */
async function execInProcessGroup(
  cmd: string,
  opts: { cwd: string; timeoutMs: number; shell: string },
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  // Windows: exec semantics are different and there's no PG model. Fall
  // back to the legacy exec path. Most check leaks happen on POSIX dev
  // machines where pnpm + node forms a parent/child pair.
  if (process.platform === "win32") {
    try {
      const { stdout, stderr } = await execAsync(cmd, {
        cwd: opts.cwd,
        timeout: opts.timeoutMs,
        shell: opts.shell,
      });
      return { stdout, stderr, exitCode: 0 };
    } catch (err: any) {
      return {
        stdout: err.stdout ?? "",
        stderr: err.stderr ?? "",
        exitCode: typeof err.code === "number" ? err.code : 1,
      };
    }
  }

  return new Promise((resolve) => {
    const child = spawn(opts.shell, ["-c", cmd], {
      cwd: opts.cwd,
      detached: true, // become process-group leader
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    const killGroup = (signal: NodeJS.Signals = "SIGTERM") => {
      if (typeof child.pid === "number") {
        try {
          // Negative PID → kill entire process group.
          process.kill(-child.pid, signal);
        } catch {
          // Group already gone or never spawned. Best-effort.
        }
      }
    };

    const timer = setTimeout(() => {
      timedOut = true;
      killGroup("SIGTERM");
      // SIGKILL backstop in case child traps SIGTERM and stalls.
      setTimeout(() => killGroup("SIGKILL"), 1500).unref();
    }, opts.timeoutMs);
    timer.unref();

    const finalize = (exitCode: number) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      // Belt-and-braces: kill any group survivors (background `&` jobs).
      killGroup("SIGTERM");
      setTimeout(() => killGroup("SIGKILL"), 250).unref();
      if (timedOut) {
        stderr += `\n[converge] check timed out after ${opts.timeoutMs}ms; process group killed`;
      }
      resolve({ stdout, stderr, exitCode });
    };

    child.on("error", (err) => {
      stderr += `\n[converge] spawn error: ${err.message}`;
      finalize(1);
    });
    child.on("close", (code) => finalize(code ?? 1));
  });
}

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface CheckDef {
  id: string;
  description: string;
  /** Bash command for type:"cmd" checks (default). */
  cmd?: string;
  /** Discriminator. Defaults to "cmd" when absent. */
  type?: "cmd" | "ai" | "test";
  /** Plain-English assertion the AI judge verifies; required for type:"ai". */
  check?: string;
  /** Test name for type:"test" checks. */
  name?: string;
  /** Test arguments for type:"test" checks. */
  args?: Record<string, string>;
  /** Optional AI provider override; defaults to project ai: config. */
  agent?: string;
  /** Optional AI model override. */
  model?: string;
  /** Optional per-check timeout (ms). */
  timeoutMs?: number;
}

export interface CheckRunResult {
  id: string;
  description: string;
  /** The executed bash command for type:"cmd" checks; absent for type:"ai". */
  cmd?: string;
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

  await logTaskEvent(
    projectDir,
    epicId,
    taskId,
    "LIFECYCLE_AFTER_START",
    `After phase starting — running ${checks.length} check(s)`,
  );

  // 1. Compute file diff
  const diff = await computeDiff(projectDir, inputSnapshot, meta.outputs ?? []);
  await writeFile(join(afterDir, "diff.json"), JSON.stringify(diff, null, 2));
  await logTaskEvent(
    projectDir,
    epicId,
    taskId,
    "DIFF_CAPTURED",
    `Diff: +${diff.created.length} created, ~${diff.modified.length} modified, -${diff.deleted.length} deleted`,
  );

  // 2. Run checks
  await logTaskEvent(
    projectDir,
    epicId,
    taskId,
    "CHECKS_RUN",
    `Running ${checks.length} verification check(s)`,
  );

  const checkResults: CheckRunResult[] = [];
  const declaredOutputs = meta.outputs ?? [];
  for (const check of checks) {
    const result = await runCheck(projectDir, check, declaredOutputs);
    checkResults.push(result);
    if (result.passed) {
      await logTaskEvent(
        projectDir,
        epicId,
        taskId,
        "CHECK_PASSED",
        `✓ ${check.description}`,
        { checkId: check.id },
      );
    } else {
      await logTaskEvent(
        projectDir,
        epicId,
        taskId,
        "CHECK_FAILED_DETAIL",
        `✗ ${check.description}: ${result.stdout.slice(0, 200) || result.stderr.slice(0, 200)}`,
        {
          checkId: check.id,
          exitCode: result.exitCode,
          stdout: result.stdout,
          stderr: result.stderr,
        },
      );
    }
  }

  await writeFile(
    join(afterDir, "check-results.json"),
    JSON.stringify(checkResults, null, 2),
  );

  const allChecksPassed =
    checks.length === 0 || checkResults.every((r) => r.passed);
  const checksPassed = checkResults.filter((r) => r.passed).length;
  const failedChecks = checkResults.filter((r) => !r.passed);
  const durationMs = Date.now() - meta.startMs;

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
    summaryForDownstream: buildDownstreamSummary(
      meta,
      diff,
      allChecksPassed,
      failedChecks,
    ),
  };
  await writeFile(
    join(afterDir, "outcome.json"),
    JSON.stringify(outcome, null, 2),
  );
  await logTaskEvent(
    projectDir,
    epicId,
    taskId,
    "OUTCOME_WRITTEN",
    `Outcome: ${allChecksPassed ? "SUCCESS" : "FAILED"} — ${checksPassed}/${checks.length} checks passed`,
    { success: allChecksPassed, durationMs },
  );

  await logTaskEvent(
    projectDir,
    epicId,
    taskId,
    "LIFECYCLE_AFTER_COMPLETE",
    `After phase complete — ${allChecksPassed ? "all checks passed" : `${failedChecks.length} check(s) failed`}`,
  );

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
  const path = join(afterDir, "outcome.json");
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(await readFile(path, "utf8")) as TaskOutcome;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * If a check references any declared output AND none of those outputs exist
 * yet, the check is doomed to fail for "outputs not produced" reasons rather
 * than "predicate violated" reasons. Treat as soft-fail (passed=false but
 * with a clear "prerequisite missing" marker) rather than running the
 * doomed shell command.
 *
 * Heuristic: look for any declared output path appearing as a substring of
 * the check command. If at least one such path is referenced and *all*
 * referenced ones are absent, skip. If at least one referenced one exists
 * (e.g. partial outputs), run the check normally.
 */
function prerequisitesMet(
  projectDir: string,
  cmd: string,
  declaredOutputs: string[],
): { ready: true } | { ready: false; missing: string[] } {
  if (declaredOutputs.length === 0) return { ready: true };

  const referenced = declaredOutputs.filter((out) => cmd.includes(out));
  if (referenced.length === 0) return { ready: true };

  const missing: string[] = [];
  for (const rel of referenced) {
    const abs = join(projectDir, rel);
    if (!existsSync(abs)) missing.push(rel);
  }

  // If every referenced output is missing, skip. If even one exists, run
  // the check — partial outputs are a real situation the predicate may want
  // to verify.
  if (missing.length === referenced.length) return { ready: false, missing };
  return { ready: true };
}

async function runCheck(
  projectDir: string,
  check: CheckDef,
  declaredOutputs: string[] = [],
): Promise<CheckRunResult> {
  const start = Date.now();

  if (check.type === "ai") {
    if (!check.check) {
      return {
        id: check.id,
        description: check.description,
        passed: false,
        exitCode: 1,
        stdout: "",
        stderr: `AI check "${check.id}" is missing required "check" field`,
        durationMs: Date.now() - start,
      };
    }
    const aiConfig = await loadProjectAIConfig(projectDir);
    const aiResult = await runAiCheck(
      {
        id: check.id,
        description: check.description,
        check: check.check,
        agent: check.agent,
        model: check.model,
        timeoutMs: check.timeoutMs,
      },
      {
        projectDir,
        taskId: check.id,
        description: check.description,
        outputs: declaredOutputs,
      },
      aiConfig,
    );
    return {
      id: check.id,
      description: check.description,
      passed: aiResult.pass,
      exitCode: aiResult.pass ? 0 : 1,
      stdout: aiResult.feedback,
      stderr: "",
      durationMs: aiResult.durationMs,
    };
  }

  // Test-ref checks should be expanded by the load pipeline. If one reaches
  // here without a cmd, the test reference was not resolved.
  if (check.type === "test") {
    if (!check.cmd) {
      return {
        id: check.id,
        description: check.description,
        passed: false,
        exitCode: 1,
        stdout: "",
        stderr: `Unresolved test reference: "${check.name || check.id}" — test not found in registry`,
        durationMs: Date.now() - start,
      };
    }
    // Expanded test ref — has a cmd, fall through to normal cmd execution
  }

  if (!check.cmd) {
    return {
      id: check.id,
      description: check.description,
      passed: false,
      exitCode: 1,
      stdout: "",
      stderr: `check "${check.id}" has neither "cmd" nor "type: ai" + "check"`,
      durationMs: Date.now() - start,
    };
  }

  // Gate: skip checks whose declared-output prerequisites haven't been
  // produced yet. Reduces noise during early phases of long playbooks.
  const prereq = prerequisitesMet(projectDir, check.cmd, declaredOutputs);
  if (!prereq.ready) {
    return {
      id: check.id,
      description: check.description,
      cmd: check.cmd,
      passed: false,
      exitCode: "skipped",
      stdout: "",
      stderr: `prerequisite missing: ${prereq.missing.join(", ")} (declared output not yet produced)`,
      durationMs: Date.now() - start,
    };
  }

  const shell = process.platform === "win32" ? "bash" : "/bin/bash";
  // Use process-group exec so background processes (e.g. `pnpm preview &`
  // inside lighthouse checks) get killed when the check completes. Without
  // this, orphans hold ports across attempts and cause subsequent runs to
  // fail with stale-state false-negatives.
  const result = await execInProcessGroup(check.cmd, {
    cwd: projectDir,
    timeoutMs: 60_000, // bumped from 30s — lighthouse + preview boot can need more
    shell,
  });

  return {
    id: check.id,
    description: check.description,
    cmd: check.cmd,
    passed: result.exitCode === 0,
    exitCode: result.exitCode,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
    durationMs: Date.now() - start,
  };
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
    const files =
      diff.created.length > 0
        ? `Created: ${diff.created.slice(0, 3).join(", ")}${diff.created.length > 3 ? ` (+${diff.created.length - 3} more)` : ""}.`
        : "No new files created.";
    return `Task "${desc}" completed successfully after ${meta.attempt} attempt(s). ${files}`;
  } else {
    const failing = failedChecks
      .slice(0, 2)
      .map((c) => c.description)
      .join(", ");
    return `Task "${desc}" failed after ${meta.attempt} attempt(s) + ${meta.correctionAttempts} correction(s). Failing checks: ${failing || "none recorded"}.`;
  }
}
