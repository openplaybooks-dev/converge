/**
 * DAG-based Autonomous Run — the ONLY execution mode.
 *
 * No TaskTree. No TreeNode. No findNextTask. No state machine.
 * No per-iteration filesystem reload. No container parent logic.
 *
 * Architecture:
 *   1. Build DAG ONCE from playbook.yml declarations
 *   2. RunStateManager owns all node state via runstate.json (single source of truth)
 *   3. Execute sequentially, one task at a time
 *   4. Each task runs via the existing executeTask pipeline
 *
 * Resume: runstate.json already exists → completed nodes skip.
 * New nodes (added to playbook since last run) start as "pending".
 */

import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { buildDagFromPlaybook } from "@converge/core/config/declarative-loader.js";
import { runDag } from "@converge/core/dag/dag-runner.js";
import type { DagNode } from "@converge/core/dag/dag-node.js";
import type { NodeResult } from "@converge/core/dag/dag-runner.js";
import { TaskDag } from "@converge/core/dag/task-dag.js";
import { executeTask } from "@converge/core/task/lifecycle/task-runner.js";
import { Unit } from "@converge/core/task/unit/unit.js";
import { RunStateManager, writeJournalManifest } from "@converge/core/manifest/index.js";
import { ExecutionLogger, generateExecutionId } from "@converge/core/journal/execution-logger.js";
import { setExecutionScope, clearExecutionScope, getExecutionDir, getExecutionsDir } from "@converge/core/journal/structure.js";
import { TaskStateManager } from "@converge/core/checkpoint/state.js";
import type { CompletionData, CheckResultItem } from "@converge/core/manifest/types.js";

export interface DagRunConfig {
  projectDir: string;
  playbookDir: string;
  playbookName: string;
  maxTaskAttempts: number;
}

/* ── Helpers ────────────────────────────────────────────────────────── */

function hashPlaybook(playbookDir: string): string {
  const hash = createHash("sha256");
  const ymlPath = join(playbookDir, "playbook.yml");
  if (existsSync(ymlPath)) {
    hash.update(readFileSync(ymlPath, "utf-8"));
  }
  // Also hash TASK.md files for completeness
  const tasksDir = join(playbookDir, "tasks");
  if (existsSync(tasksDir)) {
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name === "TASK.md") hash.update(readFileSync(full, "utf-8"));
      }
    };
    walk(tasksDir);
  }
  return `sha256:${hash.digest("hex")}`;
}

async function computeOutputHashes(
  projectDir: string,
  outputs: string[],
): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {};
  for (const outputPath of outputs) {
    const absPath = join(projectDir, outputPath);
    if (!existsSync(absPath)) continue;
    try {
      const content = await readFile(absPath);
      hashes[outputPath] = `sha256:${createHash("sha256").update(content).digest("hex")}`;
    } catch {
      // skip unreadable files
    }
  }
  return hashes;
}

function readCheckResults(wipDir: string): CheckResultItem[] | undefined {
  const checkResultsPath = join(wipDir, "data", "check-results.json");
  if (!existsSync(checkResultsPath)) return undefined;
  try {
    return JSON.parse(readFileSync(checkResultsPath, "utf-8"));
  } catch {
    return undefined;
  }
}

async function gatherAttemptData(
  unit: Unit,
  projectDir: string,
  attemptNumber: number,
  outputs?: string[],
): Promise<{ check_results?: CheckResultItem[]; output_hashes?: Record<string, string> }> {
  const data: { check_results?: CheckResultItem[]; output_hashes?: Record<string, string> } = {};

  if (unit.context?.journalPath) {
    // Read from the numbered attempt dir (wip symlink is cleaned up by now)
    const attemptDirName = String(attemptNumber).padStart(2, "0");
    const attemptDir = join(unit.context.journalPath, "attempts", attemptDirName);
    data.check_results = readCheckResults(attemptDir);
  }

  if (outputs && outputs.length > 0) {
    data.output_hashes = await computeOutputHashes(projectDir, outputs);
  }

  return data;
}

/* ── Main entry point ────────────────────────────────────────────────── */

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
  dag.playbookName = playbookName;

  const playbookHash = hashPlaybook(playbookDir);

  // ── 2. Execution setup — find or create execution ───────────────
  // Try to resume the latest execution. If its playbook hash matches,
  // continue from it. Otherwise create a fresh execution.
  let executionId: string;
  let executionDir: string;
  const execsDir = getExecutionsDir(projectDir);
  mkdirSync(execsDir, { recursive: true });
  const existing = readdirSync(execsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
    .reverse();

  if (existing.length > 0) {
    const latestDir = join(execsDir, existing[0]);
    const runstatePath = join(latestDir, "runstate.json");
    if (existsSync(runstatePath)) {
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

  // RunStateManager is the single source of truth for DAG + execution state.
  // Built directly from TaskDag so every node carries full task context.
  const resultsMgr = new RunStateManager(executionDir, dag, playbookHash, projectDir);

  // Persist manifest.json for backward compat (still used by some tooling).
  await writeJournalManifest(executionDir, resultsMgr.toManifest());

  const checkpointMgr = new TaskStateManager(projectDir);

  const executionLogger = new ExecutionLogger(
    projectDir,
    executionId,
    playbookName,
    { maxIterations: 0, maxTaskAttempts: config.maxTaskAttempts, mode: "oneoff" },
  );

  const cachedCount = await resultsMgr.getCompletedCount();
  console.error(`DAG: ${dag.nodes.size} nodes` +
    (cachedCount > 0 ? ` (${cachedCount} cached)` : ""));

  // ── 3. Execute — loop until no pending nodes (handles spawned children) ──
  await executionLogger.writeExecutionStart();
  const runStart = Date.now();
  let totalCompleted = 0;
  let totalFailed = 0;

  while (true) {
    const pending = [...dag.nodes.values()].filter(
      (n) => n.status === "pending",
    );
    if (pending.length === 0) break;

    const { completed, failed } = await runDag(dag, async (node) => {
      return runTask(node, config, resultsMgr, checkpointMgr, executionLogger, dag);
    }, { concurrency: 1, runResults: resultsMgr });

    totalCompleted += completed;
    totalFailed += failed;
  }

  // ── 4. Report ──────────────────────────────────────────────────
  const elapsed = Date.now() - runStart;
  console.error(`\nDone: ${totalCompleted} ok, ${totalFailed} failed (${(elapsed / 1000).toFixed(1)}s)`);

  // Mark run complete in the persisted runstate
  await resultsMgr.setRunStatus(totalFailed > 0 ? "error" : "complete");

  await executionLogger.writeExecutionEnd(
    { totalIterations: 0, tasksCompleted: totalCompleted, tasksFailed: totalFailed, gapsResolved: 0, convergenceAchieved: totalFailed === 0 },
    totalFailed > 0 ? "error" : "completed",
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
  dag: TaskDag,
): Promise<NodeResult> {
  const { projectDir, playbookDir } = config;
  const taskId = node.id;

  // Resume support: skip nodes already marked complete in runstate.json.
  if (await resultsMgr.isComplete(taskId)) {
    console.error(`  ✓ ${taskId} (cached)`);
    return { success: true };
  }

  console.error(`  ▶ ${taskId}`);

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

  const taskDef = node.taskDef;
  const taskStart = Date.now();
  try {
    const result = await executeTask(unit, checkpointMgr, executionLogger);

    // ── Gather completion data ──────────────────────────────────
    const attemptData = await gatherAttemptData(
      unit,
      projectDir,
      result.attemptNumber,
      taskDef.outputs,
    );

    const completionData: CompletionData = {
      title: taskDef.title,
      description: taskDef.description,
      agent: taskDef.agent,
      skill: taskDef.skill,
      from_seed: taskDef.from_seed,
      check_results: attemptData.check_results,
      output_hashes: attemptData.output_hashes,
    };

    // ── Handle Seed seeding — discover spawned children ─────────
    if (result.isWbsTask) {
      // seed.json lives in the execution-scoped journal task dir, not the playbook
      const journalTaskDir = join(
        resultsMgr.executionDir,
        "tasks",
        taskId,
      );
      const seedJsonPath = join(journalTaskDir, "seed.json");
      if (existsSync(seedJsonPath)) {
        try {
          const seedData = JSON.parse(readFileSync(seedJsonPath, "utf-8"));
          for (const subtask of seedData.subtasks ?? []) {
            const childId: string = subtask.id;
            const childPath: string = subtask.writeToPath;
            const absChildPath = join(projectDir, childPath);
            if (existsSync(absChildPath)) {
              try {
                // Seed children live in the journal tree which doesn't have
                // the "epics/" directory structure that fromPath expects.
                // Parse TASK.md inline and create Unit via fromDefinition.
                const childRaw = readFileSync(absChildPath, "utf-8");
                const { parseTaskMdString } = await import(
                  "@converge/core/config/task-md-definition.js"
                );
                const childParsed = parseTaskMdString(childRaw);
                const childDef = {
                  id: childId,
                  title: childParsed.title ?? childId,
                  description: childParsed.description,
                  prompt: childParsed.body ?? childParsed.prompt,
                  inputs: childParsed.inputs,
                  outputs: childParsed.outputs,
                  checks: childParsed.checks as any,
                  skill: childParsed.skills,
                  tags: childParsed.tags,
                  vars: childParsed.vars,
                  dependencies: childParsed.dependencies,
                  from_seed: taskId,
                };
                const childUnit = Unit.fromDefinition(
                  childDef as any,
                  null as any,
                  absChildPath,
                );
                const childNode: DagNode = {
                  id: childId,
                  parents: [taskId],
                  children: [],
                  depends_on: [taskId],
                  depended_on_by: [],
                  taskDef: childUnit as any,
                  path: absChildPath,
                  status: "pending",
                  virtual: false,
                };
                dag.addNode(childNode);

                await resultsMgr.addSpawnedChildNode(
                  childId,
                  taskId,
                  [taskId],
                  {
                    title: childUnit.title,
                    description: childUnit.description,
                    agent: childUnit.agent,
                    skill: childUnit.skill,
                    inputs: childUnit.inputs,
                    outputs: childUnit.outputs,
                    checks: (childUnit.checks ?? []).map((c: any) => ({
                      id: c.id ?? "",
                      description: c.description,
                      cmd: c.cmd,
                      type: c.type,
                    })),
                    tags: childUnit.tags,
                    vars: childUnit.vars,
                  },
                );
              } catch (err: any) {
                console.error(`   [seed] failed to load child ${childId}: ${err.message}`);
              }
            }
          }
          if (seedData.subtasks?.length > 0) {
            await resultsMgr.addSpawnedChildren(
              taskId,
              seedData.subtasks.map((s: any) => s.id),
            );
            console.error(
              `   [seed] spawned ${seedData.subtasks.length} children: ${seedData.subtasks.map((s: any) => s.id).join(", ")}`,
            );
          }
        } catch {
          // seed.json parse failed — skip child discovery
        }
      }
    }

    if (result.success) {
      await resultsMgr.markComplete(taskId, Date.now() - taskStart, completionData);
    } else {
      await resultsMgr.markFailed(
        taskId,
        result.errorKind === "structural"
          ? `[structural] ${taskDef.title ?? taskId} failed`
          : (result.errorReason ?? "Task failed"),
        Date.now() - taskStart,
        completionData,
      );
    }
    return { success: result.success, completionData };
  } catch (err: any) {
    await resultsMgr.markFailed(taskId, err.message, Date.now() - taskStart);
    console.error(`  ✗ ${taskId}: ${err.message}`);
    return { success: false };
  }
}
