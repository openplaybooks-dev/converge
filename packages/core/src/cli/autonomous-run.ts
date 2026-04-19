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

import { createDiscoveryScanner } from "../discovery/scanner.ts";
import { CheckpointManager } from "../checkpoint/manager.ts";
import { findNextTask } from "./next-task.ts";
import type { ConvergeConfig } from "../config/types.ts";
import type { HookRegistry } from "../hooks/registry.ts";
import { executeTask } from "../lifecycle/task-runner.ts";
import { SessionLogger, generateSessionId } from "../journal/session-logger.ts";
import type {
  ProgressSnapshot,
  GapInfo,
  SessionMetadata,
  SessionStatus,
} from "../journal/session-types.ts";
import { Unit } from "../unit/unit.ts";
import { TaskTree } from "../tree/index.ts";
import { UnitCheckpointManager } from "../checkpoint/unit-checkpoint.ts";
import { findGaps } from "../unit/find-gaps.ts";
import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { generateInterruptedMd } from "../lifecycle/learn.ts";
import { getEpicsDir, getSessionsDir } from "../journal/structure.ts";

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
/*  Main loop                                                          */
/* ------------------------------------------------------------------ */

/**
 * Run the full project autonomously.
 *
 * Every iteration re-scans the filesystem so AI-created tasks/epics are
 * picked up without any special handling — they simply appear in the next snap.
 */
export async function autonomousRun(
  config: AutonomousRunConfig,
): Promise<AutonomousRunResult> {
  const { projectDir, verbose } = config;
  const maxIterations = config.maxIterations ?? 100;
  const maxTaskAttempts = config.maxTaskAttempts ?? 2;
  const maxRunDurationMs = config.maxRunDurationMs ?? 72 * 60 * 60 * 1000; // 72 hours default
  const checkpointMgr = new CheckpointManager(projectDir);

  // Initialize session logger
  const sessionId = generateSessionId();
  const projectName = config.convergeConfig.name || "Unknown Project";
  const sessionLogger = new SessionLogger(projectDir, sessionId, projectName, {
    maxIterations,
    maxAttemptsPerTask: maxTaskAttempts,
  });

  // Write session start
  await sessionLogger.writeSessionStart();

  console.log("🤖 Starting autonomous run (tree-based traversal)\n");

  // Initialize tree (replaces snap)
  let tree = await TaskTree.load(projectDir, config.convergeConfig);

  // ── Detect stuck tasks (running or interrupted from a previous session) ──
  const stuckTasks = await detectStuckTasks(projectDir, tree);

  if (stuckTasks.length > 0) {
    if (config.resume) {
      // --resume: recover them
      await recoverStuckTasks(projectDir, tree, stuckTasks);
      await tree.reload();
    } else if (config.restart) {
      // --restart: reset ALL tasks to pending
      await resetAllTasks(projectDir, tree);
      await tree.reload();
    } else {
      // No flag: fail fast
      console.error(
        `\n⛔ Found ${stuckTasks.length} task(s) in interrupted/running state:\n`,
      );
      for (const t of stuckTasks) {
        let age = "";
        if (t.lastActivity) {
          const elapsed = Date.now() - new Date(t.lastActivity).getTime();
          const mins = Math.floor(elapsed / 60_000);
          age =
            mins < 60
              ? `, idle ${mins}m`
              : `, idle ${Math.floor(mins / 60)}h${mins % 60}m`;
        }
        console.error(`   • ${t.taskId} (status: ${t.status}${age})`);
      }
      console.error(`\nTo continue, use one of:`);
      console.error(`   converge run --resume    # recover interrupted tasks`);
      console.error(
        `   converge run --restart   # reset all tasks to pending\n`,
      );
      process.exit(1);
    }
  } else if (config.restart) {
    // --restart with no stuck tasks: still reset everything
    await resetAllTasks(projectDir, tree);
    await tree.reload();
  }

  // ── Detect and recover failed tasks for retry ─────────────────────────
  // Failed tasks that haven't exceeded max attempts should be retried
  // This ensures failed tasks from previous runs are not skipped forever
  const recoveredTaskAttempts = await recoverFailedTasks(
    projectDir,
    tree,
    maxTaskAttempts,
  );
  if (recoveredTaskAttempts.size > 0) {
    await tree.reload();
  }

  const runStartedAt = Date.now();
  let iteration = 0;
  let consecutiveFailures = 0;
  let tasksCompleted = 0;
  let tasksFailed = 0;
  let gapsResolved = 0;
  // Per-task failure tracking: taskId → attempt count
  // Initialize with recovered failed tasks' attempt counts
  const taskAttempts = new Map<string, number>(recoveredTaskAttempts);

  // Track consecutive selections to detect infinite loops
  let lastSelectedTaskId: string | null = null;
  let consecutiveSelections = 0;
  const MAX_SAME_TASK_SELECTIONS = 3;

  // Setup cancellation handler for this session
  let cancelled = false;
  const cleanupSession = async (signal: string) => {
    if (cancelled) return; // Prevent double cleanup
    cancelled = true;

    try {
      console.log(`\n\n⚠️  Received ${signal}. Finalizing session...`);

      // Mark the currently executing task as interrupted so the next run can recover it.
      // The task's pre-flight check will determine if it actually completed (outputs exist)
      // or needs to re-run (outputs missing).
      const currentTask = (global as any).__CONVERGE_CURRENT_TASK__;
      if (currentTask) {
        try {
          await currentTask.unitCkpt.markInterrupted();
          console.log(
            `   ⚡ Recorded interruption for task: ${currentTask.journalTaskId}`,
          );
        } catch (err: any) {
          console.warn(
            `   ⚠️  Could not record interrupted state: ${err.message}`,
          );
        }
      }

      await sessionLogger.writeSessionEnd(
        {
          totalIterations: iteration,
          tasksCompleted,
          tasksFailed,
          gapsResolved,
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

  // Register cleanup handlers
  const sigintHandler = () => cleanupSession("SIGINT");
  const sigtermHandler = () => cleanupSession("SIGTERM");
  process.once("SIGINT", sigintHandler);
  process.once("SIGTERM", sigtermHandler);

  try {
    while (iteration < maxIterations) {
      iteration++;

      // ── 1. TREE TRAVERSAL (replaces SNAP) ────────────────────────────
      // Tree is reloaded after each task execution to pick up WBS-spawned children
      if (verbose) {
        const progress = await tree.getProgress();
        console.log(
          `\n── Iteration ${iteration} ───────────────────────────────────────────`,
        );
        console.log(
          `   Progress: ${progress.completed}/${progress.total} tasks complete`,
        );
      }

      // ── GLOBAL WALL-CLOCK GUARD ──────────────────────────────────────
      const elapsed = Date.now() - runStartedAt;
      if (elapsed > maxRunDurationMs) {
        const mins = Math.floor(elapsed / 60_000);
        console.log(
          `\n⛔ Run timeout: exceeded ${Math.floor(maxRunDurationMs / 60_000)} minute limit (ran ${mins}m). Stopping.\n`,
        );

        // Write session end with stalled status
        await sessionLogger.writeSessionEnd(
          {
            totalIterations: iteration,
            tasksCompleted,
            tasksFailed,
            gapsResolved,
            convergenceAchieved: false,
          },
          "stalled",
        );

        return {
          completed: false,
          tasksCompleted,
          tasksFailed,
          iterations: iteration,
          stoppedReason: "timeout" as const,
        };
      }

      // ── 2. FIND NEXT TASK (hierarchical tree traversal) ──────────────
      const nextTaskResult = await tree.findNextTask(
        config.filter,
        config.force,
      );

      if (!nextTaskResult) {
        const doneMsg = config.filter
          ? `\n✅ No pending tasks match filter "${config.filter}" — done.\n`
          : "\n✅ All tasks complete — autonomous run finished.\n";
        console.log(doneMsg);

        // Write session end
        await sessionLogger.writeSessionEnd(
          {
            totalIterations: iteration,
            tasksCompleted,
            tasksFailed,
            gapsResolved,
            convergenceAchieved: true,
          },
          "complete",
        );

        return {
          completed: true,
          tasksCompleted,
          tasksFailed,
          iterations: iteration,
        };
      }

      const { node: nodeData, completedCount, totalCount } = nextTaskResult;

      // Convert TreeNodeData to TaskNode format for compatibility
      const node = {
        epicId: nodeData.epicId || "unknown",
        taskId: nodeData.id.split("/").pop() || nodeData.id,
        filePath: nodeData.unit.path,
        relPath: nodeData.unit.path.replace(projectDir + "/", ""),
        parentTaskId: nodeData.id.includes("/")
          ? nodeData.id.split("/")[0]
          : undefined,
        journalTaskId: nodeData.id,
        blocking: nodeData.blocking,
        dependencies: nodeData.unit.dependencies,
        tags: nodeData.tags,
      };

      // ── INFINITE LOOP DETECTION ──────────────────────────────────────────
      // Detect if the same task is being selected repeatedly without completion
      const currentTaskId = node.journalTaskId;

      if (currentTaskId === lastSelectedTaskId) {
        consecutiveSelections++;
        if (consecutiveSelections >= MAX_SAME_TASK_SELECTIONS) {
          console.error(
            `\n⛔ INFINITE LOOP DETECTED: Task "${currentTaskId}" selected ${consecutiveSelections} times`,
          );
          console.error(`   File: ${node.filePath}`);
          console.error(`   Epic: ${node.epicId}`);
          console.error(
            `\n   This indicates a bug in task completion detection.\n`,
          );

          await sessionLogger.writeSessionEnd(
            {
              totalIterations: iteration,
              tasksCompleted,
              tasksFailed,
              gapsResolved,
              convergenceAchieved: false,
            },
            "error",
          );
          return {
            completed: false,
            tasksCompleted,
            tasksFailed,
            iterations: iteration,
            stoppedReason: "consecutive-failures" as const,
          };
        }
      } else {
        consecutiveSelections = 0;
      }

      lastSelectedTaskId = currentTaskId;

      // Write iteration snapshot
      const currentAttempt = (taskAttempts.get(node.journalTaskId) ?? 0) + 1;
      const snapshot: ProgressSnapshot = {
        iteration,
        timestamp: new Date().toISOString(),
        tasksComplete: completedCount,
        tasksTotal: totalCount,
        currentTask: {
          id: node.journalTaskId,
          epic: node.epicId,
          attempt: currentAttempt,
          status: "running",
        },
        gaps: [], // Will be populated by task execution
      };
      await sessionLogger.writeIterationSnapshot(snapshot);

      console.log(
        `\n── Iteration ${iteration} ─────────────────────────────────────────────`,
      );
      console.log(
        `📍 Progress: ${completedCount}/${totalCount} tasks complete`,
      );
      console.log(`▶  Next task: ${node.relPath}`);
      console.log(`   Epic: ${node.epicId}  Task: ${node.taskId}`);

      // Log task selection
      await sessionLogger.logTaskSelected(
        node.journalTaskId,
        node.epicId,
        currentAttempt,
      );

      // ── 3. EXECUTE ───────────────────────────────────────────────────
      const taskStartTime = Date.now();
      await sessionLogger.logTaskAttemptStart(
        node.journalTaskId,
        currentAttempt,
      );

      // Load Unit first (enables context-based operations)
      let unit: Unit;
      try {
        // Always use fromPath() - it handles both SKILL.md and task.ts
        unit = await Unit.fromPath(node.filePath);
      } catch (err: any) {
        console.error(
          `   ❌ Failed to load unit from ${node.filePath}: ${err.message}`,
        );
        // Fall back to legacy context-based execution
        const execResult = await executeTask(
          {
            projectDir,
            epicId: node.epicId,
            journalTaskId: node.journalTaskId,
            filePath: node.filePath,
            sessionLogger,
          },
          checkpointMgr,
        );
        const taskDuration = Date.now() - taskStartTime;
        await sessionLogger.logTaskAttemptComplete(
          node.journalTaskId,
          currentAttempt,
          execResult.success,
          taskDuration,
        );

        // Handle result...
        if (execResult.success) {
          taskAttempts.delete(node.journalTaskId);
          consecutiveFailures = 0;
          tasksCompleted++;
          await sessionLogger.logConvergence(node.journalTaskId, true);
          if (config.force) break; // --force: stop after first success
        } else {
          const attempts = (taskAttempts.get(node.journalTaskId) ?? 0) + 1;
          taskAttempts.set(node.journalTaskId, attempts);
          if (execResult.resetSiblings?.length) {
            for (const siblingId of execResult.resetSiblings) {
              taskAttempts.delete(siblingId);
            }
          }
          if (attempts >= maxTaskAttempts) {
            consecutiveFailures++;
            tasksFailed++;
            await sessionLogger.logConvergence(node.journalTaskId, false);
          }
        }
        continue;
      }

      // ── CONTAINER CHECK ──────────────────────────────────────────────
      // Use the already-built tree to detect static container tasks:
      // children exist in the tree but no wbsFn (no dynamic spawning).
      // These should never execute directly — their children run independently.
      // Mark as seeded so reconciliation auto-completes once all children finish.
      const treeNode = tree.getNode(node.journalTaskId);
      if (treeNode && treeNode.children.length > 0 && !unit.wbsFn) {
        console.log(
          `   ⏩ Container task (${treeNode.children.length} children) — skipping direct execution`,
        );
        await tree.markSeeded(
          treeNode,
          treeNode.children.map((c) => c.id),
        );
        taskAttempts.delete(node.journalTaskId);
        consecutiveFailures = 0;
        tasksCompleted++;
        await sessionLogger.logConvergence(node.journalTaskId, true);
        continue;
      }

      // Execute with Unit (enables parent facts, context-based ancestor ops)
      const execResult = await executeTask(unit, checkpointMgr, sessionLogger);

      const taskDuration = Date.now() - taskStartTime;
      await sessionLogger.logTaskAttemptComplete(
        node.journalTaskId,
        currentAttempt,
        execResult.success,
        taskDuration,
      );

      // ── 4. COMMIT & TREE SHAKE ───────────────────────────────────────
      if (execResult.success) {
        if (execResult.isWbsTask) {
          console.log(` — waiting for subtasks`);
        } else {
          console.log(`: ${node.taskId}`);
        }

        taskAttempts.delete(node.journalTaskId); // reset on success
        consecutiveFailures = 0;
        tasksCompleted++;
        await sessionLogger.logConvergence(node.journalTaskId, true);

        // Mark completed/seeded in tree (propagates auto-completion)
        const treeNode = tree.getNode(node.journalTaskId);
        if (treeNode) {
          if (execResult.isWbsTask) {
            // WBS parent: mark as seeded (waiting for children)
            // Children are discovered on next tree reload
            await tree.markSeeded(treeNode, []);
          } else {
            // Regular task: mark as completed (propagates auto-completion)
            await tree.markCompleted(treeNode);
          }
        }

        // --force: stop after the first successful run (don't loop infinitely)
        if (config.force) {
          await sessionLogger.writeSessionEnd(
            {
              totalIterations: iteration,
              tasksCompleted,
              tasksFailed,
              gapsResolved,
              convergenceAchieved: true,
            },
            "complete",
          );
          return {
            completed: true,
            tasksCompleted,
            tasksFailed,
            iterations: iteration,
          };
        }
      } else {
        const attempts = (taskAttempts.get(node.journalTaskId) ?? 0) + 1;
        taskAttempts.set(node.journalTaskId, attempts);
        if (execResult.resetSiblings?.length) {
          for (const siblingId of execResult.resetSiblings) {
            taskAttempts.delete(siblingId);
          }
        }

        console.log(
          `: ${node.taskId} (attempt ${attempts}/${maxTaskAttempts})`,
        );

        // Check if this is a blocking task
        if (execResult.isBlocking) {
          console.error(`\n⚠️  BLOCKING TASK FAILED: ${node.journalTaskId}`);
          console.error(`   Epic: ${node.epicId}`);
          console.error(
            `   ↳ This will block downstream tasks with explicit dependencies.`,
          );
          console.error(
            `   ↳ Tasks without dependencies will continue executing.\n`,
          );
        }

        if (attempts >= maxTaskAttempts) {
          // Task exhausted its attempts — permanently skip and unblock downstream
          console.log(
            `   ⛔ Max attempts (${maxTaskAttempts}) reached for ${node.taskId} — permanently skipping.`,
          );
          console.log(
            `   ↳  Retry manually with: converge reset ${node.taskId}`,
          );
          consecutiveFailures++;
          tasksFailed++;
          await sessionLogger.logConvergence(node.journalTaskId, false);

          // Mark failed in tree (blocks dependents)
          const treeNode = tree.getNode(node.journalTaskId);
          if (treeNode) {
            await tree.markFailed(treeNode);
          }
        } else {
          console.log(
            `   ⚠️  Will retry on next iteration (${attempts}/${maxTaskAttempts} attempts used).`,
          );
          // Don't increment consecutiveFailures — this task still has retries
        }

        // After 3 permanently-failed (exhausted) tasks in a row, halt to avoid thrashing
        if (consecutiveFailures >= 3) {
          console.log(
            "\n⛔ Halting: 3 consecutive task failures with no progress. Fix the issues and resume.\n",
          );

          // Write session end with error status
          await sessionLogger.writeSessionEnd(
            {
              totalIterations: iteration,
              tasksCompleted,
              tasksFailed,
              gapsResolved,
              convergenceAchieved: false,
            },
            "error",
          );

          return {
            completed: false,
            tasksCompleted,
            tasksFailed,
            iterations: iteration,
            stoppedReason: "consecutive-failures" as const,
          };
        }
      }

      // ── TREE SHAKE: Reload tree to pick up WBS-spawned children ──────
      // This is the "tree shake" - tree is rebuilt from filesystem after each task
      await tree.reload();
    }

    console.log(
      `\n⚠️  Max iterations (${maxIterations}) reached. Use --max-iterations to increase.\n`,
    );

    // Write session end with stalled status
    await sessionLogger.writeSessionEnd(
      {
        totalIterations: iteration,
        tasksCompleted,
        tasksFailed,
        gapsResolved,
        convergenceAchieved: false,
      },
      "stalled",
    );

    return {
      completed: false,
      tasksCompleted,
      tasksFailed,
      iterations: iteration,
      stoppedReason: "max-iterations" as const,
    };
  } catch (error: any) {
    // Ensure session is finalized on error
    if (!cancelled) {
      await sessionLogger.writeSessionEnd(
        {
          totalIterations: iteration,
          tasksCompleted,
          tasksFailed,
          gapsResolved,
          convergenceAchieved: false,
        },
        "error",
      );
    }

    // Remove signal handlers to prevent double cleanup
    process.removeListener("SIGINT", sigintHandler);
    process.removeListener("SIGTERM", sigtermHandler);

    throw error; // Re-throw to propagate to caller
  } finally {
    // Clean up signal handlers
    process.removeListener("SIGINT", sigintHandler);
    process.removeListener("SIGTERM", sigtermHandler);
  }
}
