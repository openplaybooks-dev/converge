/**
 * Autonomous Run — Snap → Execute → Snap
 *
 * Architecture (stateless, resumable):
 *
 *   loop {
 *     1. SNAP    — re-scan filesystem for all epics/tasks
 *     2. FIND    — pick first incomplete task (checkpoint + journal status.json)
 *     3. EXECUTE — run the task (AI may create new files/epics during this step)
 *     4. COMMIT  — mark task complete in checkpoint
 *     → back to 1 (picks up any AI-created tasks naturally)
 *   }
 *
 * Why re-scan every iteration:
 *   The AI can write new SKILL.md / task.ts files during execution (yields, sub-planning).
 *   Re-scanning ensures those files are discovered before we decide what to run next.
 *   No in-memory tree pointers → no staleness.
 */

import { createDiscoveryScanner } from "@converge/core/task/discovery/scanner.ts";
import { CheckpointManager } from "@converge/core/checkpoint/manager.ts";
import { findNextTask } from "./next-task.ts";
import type { ConvergeConfig } from "@converge/core/config/types.ts";
import type { HookRegistry } from "@converge/core/hooks/registry.ts";
import { executeTask } from "@converge/core/task/lifecycle/task-runner.ts";
import { SessionLogger, generateSessionId } from "@converge/core/journal/session-logger.ts";
import type {
  ProgressSnapshot,
  GapInfo,
  SessionMetadata,
  SessionStatus,
} from "@converge/core/journal/session-types.ts";
import { Unit } from "@converge/core/task/unit/unit.ts";
import { TaskTree } from "@converge/core/task/tree/index.ts";
import { UnitCheckpointManager } from "@converge/core/checkpoint/unit-checkpoint.ts";
import { findGaps } from "@converge/core/task/unit/find-gaps.ts";
import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { generateInterruptedMd } from "@converge/core/task/lifecycle/learn.ts";
import { getEpicsDir, getSessionsDir } from "@converge/core/journal/structure.ts";

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */

export interface AutonomousRunConfig {
  /** Absolute project directory */
  projectDir: string;

  /** Loaded PROJECT.md config (provides discovery patterns) */
  convergeConfig: ConvergeConfig;

  /** Pre-built hook registry */
  hookRegistry?: HookRegistry;

  /** Maximum task executions before stopping (default: 100) */
  maxIterations?: number;

  /** Max attempts per individual task before permanently skipping it (default: 2) */
  maxTaskAttempts?: number;

  /** Global wall-clock timeout for the entire run in ms (default: 72 hours) */
  maxRunDurationMs?: number;

  /** Verbose logging */
  verbose?: boolean;

  /** Filter to a specific epic or task (e.g. "99-test" or "99-test/skill-invoke-test") */
  filter?: string;

  /** Force-run the filtered task even if blocked, completed, or failed */
  force?: boolean;

  /** Resume: recover interrupted/running tasks from a previous session */
  resume?: boolean;

  /** Restart: reset all tasks to pending and start fresh */
  restart?: boolean;

  /** Extra vars to pass to WBS contexts (e.g. epoch number from evolve runner) */
  epochVars?: Record<string, string>;
}

/* ------------------------------------------------------------------ */
/*  Result                                                             */
/* ------------------------------------------------------------------ */

export interface AutonomousRunResult {
  completed: boolean;
  tasksCompleted: number;
  tasksFailed: number;
  iterations: number;
  stoppedReason?: "timeout" | "max-iterations" | "consecutive-failures";
}

/* ------------------------------------------------------------------ */
/*  Snap result                                                        */
/* ------------------------------------------------------------------ */

interface TreeSnap {
  epics: Array<{ filePath: string; type: string }>;
  tasks: Array<{ filePath: string; type: string }>;
  totalDiscovered: number;
}

/* ------------------------------------------------------------------ */
/*  Tree snap — re-read filesystem                                     */
/* ------------------------------------------------------------------ */

async function snapTree(config: AutonomousRunConfig): Promise<TreeSnap> {
  const scanner = createDiscoveryScanner(
    config.convergeConfig.discovery || { epics: [], tasks: [] },
    config.projectDir,
    config.hookRegistry,
  );

  const discovery = await scanner.scan();

  const epics = discovery.files.filter((f) => f.type === "epic");
  const epicPaths = new Set(epics.map((e) => e.filePath));
  const tasks = discovery.files.filter(
    (f) => f.type === "task" && !epicPaths.has(f.filePath),
  );

  return { epics, tasks, totalDiscovered: discovery.files.length };
}

/* ------------------------------------------------------------------ */
/*  Stuck Task Detection & Recovery                                    */
/* ------------------------------------------------------------------ */

export interface StuckTask {
  taskId: string;
  epicId: string;
  status: string;
  checkpointPath: string;
  /** Last activity timestamp from checkpoint (lastUpdated or latest attempt start) */
  lastActivity?: string;
}

/**
 * Detect tasks stuck in 'interrupted' or 'running' state from a previous session.
 * Returns a list without modifying anything.
 */
export async function detectStuckTasks(
  projectDir: string,
  tree: TaskTree,
): Promise<StuckTask[]> {
  const journalEpicsDir = getEpicsDir(projectDir);
  if (!existsSync(journalEpicsDir)) return [];

  const stuck: StuckTask[] = [];

  const epicEntries = await readdir(journalEpicsDir, { withFileTypes: true });
  for (const epicEntry of epicEntries) {
    if (!epicEntry.isDirectory()) continue;
    const epicId = epicEntry.name;
    const epicDir = path.join(journalEpicsDir, epicId);

    const checkpointPaths = await collectCheckpointsRecursive(epicDir);

    for (const ckptPath of checkpointPaths) {
      try {
        const raw = JSON.parse(await readFile(ckptPath, "utf-8"));
        if (raw.status !== "interrupted" && raw.status !== "running") continue;

        const taskDir = path.dirname(ckptPath);
        const rel = path.relative(epicDir, taskDir).replace(/\\/g, "/");
        const taskId =
          !rel || rel === "." ? epicId : rel.replace(/(^|\/)tasks\//g, "$1");

        // Extract last activity timestamp for diagnostics
        let lastActivity: string | undefined = raw.lastUpdated;
        if (raw.attempts?.length) {
          const latest = raw.attempts[raw.attempts.length - 1];
          const ts = latest.completedAt || latest.startedAt;
          if (ts && (!lastActivity || ts > lastActivity)) lastActivity = ts;
        }

        stuck.push({
          taskId,
          epicId,
          status: raw.status,
          checkpointPath: ckptPath,
          lastActivity,
        });
      } catch {
        // Ignore corrupt checkpoint files
      }
    }
  }

  return stuck;
}

/**
 * Recover stuck tasks (interrupted or running from a previous session).
 *
 * Strategy:
 * - Load the Unit and run findGaps() as a pre-flight check
 * - If no output/check gaps → mark the task complete (it finished before signal)
 * - If output gaps remain → reset to pending (will be re-run from scratch)
 */
export async function recoverStuckTasks(
  projectDir: string,
  tree: TaskTree,
  stuckTasks: StuckTask[],
): Promise<void> {
  let recovered = 0;
  let reset = 0;

  for (const stuck of stuckTasks) {
    try {
      console.log(
        `\n⚡ Recovering ${stuck.status} task: ${stuck.epicId}/${stuck.taskId}`,
      );

      const node =
        tree.getNode(stuck.taskId) ??
        tree.getNode(`${stuck.epicId}/${stuck.taskId}`);

      if (!node) {
        // Write INTERRUPTED.md so task runner continues in-place
        const taskJournalDir = path.dirname(stuck.checkpointPath);
        const wipDir = path.join(taskJournalDir, "attempts", "wip");
        if (existsSync(wipDir)) {
          const unitCkptForAttempt = new UnitCheckpointManager(
            projectDir,
            "task",
            stuck.epicId,
            stuck.taskId,
          );
          const ckpt = await unitCkptForAttempt.load();
          await generateInterruptedMd(
            wipDir,
            projectDir,
            ckpt?.currentAttempt ?? 1,
            [],
            [],
          );
        }

        const unitCkpt = new UnitCheckpointManager(
          projectDir,
          "task",
          stuck.epicId,
          stuck.taskId,
        );
        const checkpoint = await unitCkpt.load();
        if (checkpoint) {
          checkpoint.status = "pending";
          await unitCkpt.save(checkpoint);
        }
        console.log(`   → Reset to pending (unit not found in tree)`);
        reset++;
        continue;
      }

      const unit = node.unit;
      if (!unit) {
        console.log(`   → Skipped (no unit on tree node)`);
        continue;
      }

      const unitCkpt = new UnitCheckpointManager(
        projectDir,
        "task",
        stuck.epicId,
        stuck.taskId,
      );

      if ((unit.outputs?.length ?? 0) > 0) {
        const gaps = await findGaps(unit);
        const actionableGaps = gaps.filter(
          (g) =>
            g.metadata?.gapKind === "output" ||
            g.metadata?.gapKind === "corrupted" ||
            g.metadata?.gapKind === "check",
        );

        if (actionableGaps.length === 0) {
          await unitCkpt.markComplete();
          console.log(`   → Marked complete (all outputs present)`);
          recovered++;
        } else {
          // Write INTERRUPTED.md into wip/ so the task runner continues in-place
          const taskJournalDir = path.dirname(stuck.checkpointPath);
          const wipDir = path.join(taskJournalDir, "attempts", "wip");
          if (existsSync(wipDir)) {
            const allOutputs = unit.outputs ?? [];
            const missingOutputPaths = actionableGaps
              .filter((g) => g.metadata?.gapKind === "output")
              .map((g) => g.description);
            const existingOutputs = allOutputs.filter(
              (o) => !missingOutputPaths.includes(o),
            );
            const checkpoint = await unitCkpt.load();
            await generateInterruptedMd(
              wipDir,
              projectDir,
              checkpoint?.currentAttempt ?? 1,
              existingOutputs,
              missingOutputPaths,
            );
          }

          const checkpoint = await unitCkpt.load();
          if (checkpoint) {
            checkpoint.status = "pending";
            await unitCkpt.save(checkpoint);
          }
          console.log(
            `   → Reset to pending (${actionableGaps.length} output gap(s) remain)`,
          );
          reset++;
        }
      } else {
        // Write INTERRUPTED.md into wip/ so the task runner continues in-place
        const taskJournalDir = path.dirname(stuck.checkpointPath);
        const wipDir = path.join(taskJournalDir, "attempts", "wip");
        if (existsSync(wipDir)) {
          const checkpoint = await unitCkpt.load();
          await generateInterruptedMd(
            wipDir,
            projectDir,
            checkpoint?.currentAttempt ?? 1,
            [],
            [],
          );
        }

        const checkpoint = await unitCkpt.load();
        if (checkpoint) {
          checkpoint.status = "pending";
          await unitCkpt.save(checkpoint);
        }
        console.log(`   → Reset to pending (no outputs declared)`);
        reset++;
      }
    } catch {
      // Ignore corrupt checkpoint files
    }
  }

  if (recovered > 0 || reset > 0) {
    console.log(
      `\n⚡ Recovery: ${recovered} completed, ${reset} reset to pending\n`,
    );
  }
}

/**
 * Reset ALL non-complete tasks to pending (--restart mode).
 * Scans all checkpoints recursively and resets status + attempt records for stuck tasks.
 */
export async function resetAllTasks(
  projectDir: string,
  tree: TaskTree,
): Promise<void> {
  const journalEpicsDir = getEpicsDir(projectDir);
  if (!existsSync(journalEpicsDir)) return;

  let resetCount = 0;

  const epicEntries = await readdir(journalEpicsDir, { withFileTypes: true });
  for (const epicEntry of epicEntries) {
    if (!epicEntry.isDirectory()) continue;
    const epicId = epicEntry.name;
    const epicDir = path.join(journalEpicsDir, epicId);

    const checkpointPaths = await collectCheckpointsRecursive(epicDir);

    for (const ckptPath of checkpointPaths) {
      try {
        const raw = JSON.parse(await readFile(ckptPath, "utf-8"));
        if (raw.status === "complete") continue;

        const taskDir = path.dirname(ckptPath);
        const rel = path.relative(epicDir, taskDir).replace(/\\/g, "/");
        const taskId =
          !rel || rel === "." ? epicId : rel.replace(/(^|\/)tasks\//g, "$1");

        const unitCkpt = new UnitCheckpointManager(
          projectDir,
          "task",
          epicId,
          taskId,
        );
        const checkpoint = await unitCkpt.load();
        if (checkpoint) {
          checkpoint.status = "pending";
          // Reset attempt records for stuck tasks so they get fresh retries
          if (checkpoint.attempts) {
            checkpoint.attempts = [];
            checkpoint.currentAttempt = 0;
          }
          await unitCkpt.save(checkpoint);
          resetCount++;
        }
      } catch {
        // Ignore corrupt checkpoint files
      }
    }
  }

  console.log(`\n🔄 Restart: ${resetCount} task(s) reset to pending\n`);
}

async function collectCheckpointsRecursive(dir: string): Promise<string[]> {
  const results: string[] = [];
  if (!existsSync(dir)) return results;

  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await collectCheckpointsRecursive(fullPath)));
    } else if (entry.name === "checkpoint.json") {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Recover failed tasks for retry.
 * 
 * Scans all failed tasks and resets them to pending if they haven't exceeded max attempts.
 * This ensures failed tasks are retried on subsequent runs instead of being skipped forever.
 * 
 * Returns a map of taskId → attempt count for all failed tasks that were reset.
 */
export async function recoverFailedTasks(
  projectDir: string,
  tree: TaskTree,
  maxTaskAttempts: number,
): Promise<Map<string, number>> {
  const taskAttempts = new Map<string, number>();
  const journalEpicsDir = getEpicsDir(projectDir);
  if (!existsSync(journalEpicsDir)) return taskAttempts;

  let resetCount = 0;
  const allNodes = tree.getAllNodes();

  for (const node of allNodes) {
    // Only consider leaf tasks (not parents with children)
    if (node.children.length > 0) continue;

    const epicId = node.epicId || "unknown";
    const taskId = node.id;

    const unitCkpt = new UnitCheckpointManager(
      projectDir,
      "task",
      epicId,
      taskId,
    );

    const checkpoint = await unitCkpt.load();
    if (!checkpoint) continue;

    // Only process failed or interrupted tasks
    if (checkpoint.status !== "failed" && checkpoint.status !== "interrupted") {
      continue;
    }

    // Get the number of completed attempts from history
    const attemptCount = checkpoint.attempts
      ? checkpoint.attempts.filter(
          (a) => a.outcome === "success" || a.outcome === "failed" || a.outcome === "interrupted"
        ).length
      : 0;

    // If attempts haven't exceeded max, reset to pending for retry
    if (attemptCount < maxTaskAttempts) {
      await unitCkpt.resetToPending();
      taskAttempts.set(taskId, attemptCount);
      resetCount++;
    }
  }

  if (resetCount > 0) {
    console.log(
      `\n🔄 Reset ${resetCount} failed task(s) for retry (attempts < ${maxTaskAttempts})\n`,
    );
  }

  return taskAttempts;
}

/* ------------------------------------------------------------------ */
/*  Previous Session Guard                                             */
/* ------------------------------------------------------------------ */

/**
 * Session statuses that should block a fresh run.
 * - error: consecutive failures or infinite loop — needs investigation
 * - cancelled: user interrupted mid-task — task state may be inconsistent
 * - running: no clean shutdown (crash) — task state unknown
 *
 * NOT included:
 * - stalled: timeout — all executed tasks succeeded, just ran out of time.
 *   Safe to continue with a fresh run.
 */
const DIRTY_SESSION_STATUSES: Set<SessionStatus> = new Set([
  "error",
  "cancelled",
  "running",
]);

function formatAge(ms: number): string {
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h${mins % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d${hours % 24}h`;
}

/**
 * Read the most recent session's metadata.json from the sessions journal.
 * Returns null if no sessions exist or the metadata can't be read.
 */
async function getLastSessionMetadata(
  projectDir: string,
): Promise<SessionMetadata | null> {
  const sessionsDir = getSessionsDir(projectDir);
  if (!existsSync(sessionsDir)) return null;

  const entries = await readdir(sessionsDir, { withFileTypes: true });
  const sessionDirs = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort(); // Lexicographic sort — session IDs are timestamp-prefixed

  if (sessionDirs.length === 0) return null;

  const latestDir = sessionDirs[sessionDirs.length - 1];
  const metadataPath = path.join(sessionsDir, latestDir, "metadata.json");
  if (!existsSync(metadataPath)) return null;

  try {
    return JSON.parse(await readFile(metadataPath, "utf-8")) as SessionMetadata;
  } catch {
    return null;
  }
}

/**
 * Guard against starting a new run when the previous session exited dirty.
 * Call this before any execution (full run, step, converge).
 * Exits the process if the guard triggers. No-op if --resume or --restart is set.
 */
export async function guardDirtySession(
  projectDir: string,
  resume?: boolean,
  restart?: boolean,
): Promise<void> {
  if (resume || restart) return;

  const lastSession = await getLastSessionMetadata(projectDir);
  if (!lastSession || !DIRTY_SESSION_STATUSES.has(lastSession.status)) return;

  const age = lastSession.endTime
    ? formatAge(Date.now() - new Date(lastSession.endTime).getTime())
    : "unknown";
  const outcomes = lastSession.outcomes;
  console.error(
    `\n⛔ Previous session exited with status: ${lastSession.status}\n`,
  );
  console.error(`   Session:    ${lastSession.sessionId}`);
  console.error(`   Status:     ${lastSession.status}`);
  console.error(`   Ended:      ${age} ago`);
  if (outcomes) {
    console.error(
      `   Progress:   ${outcomes.tasksCompleted} completed, ${outcomes.tasksFailed} failed (${outcomes.totalIterations} iterations)`,
    );
  }
  console.error(`\nTo continue, use one of:`);
  console.error(
    `   converge run --resume    # recover and continue from where it stopped`,
  );
  console.error(
    `   converge run --restart   # reset non-complete tasks and start fresh\n`,
  );
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/*  State Machine Context                                               */
/* ------------------------------------------------------------------ */

/**
 * All mutable state for one autonomous run. Each state function receives
 * this context, enriches it, and returns the next state.
 */
interface RunContext {
  // ── Fixed config ──────────────────────────────────────────
  config: AutonomousRunConfig;
  projectDir: string;
  checkpointMgr: CheckpointManager;
  sessionLogger: SessionLogger;
  maxIterations: number;
  maxTaskAttempts: number;
  maxRunDurationMs: number;

  // ── Counters (enriched each iteration) ─────────────────────
  iteration: number;
  tasksCompleted: number;
  tasksFailed: number;
  gapsResolved: number;

  // ── Task execution tracking ───────────────────────────────
  taskAttempts: Map<string, number>; // taskId → attempt count
  consecutiveFailures: number;        // consecutive exhausted failures → halt
  consecutiveSelections: number;     // same task selected → infinite loop detection
  lastSelectedTaskId: string | null;

  // ── Current iteration data (enriched by SELECT → EXECUTE → COMMIT) ──
  tree: TaskTree | null;
  selectedNode: SelectedNode | null;
  execResult: TaskExecutionResult | null;

  // ── Lifecycle ─────────────────────────────────────────────
  runStartedAt: number;
  cancelled: boolean;
}

interface SelectedNode {
  epicId: string;
  taskId: string;
  filePath: string;
  relPath: string;
  journalTaskId: string;
  blocking: boolean;
  parentTaskId: string | undefined;
  currentAttempt: number;
  treeNode: TreeNode | null;
}

type RunState =
  | "INIT"
  | "SCAN"
  | "SELECT"
  | "EXECUTE"
  | "COMMIT"
  | "CHECK"
  | "DONE";

/* ------------------------------------------------------------------ */
/*  State Handlers                                                      */
/* ------------------------------------------------------------------ */

async function stateInit(ctx: RunContext): Promise<RunState> {
  const { config, sessionLogger } = ctx;

  console.log("🤖 Starting autonomous run (tree-based traversal)\n");

  await sessionLogger.writeSessionStart();

  // Load tree once — SCAN will reload after mutations
  ctx.tree = await TaskTree.load(config.projectDir, config.convergeConfig);

  // Handle stuck tasks from previous session
  const stuckTasks = await detectStuckTasks(config.projectDir, ctx.tree);

  if (stuckTasks.length > 0) {
    if (config.resume) {
      await recoverStuckTasks(config.projectDir, ctx.tree, stuckTasks);
      await ctx.tree.reload();
    } else if (config.restart) {
      await resetAllTasks(config.projectDir, ctx.tree);
      await ctx.tree.reload();
    } else {
      console.error(
        `\n⛔ Found ${stuckTasks.length} task(s) in interrupted/running state:\n`,
      );
      for (const t of stuckTasks) {
        let age = "";
        if (t.lastActivity) {
          const elapsed = Date.now() - new Date(t.lastActivity).getTime();
          const mins = Math.floor(elapsed / 60_000);
          age = mins < 60 ? `, idle ${mins}m` : `, idle ${Math.floor(mins / 60)}h${mins % 60}m`;
        }
        console.error(`   • ${t.taskId} (status: ${t.status}${age})`);
      }
      console.error(`\nTo continue, use one of:`);
      console.error(`   converge run --resume    # recover interrupted tasks`);
      console.error(`   converge run --restart   # reset all tasks to pending\n`);
      process.exit(1);
    }
  } else if (config.restart) {
    await resetAllTasks(config.projectDir, ctx.tree);
    await ctx.tree.reload();
  }

  // Recover failed tasks for retry
  const recovered = await recoverFailedTasks(
    config.projectDir,
    ctx.tree,
    ctx.maxTaskAttempts,
  );
  if (recovered.size > 0) {
    ctx.taskAttempts = new Map([...ctx.taskAttempts, ...recovered]);
    await ctx.tree.reload();
  }

  return "SCAN";
}

async function stateScan(ctx: RunContext): Promise<RunState> {
  ctx.iteration++;

  const { tree, config, sessionLogger } = ctx;

  if (config.verbose) {
    const progress = await tree!.getProgress();
    console.log(
      `\n── Iteration ${ctx.iteration} ───────────────────────────────────────────`,
    );
    console.log(`   Progress: ${progress.completed}/${progress.total} tasks complete`);
  }

  // Wall-clock timeout guard
  const elapsed = Date.now() - ctx.runStartedAt;
  if (elapsed > ctx.maxRunDurationMs) {
    const mins = Math.floor(elapsed / 60_000);
    console.log(
      `\n⛔ Run timeout: exceeded ${Math.floor(ctx.maxRunDurationMs / 60_000)} minute limit (ran ${mins}m).\n`,
    );
    await sessionLogger.writeSessionEnd(
      {
        totalIterations: ctx.iteration,
        tasksCompleted: ctx.tasksCompleted,
        tasksFailed: ctx.tasksFailed,
        gapsResolved: ctx.gapsResolved,
        convergenceAchieved: false,
      },
      "stalled",
    );
    ctx.tasksCompleted = ctx.tasksCompleted; // no-op, for clarity
    return "DONE";
  }

  return "SELECT";
}

async function stateSelect(ctx: RunContext): Promise<RunState> {
  const { config, tree, sessionLogger } = ctx;

  const result = await tree!.findNextTask(config.filter, config.force);

  if (!result.node) {
    // No runnable tasks — check why
    const failedCount = result.failedIds.length;
    const hasFilter = !!config.filter;

    if (failedCount > 0) {
      console.log(
        hasFilter
          ? `\n⛔ No pending tasks match filter "${config.filter}" (${failedCount} tasks failed).\n`
          : `\n⛔ All remaining tasks are failed or blocked (${failedCount} failed). Fix and resume.\n`,
      );
      await sessionLogger.writeSessionEnd(
        {
          totalIterations: ctx.iteration,
          tasksCompleted: ctx.tasksCompleted,
          tasksFailed: ctx.tasksFailed,
          gapsResolved: ctx.gapsResolved,
          convergenceAchieved: false,
        },
        "error",
      );
      return "DONE";
    }

    console.log(
      hasFilter
        ? `\n✅ No pending tasks match filter "${config.filter}" — done.\n`
        : "\n✅ All tasks complete — autonomous run finished.\n",
    );
    await sessionLogger.writeSessionEnd(
      {
        totalIterations: ctx.iteration,
        tasksCompleted: ctx.tasksCompleted,
        tasksFailed: ctx.tasksFailed,
        gapsResolved: ctx.gapsResolved,
        convergenceAchieved: true,
      },
      "complete",
    );
    return "DONE";
  }

  const { node: nodeData, completedCount, totalCount } = result;

  // Infinite loop guard
  const currentTaskId = nodeData.id;
  if (currentTaskId === ctx.lastSelectedTaskId) {
    ctx.consecutiveSelections++;
    if (ctx.consecutiveSelections >= 3) {
      console.error(
        `\n⛔ INFINITE LOOP DETECTED: Task "${currentTaskId}" selected ${ctx.consecutiveSelections} times\n`,
      );
      console.error(`   This indicates a bug in task completion detection.\n`);
      await sessionLogger.writeSessionEnd(
        {
          totalIterations: ctx.iteration,
          tasksCompleted: ctx.tasksCompleted,
          tasksFailed: ctx.tasksFailed,
          gapsResolved: ctx.gapsResolved,
          convergenceAchieved: false,
        },
        "error",
      );
      return "DONE";
    }
  } else {
    ctx.consecutiveSelections = 0;
  }
  ctx.lastSelectedTaskId = currentTaskId;

  const currentAttempt = (ctx.taskAttempts.get(currentTaskId) ?? 0) + 1;
  const treeNode = tree!.getNode(currentTaskId);

  ctx.selectedNode = {
    epicId: nodeData.epicId || "unknown",
    taskId: currentTaskId.split("/").pop() || currentTaskId,
    filePath: nodeData.unit.path,
    relPath: nodeData.unit.path.replace(config.projectDir + "/", ""),
    parentTaskId: currentTaskId.includes("/") ? currentTaskId.split("/")[0] : undefined,
    journalTaskId: currentTaskId,
    blocking: nodeData.blocking,
    currentAttempt,
    treeNode,
  };

  // Print progress header
  console.log(
    `\n── Iteration ${ctx.iteration} ─────────────────────────────────────────────`,
  );
  console.log(`📍 Progress: ${completedCount}/${totalCount} tasks complete`);
  console.log(`▶  Next task: ${ctx.selectedNode.relPath}`);
  console.log(`   Epic: ${ctx.selectedNode.epicId}  Task: ${ctx.selectedNode.taskId}`);

  await sessionLogger.logTaskSelected(
    ctx.selectedNode.journalTaskId,
    ctx.selectedNode.epicId,
    currentAttempt,
  );
  await sessionLogger.logTaskAttemptStart(ctx.selectedNode.journalTaskId, currentAttempt);

  return "EXECUTE";
}

async function stateExecute(ctx: RunContext): Promise<RunState> {
  const { selectedNode, config, checkpointMgr, sessionLogger } = ctx;
  const taskStartTime = Date.now();

  let unit: Unit | null = null;
  try {
    unit = await Unit.fromPath(selectedNode!.filePath);
    if (config.epochVars) {
      unit.vars = { ...unit.vars, ...config.epochVars };
    }
  } catch (err: any) {
    // Fall back to context-based execution if Unit loading fails
    console.error(
      `   ❌ Failed to load unit from ${selectedNode!.filePath}: ${err.message}`,
    );
    const execResult = await executeTask(
      {
        projectDir: config.projectDir,
        epicId: selectedNode!.epicId,
        journalTaskId: selectedNode!.journalTaskId,
        filePath: selectedNode!.filePath,
        sessionLogger,
        extraVars: config.epochVars,
      },
      checkpointMgr,
    );
    ctx.execResult = execResult;
    const taskDuration = Date.now() - taskStartTime;
    await sessionLogger.logTaskAttemptComplete(
      selectedNode!.journalTaskId,
      selectedNode!.currentAttempt,
      execResult.success,
      taskDuration,
    );
    return "COMMIT";
  }

  // Container check: WBS parent with children but no wbsFn → skip
  if (selectedNode!.treeNode && selectedNode!.treeNode.children.length > 0 && !unit.wbsFn) {
    console.log(
      `   ⏩ Container task (${selectedNode!.treeNode.children.length} children) — skipping direct execution`,
    );
    await ctx.tree!.markSeeded(
      selectedNode!.treeNode!,
      selectedNode!.treeNode!.children.map((c) => c.id),
    );
    ctx.taskAttempts.delete(selectedNode!.journalTaskId);
    ctx.tasksCompleted++;
    await sessionLogger.logConvergence(selectedNode!.journalTaskId, true);
    ctx.execResult = null;
    return "CHECK";
  }

  ctx.execResult = await executeTask(unit, checkpointMgr, sessionLogger);
  const taskDuration = Date.now() - taskStartTime;
  await sessionLogger.logTaskAttemptComplete(
    selectedNode!.journalTaskId,
    selectedNode!.currentAttempt,
    ctx.execResult.success,
    taskDuration,
  );

  return "COMMIT";
}

async function stateCommit(ctx: RunContext): Promise<RunState> {
  const { selectedNode, execResult, config, sessionLogger, tree } = ctx;

  if (!execResult) {
    // Container skip case — tree was already updated
    await tree!.reload();
    return "CHECK";
  }

  if (execResult.success) {
    if (execResult.isWbsTask) {
      console.log(` — waiting for subtasks`);
    } else {
      console.log(`: ${selectedNode!.taskId}`);
    }

    ctx.taskAttempts.delete(selectedNode!.journalTaskId);
    ctx.consecutiveFailures = 0;
    ctx.tasksCompleted++;
    await sessionLogger.logConvergence(selectedNode!.journalTaskId, true);

    if (selectedNode!.treeNode) {
      if (execResult.isWbsTask) {
        await tree!.markSeeded(selectedNode!.treeNode, []);
      } else {
        await tree!.markCompleted(selectedNode!.treeNode);
      }
    }

    if (config.force) {
      await sessionLogger.writeSessionEnd(
        {
          totalIterations: ctx.iteration,
          tasksCompleted: ctx.tasksCompleted,
          tasksFailed: ctx.tasksFailed,
          gapsResolved: ctx.gapsResolved,
          convergenceAchieved: true,
        },
        "complete",
      );
      return "DONE";
    }
  } else {
    const attempts = (ctx.taskAttempts.get(selectedNode!.journalTaskId) ?? 0) + 1;
    ctx.taskAttempts.set(selectedNode!.journalTaskId, attempts);

    if (execResult.resetSiblings?.length) {
      for (const sid of execResult.resetSiblings) {
        ctx.taskAttempts.delete(sid);
      }
    }

    console.log(`: ${selectedNode!.taskId} (attempt ${attempts}/${ctx.maxTaskAttempts})`);

    if (execResult.isBlocking) {
      console.error(`\n⚠️  BLOCKING TASK FAILED: ${selectedNode!.journalTaskId}`);
      console.error(`   Epic: ${selectedNode!.epicId}`);
      console.error(`   ↳ This will block downstream tasks with explicit dependencies.\n`);
    }

    if (attempts >= ctx.maxTaskAttempts) {
      console.log(
        `   ⛔ Max attempts (${ctx.maxTaskAttempts}) reached for ${selectedNode!.taskId} — permanently skipping.`,
      );
      console.log(`   ↳  Retry manually with: converge reset ${selectedNode!.taskId}`);
      ctx.consecutiveFailures++;
      ctx.tasksFailed++;
      await sessionLogger.logConvergence(selectedNode!.journalTaskId, false);
      if (selectedNode!.treeNode) {
        await tree!.markFailed(selectedNode!.treeNode);
      }
    }
    // If attempts < max: task will be retried; don't increment consecutiveFailures
  }

  await tree!.reload();
  ctx.selectedNode = null;
  ctx.execResult = null;

  return "CHECK";
}

async function stateCheck(ctx: RunContext): Promise<RunState> {
  const { consecutiveFailures, iteration, maxIterations, config, sessionLogger } = ctx;

  // Halt after 3 consecutive exhausted failures
  if (consecutiveFailures >= 3) {
    console.log(
      "\n⛔ Halting: 3 consecutive task failures with no progress. Fix and resume.\n",
    );
    await sessionLogger.writeSessionEnd(
      {
        totalIterations: iteration,
        tasksCompleted: ctx.tasksCompleted,
        tasksFailed: ctx.tasksFailed,
        gapsResolved: ctx.gapsResolved,
        convergenceAchieved: false,
      },
      "error",
    );
    return "DONE";
  }

  // Max iterations guard
  if (iteration >= maxIterations) {
    console.log(
      `\n⚠️  Max iterations (${maxIterations}) reached. Use --max-iterations to increase.\n`,
    );
    await sessionLogger.writeSessionEnd(
      {
        totalIterations: iteration,
        tasksCompleted: ctx.tasksCompleted,
        tasksFailed: ctx.tasksFailed,
        gapsResolved: ctx.gapsResolved,
        convergenceAchieved: false,
      },
      "stalled",
    );
    return "DONE";
  }

  // Normal case: continue to next iteration
  return "SCAN";
}

/* ------------------------------------------------------------------ */
/*  Main loop                                                          */
/* ------------------------------------------------------------------ */

export async function autonomousRun(
  config: AutonomousRunConfig,
): Promise<AutonomousRunResult> {
  const checkpointMgr = new CheckpointManager(config.projectDir);
  const sessionLogger = new SessionLogger(
    config.projectDir,
    generateSessionId(),
    config.convergeConfig.name || "Unknown Project",
    { maxIterations: config.maxIterations ?? 100, maxAttemptsPerTask: config.maxTaskAttempts ?? 2 },
  );

  const ctx: RunContext = {
    config,
    projectDir: config.projectDir,
    checkpointMgr,
    sessionLogger,
    maxIterations: config.maxIterations ?? 100,
    maxTaskAttempts: config.maxTaskAttempts ?? 2,
    maxRunDurationMs: config.maxRunDurationMs ?? 72 * 60 * 60 * 1000,
    iteration: 0,
    tasksCompleted: 0,
    tasksFailed: 0,
    gapsResolved: 0,
    taskAttempts: new Map(),
    consecutiveFailures: 0,
    consecutiveSelections: 0,
    lastSelectedTaskId: null,
    tree: null,
    selectedNode: null,
    execResult: null,
    runStartedAt: Date.now(),
    cancelled: false,
  };

  // ── Cancellation ───────────────────────────────────────────────
  const cleanupSession = async (signal: string) => {
    if (ctx.cancelled) return;
    ctx.cancelled = true;
    try {
      console.log(`\n\n⚠️  Received ${signal}. Finalizing session...`);
      const currentTask = (global as any).__CONVERGE_CURRENT_TASK__;
      if (currentTask) {
        try {
          await currentTask.unitCkpt.markInterrupted();
          console.log(`   ⚡ Recorded interruption for task: ${currentTask.journalTaskId}`);
        } catch (err: any) {
          console.warn(`   ⚠️  Could not record interrupted state: ${err.message}`);
        }
      }
      await sessionLogger.writeSessionEnd(
        {
          totalIterations: ctx.iteration,
          tasksCompleted: ctx.tasksCompleted,
          tasksFailed: ctx.tasksFailed,
          gapsResolved: ctx.gapsResolved,
          convergenceAchieved: false,
        },
        "cancelled",
      );
      console.log(`✅ Session finalized: ${sessionLogger.getSessionDir()}\n`);
    } catch (err: any) {
      console.warn(`⚠️  Error during cleanup: ${err.message}`);
    }
    process.exit(signal === "SIGINT" ? 130 : 143);
  };

  process.once("SIGINT", () => cleanupSession("SIGINT"));
  process.once("SIGTERM", () => cleanupSession("SIGTERM"));

  // ── State machine loop ──────────────────────────────────────────
  const handlers: Record<RunState, (ctx: RunContext) => Promise<RunState>> = {
    INIT: stateInit,
    SCAN: stateScan,
    SELECT: stateSelect,
    EXECUTE: stateExecute,
    COMMIT: stateCommit,
    CHECK: stateCheck,
    DONE: async () => "DONE",
  };

  let state: RunState = "INIT";
  try {
    while (state !== "DONE") {
      state = await handlers[state](ctx);
    }
  } catch (error: any) {
    if (!ctx.cancelled) {
      await sessionLogger.writeSessionEnd(
        {
          totalIterations: ctx.iteration,
          tasksCompleted: ctx.tasksCompleted,
          tasksFailed: ctx.tasksFailed,
          gapsResolved: ctx.gapsResolved,
          convergenceAchieved: false,
        },
        "error",
      );
    }
    throw error;
  }

  return {
    completed: state === "DONE" && ctx.tasksFailed === 0,
    tasksCompleted: ctx.tasksCompleted,
    tasksFailed: ctx.tasksFailed,
    iterations: ctx.iteration,
  };
}
