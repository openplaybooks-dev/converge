/**
 * Autonomous Run Command
 */

import type { CommonOptions } from "./commands.ts";
import type { ConvergeConfig } from "../config/types.ts";
import type { HookRegistry } from "../hooks/registry.ts";
import {
  treeNodesToTaskNodes,
  getTaskStates,
  calculateExecutionPlan,
} from "./next-task.ts";
import type { TaskNode, TaskStates } from "./next-task.ts";
import { TaskTree } from "../tree/index.ts";
import { convergeRun } from "../converge/converge-runner.ts";
import { printTaskTree } from "./tree-display.ts";
import { autonomousRun, guardDirtySession } from "./autonomous-run.ts";
import { CheckpointManager } from "../checkpoint/manager.ts";
import { executeTask } from "../lifecycle/task-runner.ts";
import { SessionLogger, generateSessionId } from "../journal/session-logger.ts";
import { getJournalStructure } from "../journal/structure.ts";
import { UnblockStrategy } from "../repair/strategies/unblock.ts";
import { ExecutionTimeline } from "../repair/timeline.ts";
import type { Gap } from "../gap/types.ts";
import type { StrategyContext } from "../repair/types.ts";
import { createAIContext } from "../ai/context.ts";
import { readFile, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

export interface AutoRunOptions extends CommonOptions {
  /** Run only one step then exit */
  step?: boolean;

  /** Dry run — show what would execute without running */
  dry?: boolean;

  /** Preflight mode — run AI strategy selection but stop before executing tasks */
  analyze?: boolean;

  /** Maximum iterations (full run only) */
  maxIterations?: number;

  /** Filter to a specific epic or task (e.g. "99-test" or "99-test/skill-invoke-test") */
  filter?: string;

  /** Force-run the filtered task even if blocked, completed, or failed */
  force?: boolean;

  /** Resume: recover interrupted/running tasks from a previous session */
  resume?: boolean;

  /** Restart: reset all tasks to pending and start fresh */
  restart?: boolean;

  /** Unblock mode — find first blocked task and run through UnblockStrategy pipeline */
  unblock?: boolean;

  /** Converge mode — compound convergence with weighted scoring, gap ledger, partial progress */
  converge?: boolean;

  /** WBS-only mode — run only the WBS seeding phase */
  wbs?: boolean;

  /** Incremental re-seed — allow re-seeding already-seeded WBS parents */
  inc?: boolean;

  /** Maximum duration in ms for the entire run */
  maxDuration?: number;

  /** Check interval in ms */
  checkInterval?: number;

  /** Enable auto-fixing */
  autoFix?: boolean;

  /** Enable self-planning */
  selfPlan?: boolean;

  /** Loaded PROJECT.md or project.yaml config (auto-discovered by CLI) */
  convergeConfig?: ConvergeConfig;

  /** Pre-built hook registry from config hooks */
  hookRegistry?: HookRegistry;
}

/* ------------------------------------------------------------------ */

/**
 * Usage:
 *   converge run                # Full autonomous loop (snap → execute → snap)
 *   converge run --dry          # Preview full queue without executing
 *   converge run --step         # Execute the next single task
 *   converge run --step --dry   # Preview next task without executing
 */
export async function runAutonomousCommand(
  options: AutoRunOptions = {},
): Promise<void> {
  try {
    if (!options.convergeConfig) {
      throw new Error(
        "No .converge/PROJECT.md or .converge/project.yaml found. Please create a .converge/PROJECT.md or .converge/project.yaml file.",
      );
    }

    const projectDir = options.dir || process.cwd();

    // ── Guard: block if previous session exited dirty (skip for --dry) ──
    if (!options.dry) {
      await guardDirtySession(projectDir, options.resume, options.restart);
    }

    // ── Converge mode (--converge) ─────────────────────────────────────
    if (options.converge) {
      const result = await convergeRun({
        projectDir,
        convergeConfig: options.convergeConfig!,
        hookRegistry: options.hookRegistry,
        maxIterations: options.maxIterations,
        maxTaskAttempts: 2,
        maxRunDurationMs: options.maxDuration,
        verbose: options.verbose,
        filter: options.filter,
        force: options.force,
        resume: options.resume,
        restart: options.restart,
        planOnly: options.dry,
      });

      if (!result.converged) {
        process.exit(1);
      }
      return;
    }

    // ── WBS-only mode (--wbs) ────────────────────────────────────────
    if (options.wbs) {
      await runWbsOnly(options);
      return;
    }

    // ── Discover + build tree ──────────────────────────────────────────
    console.log("🔍 Discovering tasks, epics, and skills...\n");

    const taskTree = await TaskTree.load(projectDir, options.convergeConfig);
    const tree = treeNodesToTaskNodes(taskTree, projectDir);

    console.log(`📊 Tasks: ${tree.length}\n`);
    const states = await getTaskStates(projectDir, tree, { skipAutoComplete: true });
    const completedIds = states.completed;
    // Exclude tasks that are done (completed, failed, or seeded/locked WBS parents WITH children)
    // CRITICAL: Seeded/locked tasks with NO spawned children should remain pending (they failed to spawn)
    const pendingNodes = tree.filter((n) => {
      // Already completed or failed? Definitely not pending
      if (
        states.completed.has(n.journalTaskId) ||
        states.failed.has(n.journalTaskId)
      ) {
        return false;
      }

      // Locked/seeded task? Only exclude if it has spawned children
      if (states.locked.has(n.journalTaskId)) {
        const progress = states.wbsProgress.get(n.journalTaskId);
        // If no progress entry OR spawnCount is 0, task failed to spawn children → keep as pending
        if (!progress || progress.spawnCount === 0) {
          return true; // Keep as pending
        }
        // Has spawned children → exclude from pending (children will be worked on)
        return false;
      }

      // Not completed, not failed, not locked → pending
      return true;
    });

    // ── Apply filter ──────────────────────────────────────────────────
    const filter = options.filter;
    const force = options.force;
    // When --force, allow any task state (including completed/failed/blocked); otherwise use pending only
    const nodePool = force ? tree : pendingNodes;
    const filteredNodes = filter
      ? nodePool.filter((n) => {
          const slashIdx = filter.indexOf("/");
          if (slashIdx >= 0) {
            // Explicit epic/task filter: first part matches epic, second matches task
            const filterEpic = filter.substring(0, slashIdx);
            const filterTask = filter.substring(slashIdx + 1);
            const epicMatch = !filterEpic || n.epicId.includes(filterEpic);
            const taskMatch =
              !filterTask ||
              n.taskId.includes(filterTask) ||
              n.journalTaskId.includes(filterTask);
            return epicMatch && taskMatch;
          }
          // No slash: match against epicId, taskId, journalTaskId, or parentTaskId
          return (
            n.epicId.includes(filter) ||
            n.taskId.includes(filter) ||
            n.journalTaskId.includes(filter) ||
            (n.parentTaskId?.includes(filter) ?? false)
          );
        })
      : nodePool;

    // ── Full run ──────────────────────────────────────────────────────
    // --preflight implies --step (it only makes sense to analyze one task at a time)
    if (!options.step && !options.analyze) {
      if (filteredNodes.length === 0) {
        if (filter) {
          console.log(`✅ No pending tasks match filter "${filter}".\n`);
        } else if (states.failed.size > 0) {
          console.log(
            `⚠️  No runnable tasks — ${states.failed.size} task(s) failed. Run --unblock to attempt repair.\n`,
          );
        } else if (states.blocked.size > 0) {
          console.log(
            `⚠️  No runnable tasks — ${states.blocked.size} task(s) blocked.\n`,
          );
        } else {
          console.log("✅ All tasks complete.\n");
        }
        return;
      }

      if (options.dry) {
        // Preview: show the same queue autonomousRun would process
        console.log(
          `📋 Pending queue (${filteredNodes.length}/${tree.length} tasks):\n`,
        );
        for (let i = 0; i < filteredNodes.length; i++) {
          const n = filteredNodes[i];
          console.log(
            `  ${String(i + 1).padStart(2)}. [${n.epicId}] ${n.taskId}`,
          );
          console.log(`      ${n.relPath}`);
        }
        console.log("\n(dry run — not executing)\n");
        return;
      }

      // Actual full run — autonomousRun does its own snapping per iteration
      const result = await autonomousRun({
        projectDir,
        convergeConfig: options.convergeConfig,
        hookRegistry: options.hookRegistry,
        maxIterations: options.maxIterations,
        verbose: options.verbose,
        filter,
        force,
        resume: options.resume,
        restart: options.restart,
      });
      if (!result.completed) {
        process.exit(1);
      }
      return;
    }

    // ── Unblock mode (--step --unblock) ─────────────────────────────────
    if (options.unblock) {
      // Find first dependency-blocked task with a recorded needs.json
      let blockedTask: TaskNode | null = null;
      let needsJson: {
        blocked: boolean;
        blockedReason?: string;
        inputs: { pattern: string; count: number }[];
      } | null = null;

      // Candidates: dependency-blocked tasks + failed tasks that recorded blocked inputs
      const candidateNodes = tree.filter(
        (n) =>
          (states.blocked.has(n.journalTaskId) ||
            states.failed.has(n.journalTaskId)) &&
          !states.completed.has(n.journalTaskId),
      );
      for (const node of candidateNodes) {
        const nj = await readNeedsJson(projectDir, node);
        if (nj?.blocked) {
          blockedTask = node;
          needsJson = nj;
          break;
        }
      }

      if (!blockedTask || !needsJson) {
        console.log(
          "✅ No blocked tasks with recorded missing inputs found.\n",
        );
        return;
      }

      const missingInputs = needsJson.inputs
        .filter((i) => i.count === 0)
        .map((i) => i.pattern);
      const completedCount = tree.filter((n) =>
        states.completed.has(n.journalTaskId),
      ).length;
      const { plan } = calculateExecutionPlan(tree);
      console.log(
        `📍 Progress: ${completedCount}/${tree.length} tasks complete\n`,
      );
      printTaskTree(tree, states, blockedTask.journalTaskId, undefined, plan);
      console.log(`\n🔓 Unblocking: ${blockedTask.relPath}`);
      console.log(`   Reason: ${needsJson.blockedReason ?? "Missing inputs"}`);
      missingInputs.forEach((m) => console.log(`   Missing: ${m}`));

      if (options.dry) {
        console.log("\n(dry run — not executing)\n");
        return;
      }

      // Build Gap object matching the structure task-runner.ts uses
      const blockerGap: Gap = {
        id: `blocker-${blockedTask.journalTaskId}`,
        type: "missing-intermediate",
        level: "task",
        scope: blockedTask.journalTaskId,
        description: needsJson.blockedReason ?? "Missing required inputs",
        detected: new Date().toISOString(),
        resolved: false,
        checks: [],
        metadata: {
          gapKind: "blocker",
          missingInputs,
          blockedInputs: missingInputs,
          allMissingItems: missingInputs,
        },
      };

      // Build StrategyContext with AI support
      const timeline = new ExecutionTimeline(projectDir);
      const journalCtx = {
        epicId: blockedTask.epicId,
        taskId: blockedTask.journalTaskId,
      };
      const strategyCtx: StrategyContext = {
        projectDir,
        journalCtx,
        timeline,
        attempt: 1,
        ai: () => createAIContext(projectDir, journalCtx),
      };

      // Run UnblockStrategy — tries MissingInputPatternRepair, then DependencyBackoff, etc.
      console.log(
        "\n   🔧 Running UnblockStrategy (MissingInputPattern → DependencyBackoff → ...)",
      );
      const unblockResult = await new UnblockStrategy().tryFix(
        blockerGap,
        strategyCtx,
      );

      if (!unblockResult.success) {
        console.log(
          `\n⚠️  Could not find an unblocking path: ${unblockResult.reason}\n`,
        );
        return;
      }

      console.log(
        `\n   ✅ Strategy: ${unblockResult.metadata?.solvedBy ?? "unblock-coordinator"} — ${unblockResult.reason}`,
      );

      // If backoff retryMode → execute the identified producer tasks
      if (
        typeof unblockResult.retryMode === "object" &&
        unblockResult.retryMode.type === "backoff"
      ) {
        const producers = (unblockResult.metadata?.producers ?? []) as Array<{
          taskId: string;
          epicId: string;
          journalTaskId: string;
          filePath: string;
        }>;

        if (producers.length > 0) {
          const checkpointMgr = new CheckpointManager(projectDir);
          const sessionId = generateSessionId();
          const sessionLogger = new SessionLogger(
            projectDir,
            sessionId,
            options.convergeConfig!.name || "Unknown Project",
            { maxIterations: 1, maxAttemptsPerTask: 2 },
          );
          await sessionLogger.writeSessionStart();

          for (const producer of producers) {
            console.log(
              `\n   ▶  Executing producer: ${producer.epicId}/${producer.journalTaskId}`,
            );
            try {
              await executeTask(
                {
                  projectDir,
                  epicId: producer.epicId,
                  journalTaskId: producer.journalTaskId,
                  filePath: producer.filePath,
                  sessionLogger,
                  analyzeOnly: options.analyze || false,
                },
                checkpointMgr,
              );
            } catch (err: any) {
              console.warn(`   ⚠️  Producer failed: ${err.message}`);
            }
          }

          await sessionLogger.writeSessionEnd(
            {
              totalIterations: 1,
              tasksCompleted: producers.length,
              tasksFailed: 0,
              gapsResolved: 1,
              convergenceAchieved: true,
            },
            "complete",
          );
        }

        // Reset the unblocked task and all downstream failure-blocked tasks to pending
        const toReset = [
          blockedTask,
          // Any task that was failure-blocked (blocked due to a failed dependency)
          ...tree.filter(
            (n) =>
              n.journalTaskId !== blockedTask.journalTaskId &&
              states.blocked.has(n.journalTaskId) &&
              !states.completed.has(n.journalTaskId),
          ),
        ];
        for (const node of toReset) {
          const ckptPath = buildTaskCheckpointPath(projectDir, node);
          if (existsSync(ckptPath)) {
            await unlink(ckptPath);
            console.log(`   🔄 Reset to pending: ${node.journalTaskId}`);
          }
          // Also clean up any stray checkpoint written with wrong epicId (bug in markTaskFailed).
          // When journalTaskId is 'parent/child', markTaskFailed used to treat 'parent' as epicId,
          // creating a stray checkpoint at journal/tasks/{parent}/{child}/checkpoint.json.
          const strayPath = buildStrayCheckpointPath(projectDir, node);
          if (strayPath && existsSync(strayPath)) {
            await unlink(strayPath);
            console.log(
              `   🔄 Cleaned stray checkpoint: ${node.journalTaskId}`,
            );
          }
        }

        console.log(
          `\n✅ Producers executed. Run --step to execute the unblocked task: ${blockedTask.relPath}\n`,
        );
      } else {
        console.log(
          `\n✅ Unblocked (retryMode: ${JSON.stringify(unblockResult.retryMode)}). Run --step to continue.\n`,
        );
      }
      return;
    }

    // ── Step mode (--step and --step --dry share the same display) ────
    // Resolve the next task: if candidate is a WBS parent with pending children,
    // drill down recursively to the first pending leaf child.
    const rawNext = filteredNodes[0] ?? null;
    const next = rawNext
      ? resolveToLeafTask(rawNext, filteredNodes, states)
      : null;

    if (!next) {
      if (states.failed.size > 0) {
        console.log(
          `⚠️  No runnable tasks — ${states.failed.size} task(s) failed. Run --unblock to attempt repair.\n`,
        );
      } else if (states.blocked.size > 0) {
        console.log(
          `⚠️  No runnable tasks — ${states.blocked.size} task(s) blocked.\n`,
        );
      } else {
        console.log("✅ All tasks complete.\n");
      }
      return;
    }

    // Only count tasks that exist in the current tree (prevent 22/21 bug)
    const completedCount = tree.filter((n) =>
      completedIds.has(n.journalTaskId),
    ).length;
    const totalCount = tree.length;

    console.log(
      `📍 Progress: ${completedCount}/${totalCount} tasks complete\n`,
    );

    // Tree display — group by epic
    // In step mode, the next task is about to execute, so pass it as runningTaskId for visual consistency
    const { plan } = calculateExecutionPlan(tree);
    printTaskTree(
      tree,
      states,
      next.taskId,
      options.dry ? undefined : next.taskId,
      plan,
    );

    // Same header line for both dry and actual — only the verb differs
    console.log(
      `\n▶  ${options.dry ? "Would execute" : "Executing"}: ${next.relPath}`,
    );

    if (options.dry) {
      console.log("\n(dry run — not executing)\n");
      return;
    }

    console.log("");

    // Initialize session logger for step mode
    const sessionId = generateSessionId();
    const projectName = options.convergeConfig.name || "Unknown Project";
    const sessionLogger = new SessionLogger(
      projectDir,
      sessionId,
      projectName,
      {
        maxIterations: 1, // Step mode runs only one iteration
        maxAttemptsPerTask: 2,
      },
    );

    // Write session start
    await sessionLogger.writeSessionStart();
    await sessionLogger.writeIterationSnapshot({
      iteration: 1,
      timestamp: new Date().toISOString(),
      tasksComplete: completedCount,
      tasksTotal: totalCount,
      currentTask: {
        id: next.journalTaskId,
        epic: next.epicId,
        attempt: 1,
        status: "running",
      },
      gaps: [],
    });
    await sessionLogger.logTaskSelected(next.journalTaskId, next.epicId, 1);
    await sessionLogger.logTaskAttemptStart(next.journalTaskId, 1);

    // Setup cancellation handler for this session
    const cleanupSession = async (status: "error" | "cancelled") => {
      await sessionLogger.writeSessionEnd(
        {
          totalIterations: 1,
          tasksCompleted: 0,
          tasksFailed: 1,
          gapsResolved: 0,
          convergenceAchieved: false,
        },
        status,
      );
    };

    // Register cleanup handler
    process.once("SIGINT", async () => {
      const currentTask = (global as any).__CONVERGE_CURRENT_TASK__;
      if (currentTask) {
        try {
          await currentTask.unitCkpt.markInterrupted();
        } catch {
          /* best effort */
        }
      }
      await cleanupSession("cancelled");
      process.exit(130); // Standard exit code for SIGINT
    });
    process.once("SIGTERM", async () => {
      const currentTask = (global as any).__CONVERGE_CURRENT_TASK__;
      if (currentTask) {
        try {
          await currentTask.unitCkpt.markInterrupted();
        } catch {
          /* best effort */
        }
      }
      await cleanupSession("cancelled");
      process.exit(143); // Standard exit code for SIGTERM
    });

    try {
      // Execute task using centralized runner
      const checkpointMgr = new CheckpointManager(projectDir);
      const taskStartTime = Date.now();
      const result = await executeTask(
        {
          projectDir,
          epicId: next.epicId,
          journalTaskId: next.journalTaskId,
          filePath: next.filePath,
          journalPath: next.journalPath,
          sessionLogger, // Pass session logger for event bridging
          analyzeOnly: options.analyze || false,
          stepMode: true, // Enable step mode - don't skip containers, let them run
        },
        checkpointMgr,
      );
      const taskDuration = Date.now() - taskStartTime;

      // Log task completion
      await sessionLogger.logTaskAttemptComplete(
        next.journalTaskId,
        1,
        result.success,
        taskDuration,
      );
      await sessionLogger.logConvergence(next.journalTaskId, result.success);

      // Write session end
      await sessionLogger.writeSessionEnd(
        {
          totalIterations: 1,
          tasksCompleted: result.success ? 1 : 0,
          tasksFailed: result.success ? 0 : 1,
          gapsResolved: 0, // TODO: track from gap resolution pipeline
          convergenceAchieved: result.success,
        },
        result.success ? "complete" : "stalled",
      );

      // Display final status
      if (result.success) {
        if (result.isWbsTask) {
          console.log("");
        } else {
          console.log("\n✅ Step completed.\n");
        }
      } else {
        console.log("\n❌ Step did not converge.\n");
      }
    } catch (taskError: any) {
      // Ensure session is finalized on task execution error
      await sessionLogger.writeSessionEnd(
        {
          totalIterations: 1,
          tasksCompleted: 0,
          tasksFailed: 1,
          gapsResolved: 0,
          convergenceAchieved: false,
        },
        "error",
      );
      throw taskError; // Re-throw to be caught by outer catch
    }
  } catch (error: any) {
    console.error(`\n❌ Run failed: ${error.message}`);
    if (options.verbose) console.error(error.stack);
    process.exit(1);
  }
}

/**
 * Resolve a candidate task to the deepest executable leaf.
 *
 * Each level acts on its own scope:
 *   candidate has children → delegate to first runnable child (recursively)
 *   candidate has no runnable children → it is the leaf, execute it
 *
 * "Runnable" means: in pool AND not completed/failed/blocked.
 * This mirrors TreeNode.findNextTask() used by autonomous-run.
 */
function resolveToLeafTask(
  candidate: TaskNode,
  pool: TaskNode[],
  states: TaskStates,
): TaskNode {
  const runnableChildren = pool
    .filter(
      (n) =>
        (n.parentTaskId === candidate.journalTaskId ||
          n.parentTaskId === candidate.taskId) &&
        !states.completed.has(n.journalTaskId) &&
        !states.failed.has(n.journalTaskId) &&
        !states.blocked.has(n.journalTaskId),
    )
    .sort((a, b) => a.filePath.localeCompare(b.filePath));

  if (runnableChildren.length === 0) return candidate;
  return resolveToLeafTask(runnableChildren[0], pool, states);
}

/**
 * Read needs.json from the wip attempt directory for a task.
 * Returns null if the file doesn't exist or can't be parsed.
 */
async function readNeedsJson(
  projectDir: string,
  node: TaskNode,
): Promise<any | null> {
  // Build path: journal/tasks/{epicId}/{journalTaskId-segments-with-tasks}/attempts/wip/data/needs.json
  const segments = node.journalTaskId.split("/");
  const parts: string[] = [segments[0]];
  for (let i = 1; i < segments.length; i++) parts.push("tasks", segments[i]);
  const p = join(
    projectDir,
    ".converge",
    "journal",
    "epics",
    node.epicId,
    ...parts,
    "attempts",
    "wip",
    "data",
    "needs.json",
  );
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(await readFile(p, "utf-8"));
  } catch {
    return null;
  }
}

/**
 * Build the path to a task's checkpoint.json in the journal.
 */
function buildTaskCheckpointPath(projectDir: string, node: TaskNode): string {
  const segments = node.journalTaskId.split("/");

  // If journalTaskId starts with epicId (epic-level task children),
  // strip the prefix to avoid double-nesting
  const startIdx = segments[0] === node.epicId ? 1 : 0;
  const taskSegments = segments.slice(startIdx);

  const parts: string[] =
    taskSegments.length > 0 ? ["tasks", taskSegments[0]] : [];
  for (let i = 1; i < taskSegments.length; i++) {
    parts.push("tasks", taskSegments[i]);
  }

  return join(
    projectDir,
    ".converge",
    "journal",
    "epics",
    node.epicId,
    ...parts,
    "checkpoint.json",
  );
}

/**
 * Build the stray checkpoint path that markTaskFailed() used to create
 * when it incorrectly treated the first journalTaskId segment as epicId.
 * Only applicable for WBS children (journalTaskId has 2+ segments).
 */
function buildStrayCheckpointPath(
  projectDir: string,
  node: TaskNode,
): string | null {
  const segments = node.journalTaskId.split("/");
  if (segments.length < 2) return null; // root tasks: no stray possible
  // Wrong epicId = first segment of journalTaskId (e.g. '002-convert-designs-to-react')
  const wrongEpicId = segments[0];
  const taskSegment = segments[1]; // e.g. '002-002-convert-lesson-quiz'
  return join(
    projectDir,
    ".converge",
    "journal",
    "epics",
    wrongEpicId,
    taskSegment,
    "checkpoint.json",
  );
}

/* ------------------------------------------------------------------ */
/*  WBS-only mode (--wbs / --wbs --inc)                                */
/* ------------------------------------------------------------------ */

/**
 * Run only the WBS seeding phase for matching WBS parent tasks.
 *
 * --wbs [filter]       → errors if already seeded
 * --wbs --inc [filter] → clears wbs.json + checkpoint, then re-seeds
 */
async function runWbsOnly(options: AutoRunOptions): Promise<void> {
  const projectDir = options.dir || process.cwd();

  console.log("🔍 Discovering WBS tasks...\n");
  const taskTree = await TaskTree.load(projectDir, options.convergeConfig!);
  const tree = treeNodesToTaskNodes(taskTree, projectDir);
  // WBS-only mode: skip auto-complete — we only need seeded/completed status for gate checks
  const states = await getTaskStates(projectDir, tree, {
    skipAutoComplete: true,
  });

  // Filter to WBS parents only
  const filter = options.filter;
  const wbsNodes = tree.filter((n) => {
    if (!n.isWbsParent) return false;
    if (!filter) return true;
    // Match on taskId, journalTaskId, relPath, or filePath substring.
    // Users may pass a full path like ".converge/epics/06-wire-screens/tasks/002-wire-navigation".
    return (
      n.taskId === filter ||
      n.journalTaskId === filter ||
      n.relPath.includes(filter) ||
      n.filePath.includes(filter) ||
      filter.endsWith(n.taskId)
    );
  });

  if (wbsNodes.length === 0) {
    console.log(
      filter ? `No WBS tasks match filter "${filter}".` : "No WBS tasks found.",
    );
    return;
  }

  console.log(`Found ${wbsNodes.length} WBS parent(s):\n`);
  for (const n of wbsNodes) {
    console.log(`  • ${n.journalTaskId}  (${n.relPath})`);
  }
  console.log("");

  const checkpointMgr = new CheckpointManager(projectDir);

  for (const node of wbsNodes) {
    const structure = getJournalStructure(
      projectDir,
      node.epicId,
      node.journalTaskId,
    );
    const wbsJsonPath = structure.task
      ? join(structure.task, "wbs.json")
      : null;
    const alreadySeeded = wbsJsonPath ? existsSync(wbsJsonPath) : false;

    if (alreadySeeded && !options.inc) {
      let detail = "";
      try {
        const data = JSON.parse(await readFile(wbsJsonPath!, "utf-8"));
        detail = ` (${data.spawnCount} tasks)`;
      } catch {
        /* ignore */
      }
      console.error(
        `❌ ${node.journalTaskId}: already seeded${detail}. Use --inc to re-seed incrementally.`,
      );
      process.exit(1);
    }

    if (alreadySeeded && options.inc) {
      // Clear gate 2: delete wbs.json
      await unlink(wbsJsonPath!);
      console.log(`  ✓ ${node.journalTaskId}: deleted wbs.json`);

      // Clear gate 1: reset checkpoint from seeded/completed → pending
      try {
        await checkpointMgr.removeFromCompleted(
          node.journalTaskId,
          node.epicId,
        );
      } catch {
        /* ignore */
      }
      console.log(`  ✓ ${node.journalTaskId}: reset checkpoint to pending`);
    }

    // Execute WBS seeding
    console.log(`\n▶  Seeding: ${node.relPath}`);
    const sessionId = generateSessionId();
    const sessionLogger = new SessionLogger(
      projectDir,
      sessionId,
      options.convergeConfig?.name || "Project",
      { maxIterations: 1, maxAttemptsPerTask: 1 },
    );
    await sessionLogger.writeSessionStart();

    const result = await executeTask(
      {
        projectDir,
        epicId: node.epicId,
        journalTaskId: node.journalTaskId,
        filePath: node.filePath,
        sessionLogger,
      },
      checkpointMgr,
    );

    await sessionLogger.writeSessionEnd(
      {
        totalIterations: 1,
        tasksCompleted: result.success ? 1 : 0,
        tasksFailed: result.success ? 0 : 1,
        gapsResolved: 0,
        convergenceAchieved: result.success,
      },
      result.success ? "complete" : "stalled",
    );

    if (!result.success) {
      console.error(`\n❌ WBS seeding failed for ${node.journalTaskId}`);
      process.exit(1);
    }
  }

  console.log("\n✅ WBS seeding complete");
}
