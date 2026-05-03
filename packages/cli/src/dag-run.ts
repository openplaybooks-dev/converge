/**
 * DAG-based Autonomous Run — the ONLY execution mode.
 *
 * No TaskTree. No TreeNode. No findNextTask. No state machine.
 * No per-iteration filesystem reload. No container parent logic.
 *
 * Architecture:
 *   1. Build DAG ONCE from playbook.yml declarations
 *   2. Persist manifest.json in execution dir (self-contained state)
 *   3. RunStateManager owns all node state via runstate.json
 *   4. Execute sequentially, one task at a time
 *   5. Each task runs via the existing executeTask pipeline
 *
 * Resume: runstate.json already exists → completed nodes skip.
 * New nodes (added to manifest since last run) start as "pending".
 */

import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { buildDagFromPlaybook } from "@converge/core/config/declarative-loader.js";
import { runDag } from "@converge/core/dag/dag-runner.js";
import type { DagNode } from "@converge/core/dag/dag-node.js";
import { executeTask } from "@converge/core/task/lifecycle/task-runner.js";
import { Unit } from "@converge/core/task/unit/unit.js";
import { RunStateManager, writeJournalManifest } from "@converge/core/manifest/index.js";
import { ExecutionLogger, generateExecutionId } from "@converge/core/journal/execution-logger.js";
import { setExecutionScope, clearExecutionScope, getExecutionDir, getExecutionsDir } from "@converge/core/journal/structure.js";
import { TaskStateManager } from "@converge/core/checkpoint/state.js";
import type { Manifest } from "@converge/core/manifest/types.js";

export interface DagRunConfig {
  projectDir: string;
  playbookDir: string;
  playbookName: string;
  maxTaskAttempts: number;
}

export async function dagAutonomousRun(config: DagRunConfig): Promise<void> {
  const { projectDir, playbookDir, playbookName } = config;

  // ── 1. Build DAG ───────────────────────────────────────────────
  const { dag, errors } = buildDagFromPlaybook(playbookDir);
  if (errors.length > 0) {
    for (const e of errors) console.error(`  [${e.type}] ${e.message}`);
    if (errors.some((e) => e.type === "cycle")) {
      console.error("DAG has dependency cycles — cannot execute.");
      process.exit(1);
    }
  }

  // ── 2. Execution setup — find or create execution ───────────────
  const manifest: Manifest = dag.toManifest();
  manifest.metadata.playbook = playbookName;

  // Try to resume the latest execution. If its manifest matches ours,
  // continue from it. Otherwise create a fresh execution.
  let executionId: string;
  let executionDir: string;
  const execsDir = getExecutionsDir(projectDir);
  mkdirSync(execsDir, { recursive: true });
  const existing = readdirSync(execsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort() // ISO timestamps sort chronologically
    .reverse(); // newest first

  if (existing.length > 0) {
    // Check if the latest execution's manifest matches ours.
    const latestDir = join(execsDir, existing[0]);
    const latestManifestPath = join(latestDir, "manifest.json");
    if (existsSync(latestManifestPath)) {
      executionId = existing[0];
      executionDir = latestDir;
    } else {
      executionId = generateExecutionId();
      executionDir = getExecutionDir(projectDir, executionId);
    }
  } else {
    executionId = generateExecutionId();
    executionDir = getExecutionDir(projectDir, executionId);
  }

  setExecutionScope(executionId);
  mkdirSync(executionDir, { recursive: true });

  // Persist manifest.json — the DAG snapshot for this execution.
  // Idempotent: no-op if manifest hasn't changed.
  await writeJournalManifest(executionDir, manifest);

  // RunStateManager owns execution-scoped node state via runstate.json.
  // On resume, it merges existing state — completed nodes stay complete.
  const resultsMgr = new RunStateManager(executionDir, manifest);
  const completedBefore = resultsMgr.getCompletedCount();

  // TaskStateManager handles attempt counting (used internally by executeTask).
  const checkpointMgr = new TaskStateManager(projectDir);

  const executionLogger = new ExecutionLogger(
    projectDir,
    executionId,
    playbookName,
    { maxIterations: 0, maxTaskAttempts: config.maxTaskAttempts, mode: "oneoff" },
  );

  console.error(`DAG: ${dag.nodes.size} nodes` +
    (completedBefore > 0 ? ` (${completedBefore} cached)` : ""));

  // ── 3. Execute layer by layer ──────────────────────────────────
  await executionLogger.writeExecutionStart();
  const runStart = Date.now();

  const { completed, failed } = await runDag(dag, async (node) => {
    return runTask(node, config, resultsMgr, checkpointMgr, executionLogger);
  }, { concurrency: 1 });

  // ── 4. Report ──────────────────────────────────────────────────
  const elapsed = Date.now() - runStart;
  console.error(`\nDone: ${completed} ok, ${failed} failed (${(elapsed / 1000).toFixed(1)}s)`);
  await executionLogger.writeExecutionEnd(
    { totalIterations: 0, tasksCompleted: completed, tasksFailed: failed, gapsResolved: 0, convergenceAchieved: failed === 0 },
    failed > 0 ? "error" : "completed",
  );

  clearExecutionScope();
}

/* ── Per-task execution ─────────────────────────────────────────── */

async function runTask(
  node: DagNode,
  config: DagRunConfig,
  resultsMgr: RunStateManager,
  checkpointMgr: TaskStateManager,
  executionLogger: ExecutionLogger,
): Promise<{ success: boolean }> {
  const { projectDir, playbookDir } = config;
  const taskId = node.id;

  // Resume support: skip nodes already marked complete in runstate.json.
  if (await resultsMgr.isComplete(taskId)) {
    console.error(`  ✓ ${taskId} (cached)`);
    return { success: true };
  }

  console.error(`  ▶ ${taskId}`);
  await resultsMgr.markRunning(taskId);

  // Resolve the TASK.md path
  const absPath = node.path && existsSync(node.path)
    ? node.path
    : join(playbookDir, "tasks", taskId, "TASK.md");

  // Load Unit (from file or from inline taskDef)
  let unit: Unit;
  if (existsSync(absPath)) {
    unit = await Unit.fromPath(absPath);
  } else if (node.taskDef.prompt) {
    unit = Unit.fromDefinition(node.taskDef as any, null as any, absPath);
  } else {
    console.error(`  ⚠ ${taskId}: no TASK.md and no inline prompt — skipping`);
    await resultsMgr.markSkipped(taskId);
    return { success: true };
  }

  // Build execution context and run
  const taskStart = Date.now();
  try {
    const result = await executeTask(unit, checkpointMgr, executionLogger);
    if (result.success) {
      await resultsMgr.markComplete(taskId, Date.now() - taskStart);
    } else {
      await resultsMgr.markFailed(taskId, result.error ?? "Task failed", Date.now() - taskStart);
    }
    return { success: result.success };
  } catch (err: any) {
    await resultsMgr.markFailed(taskId, err.message, Date.now() - taskStart);
    console.error(`  ✗ ${taskId}: ${err.message}`);
    return { success: false };
  }
}
