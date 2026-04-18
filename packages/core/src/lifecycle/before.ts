/**
 * Before Phase
 *
 * Runs at the start of each convergence loop iteration, BEFORE the agent is launched.
 * Snapshots input files, validates dependencies, and builds context.md from upstream outputs.
 * If declared inputs are missing → returns success:false so the controller can emit a
 * blocker gap without wasting an agent timeout.
 */

import { stat, readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { glob } from "glob";
import { getTaskBeforeDir } from "../journal/structure.ts";
import { logTaskEvent } from "../journal/writer.ts";
import { loadAncestorContext } from "./context-propagation.ts";
import type { CheckDef } from "./after.ts";

const execAsync = promisify(exec);

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface InputFile {
  path: string;
  sizeBytes: number;
  mtimeMs: number;
}

export interface InputPatternResult {
  pattern: string;
  files: InputFile[];
  matchCount: number;
  satisfied: boolean;
}

export interface InputSnapshot {
  capturedAt: string;
  hash: string; // SHA-256 of { totalFiles, totalBytes, lastMtime }
  inputs: InputPatternResult[];
}

export interface DependencyCheckResult {
  allSatisfied: boolean;
  checks: Array<{
    pattern: string;
    satisfied: boolean;
    matchCount: number;
    missingReason?: string;
  }>;
}

export interface ResumeState {
  taskId: string;
  executionId: string;
  phase: "before" | "execute" | "after";
  startedAt: string;
  lastHeartbeat: string;
  inputSnapshotHash: string;
  correctionAttempt: number;
}

export interface RequiresCheckResult {
  id: string;
  description: string;
  cmd: string;
  passed: boolean;
  exitCode: number | string;
  stdout: string;
  stderr: string;
}

export interface BeforePhaseResult {
  success: boolean;
  inputSnapshot: InputSnapshot;
  contextDoc: string;
  dependencyCheck: DependencyCheckResult;
  failedDependencies: string[];
  /** Requires checks that blocked the task (non-empty = task is blocked) */
  failedRequires: RequiresCheckResult[];
  /** true if we resumed from a cached before phase (inputs unchanged) */
  resumed: boolean;
}

export interface SkillTaskInputs {
  inputs?: string[];
  outputs?: string[];
  contextDepth?: number;
  /** Pre-condition checks — run before snapshot; block task if any fail */
  requires?: CheckDef[];
}

/* ------------------------------------------------------------------ */
/*  Main entry point                                                    */
/* ------------------------------------------------------------------ */

export async function runBeforePhase(
  projectDir: string,
  epicId: string,
  taskId: string,
  taskDef: SkillTaskInputs,
  executionId: string,
): Promise<BeforePhaseResult> {
  const beforeDir = getTaskBeforeDir(projectDir, epicId, taskId);
  await mkdir(beforeDir, { recursive: true });

  await logTaskEvent(
    projectDir,
    epicId,
    taskId,
    "LIFECYCLE_BEFORE_START",
    "Before phase starting",
    { executionId },
  );

  // ── REQUIRES GATE ─────────────────────────────────────────────────
  // Run pre-condition checks before anything else. If any fail, block the task.
  const requiresDefs = taskDef.requires ?? [];
  if (requiresDefs.length > 0) {
    const requiresResults = await runRequiresChecks(requiresDefs, projectDir);
    const failing = requiresResults.filter((r) => !r.passed);
    await writeFile(
      join(beforeDir, "requires-check.json"),
      JSON.stringify(
        { ranAt: new Date().toISOString(), results: requiresResults },
        null,
        2,
      ),
    );

    if (failing.length > 0) {
      const ids = failing.map((r) => r.id).join(", ");
      await logTaskEvent(
        projectDir,
        epicId,
        taskId,
        "DEPENDENCY_MISSING",
        `Requires gate failed: ${ids}`,
        { failedRequires: failing.map((r) => r.id) },
      );
      await logTaskEvent(
        projectDir,
        epicId,
        taskId,
        "LIFECYCLE_BEFORE_FAILED",
        "Before phase blocked — requires conditions not met",
      );
      const emptySnapshot = buildSnapshot([]);
      return {
        success: false,
        inputSnapshot: emptySnapshot,
        contextDoc: "",
        dependencyCheck: { allSatisfied: false, checks: [] },
        failedDependencies: [],
        failedRequires: failing,
        resumed: false,
      };
    }

    await logTaskEvent(
      projectDir,
      epicId,
      taskId,
      "DEPENDENCY_SATISFIED",
      `Requires gate passed (${requiresResults.length} check${requiresResults.length === 1 ? "" : "s"})`,
    );
  }

  // ── RESUME CHECK ───────────────────────────────────────────────────
  // Check if we can resume (inputs unchanged from a previous execute phase)
  const resumeState = await readResumeState(beforeDir);
  if (resumeState?.phase === "execute") {
    const cachedSnapshot = await readInputSnapshot(beforeDir);
    if (
      cachedSnapshot &&
      cachedSnapshot.hash === resumeState.inputSnapshotHash
    ) {
      const contextDoc = await readContextDoc(beforeDir);
      await logTaskEvent(
        projectDir,
        epicId,
        taskId,
        "LIFECYCLE_BEFORE_COMPLETE",
        "Before phase skipped — resuming from cached state",
        { resumed: true },
      );
      return {
        success: true,
        inputSnapshot: cachedSnapshot,
        contextDoc,
        dependencyCheck: { allSatisfied: true, checks: [] },
        failedDependencies: [],
        failedRequires: [],
        resumed: true,
      };
    }
  }

  // Snapshot input files
  const patterns = taskDef.inputs ?? [];
  const inputResults: InputPatternResult[] = [];
  const failedDependencies: string[] = [];

  for (const pattern of patterns) {
    const files = await globFiles(projectDir, pattern);
    const satisfied = files.length > 0;
    if (!satisfied) failedDependencies.push(pattern);
    inputResults.push({ pattern, files, matchCount: files.length, satisfied });
  }

  const snapshot = buildSnapshot(inputResults);
  await writeFile(
    join(beforeDir, "input-snapshot.json"),
    JSON.stringify(snapshot, null, 2),
  );

  const depCheck: DependencyCheckResult = {
    allSatisfied: failedDependencies.length === 0,
    checks: inputResults.map((r) => ({
      pattern: r.pattern,
      satisfied: r.satisfied,
      matchCount: r.matchCount,
      missingReason: r.satisfied
        ? undefined
        : `No files matched pattern: ${r.pattern}`,
    })),
  };
  await writeFile(
    join(beforeDir, "dependency-check.json"),
    JSON.stringify(depCheck, null, 2),
  );

  await logTaskEvent(
    projectDir,
    epicId,
    taskId,
    "INPUT_SNAPSHOT_TAKEN",
    `Snapshotted ${snapshot.inputs.reduce((n, i) => n + i.matchCount, 0)} input files across ${patterns.length} patterns`,
  );

  if (failedDependencies.length > 0) {
    await logTaskEvent(
      projectDir,
      epicId,
      taskId,
      "DEPENDENCY_MISSING",
      `Missing inputs: ${failedDependencies.join(", ")}`,
      { failedDependencies },
    );
    await writeResumeState(beforeDir, {
      taskId,
      executionId,
      phase: "before",
      startedAt: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString(),
      inputSnapshotHash: snapshot.hash,
      correctionAttempt: 0,
    });
    await logTaskEvent(
      projectDir,
      epicId,
      taskId,
      "LIFECYCLE_BEFORE_FAILED",
      "Before phase failed — dependency validation failed",
    );
    return {
      success: false,
      inputSnapshot: snapshot,
      contextDoc: "",
      dependencyCheck: depCheck,
      failedDependencies,
      failedRequires: [],
      resumed: false,
    };
  }

  await logTaskEvent(
    projectDir,
    epicId,
    taskId,
    "DEPENDENCY_SATISFIED",
    "All input dependencies satisfied",
  );

  // Build context.md from ancestor/sibling task summaries
  const contextDoc = await buildContextDoc(
    projectDir,
    epicId,
    taskId,
    taskDef.contextDepth ?? 2,
  );
  await writeFile(join(beforeDir, "context.md"), contextDoc);
  await logTaskEvent(
    projectDir,
    epicId,
    taskId,
    "CONTEXT_DOC_BUILT",
    `Context document built (${contextDoc.length} chars)`,
  );

  // Write resume state as "before" — will be updated to "execute" just before agent launch
  await writeResumeState(beforeDir, {
    taskId,
    executionId,
    phase: "before",
    startedAt: new Date().toISOString(),
    lastHeartbeat: new Date().toISOString(),
    inputSnapshotHash: snapshot.hash,
    correctionAttempt: 0,
  });

  await logTaskEvent(
    projectDir,
    epicId,
    taskId,
    "LIFECYCLE_BEFORE_COMPLETE",
    "Before phase complete",
  );

  return {
    success: true,
    inputSnapshot: snapshot,
    contextDoc,
    dependencyCheck: depCheck,
    failedDependencies: [],
    failedRequires: [],
    resumed: false,
  };
}

/**
 * Update resume-state.json to reflect a phase transition.
 */
export async function updateResumePhase(
  projectDir: string,
  epicId: string,
  taskId: string,
  phase: ResumeState["phase"],
  correctionAttempt?: number,
): Promise<void> {
  const beforeDir = getTaskBeforeDir(projectDir, epicId, taskId);
  const current = await readResumeState(beforeDir);
  if (!current) return;
  await writeResumeState(beforeDir, {
    ...current,
    phase,
    lastHeartbeat: new Date().toISOString(),
    ...(correctionAttempt !== undefined ? { correctionAttempt } : {}),
  });
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

async function globFiles(
  projectDir: string,
  pattern: string,
): Promise<InputFile[]> {
  try {
    const matches = await glob(pattern, { cwd: projectDir, absolute: false });
    const files: InputFile[] = [];
    for (const rel of matches) {
      try {
        const s = await stat(join(projectDir, rel));
        if (s.isFile()) {
          files.push({ path: rel, sizeBytes: s.size, mtimeMs: s.mtimeMs });
        }
      } catch {
        /* skip inaccessible */
      }
    }
    return files;
  } catch {
    return [];
  }
}

function buildSnapshot(inputs: InputPatternResult[]): InputSnapshot {
  const allFiles = inputs.flatMap((i) => i.files);
  const totalFiles = allFiles.length;
  const totalBytes = allFiles.reduce((n, f) => n + f.sizeBytes, 0);
  const lastMtime = allFiles.reduce((m, f) => Math.max(m, f.mtimeMs), 0);
  const hash = createHash("sha256")
    .update(JSON.stringify({ totalFiles, totalBytes, lastMtime }))
    .digest("hex");
  return { capturedAt: new Date().toISOString(), hash, inputs };
}

async function buildContextDoc(
  projectDir: string,
  epicId: string,
  taskId: string,
  depth: number,
): Promise<string> {
  try {
    const ctx = await loadAncestorContext(projectDir, epicId, taskId, depth);
    const lines: string[] = ["# Context for this task\n"];

    if (
      ctx.ancestorSummaries.length === 0 &&
      ctx.siblingOutcomes.length === 0 &&
      !ctx.correctionHistory
    ) {
      return "# Context\n\n_(No prior task context available)_\n";
    }

    for (const anc of ctx.ancestorSummaries) {
      lines.push(`## Parent Task: ${anc.taskId} (${anc.status})\n`);
      lines.push(anc.summaryExcerpt);
      if (anc.keyOutputs.length > 0) {
        lines.push(`\n**Key outputs**: ${anc.keyOutputs.join(", ")}\n`);
      }
      lines.push("");
    }

    if (ctx.siblingOutcomes.length > 0) {
      lines.push("## Completed Sibling Tasks\n");
      for (const sib of ctx.siblingOutcomes) {
        const status =
          sib.status === "complete" ? "✓" : sib.status === "failed" ? "✗" : "—";
        lines.push(`- **${status} ${sib.taskId}**: ${sib.summarySnippet}`);
      }
      lines.push("");
    }

    if (ctx.correctionHistory) {
      lines.push("## Previous Correction Attempts (compressed)\n");
      lines.push(ctx.correctionHistory);
      lines.push("");
    }

    return lines.join("\n");
  } catch {
    return "# Context\n\n_(Error loading prior task context)_\n";
  }
}

async function readInputSnapshot(
  beforeDir: string,
): Promise<InputSnapshot | null> {
  const path = join(beforeDir, "input-snapshot.json");
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(await readFile(path, "utf8")) as InputSnapshot;
  } catch {
    return null;
  }
}

async function readContextDoc(beforeDir: string): Promise<string> {
  const path = join(beforeDir, "context.md");
  if (!existsSync(path)) return "";
  try {
    return await readFile(path, "utf8");
  } catch {
    return "";
  }
}

async function readResumeState(beforeDir: string): Promise<ResumeState | null> {
  const path = join(beforeDir, "resume-state.json");
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(await readFile(path, "utf8")) as ResumeState;
  } catch {
    return null;
  }
}

async function writeResumeState(
  beforeDir: string,
  state: ResumeState,
): Promise<void> {
  await writeFile(
    join(beforeDir, "resume-state.json"),
    JSON.stringify(state, null, 2),
  );
}

/**
 * Run `requires` pre-condition checks. Each check is a shell command;
 * exit code 0 = passed, non-zero = failed.
 */
async function runRequiresChecks(
  checks: CheckDef[],
  projectDir: string,
): Promise<RequiresCheckResult[]> {
  const results: RequiresCheckResult[] = [];
  for (const check of checks) {
    const start = Date.now();
    try {
      const { stdout, stderr } = await execAsync(check.cmd, {
        cwd: projectDir,
        timeout: 30_000,
        shell: process.platform === "win32" ? "bash" : "/bin/sh",
      });
      results.push({
        id: check.id,
        description: check.description,
        cmd: check.cmd,
        passed: true,
        exitCode: 0,
        stdout: stdout.slice(0, 500),
        stderr: stderr.slice(0, 500),
      });
    } catch (err: any) {
      const exitCode = err.code ?? 1;
      results.push({
        id: check.id,
        description: check.description,
        cmd: check.cmd,
        passed: false,
        exitCode,
        stdout: (err.stdout ?? "").slice(0, 500),
        stderr: (err.stderr ?? "").slice(0, 500),
      });
    }
    void start; // timing not needed here — requires checks are synchronous gates
  }
  return results;
}
