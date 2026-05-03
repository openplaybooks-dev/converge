/**
 * Autonomous Run Command
 */

import type { CommonOptions } from "./commands.ts";
import type { ConvergeConfig } from "@converge/core/config/types.ts";
import type { HookRegistry } from "@converge/core/hooks/registry.ts";
import {
  treeNodesToTaskNodes,
  getTaskStates,
  calculateExecutionPlan,
} from "./next-task.ts";
import type { TaskNode, TaskStates } from "./next-task.ts";
import { TaskTree } from "@converge/core/dag/dag-tree.ts";
import { printTaskTree } from "./tree-display.ts";
import { autonomousRun, guardDirtySession } from "./autonomous-run.ts";
import { acquirePlaybookLock } from "./playbook-lock.ts";
import { TaskStateManager } from "@converge/core/checkpoint/state.ts";
import { executeTask } from "@converge/core/task/lifecycle/task-runner.ts";
import { ExecutionLogger, generateExecutionId } from "@converge/core/journal/execution-logger.ts";
import { getJournalStructure } from "@converge/core/journal/structure.ts";
import { UnblockStrategy } from "@converge/core/navigator/repair/strategies/unblock.ts";
import { ExecutionTimeline } from "@converge/core/navigator/repair/timeline.ts";
import type { Gap } from "@converge/core/gap/types.ts";
import type { StrategyContext } from "@converge/core/navigator/repair/types.ts";
import { createAIContext } from "@converge/core/ai/context.ts";
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

  /** Playbook run mode (resolved from playbook.yml) */
  mode?: "oneoff" | "converge" | "loop" | "dispatch";

  /** Resolved playbook (for converge/loop modes) */
  playbook?: import("../task/playbook/types.ts").ResolvedPlaybook;

  /** Stall configuration from playbook */
  stall?: { maxConsecutive?: number; backoffMs?: number };

  /** WBS-only mode — run only the WBS seeding phase */
  wbs?: boolean;

  /** Incremental re-seed — allow re-seeding already-seeded WBS parents */
  inc?: boolean;

  /** Force non-incremental execution; rebuild from scratch */
  fullRefresh?: boolean;

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

  /** Skip the pre-flight check linter (fail-open). */
  skipCheckLint?: boolean;

  /** Abort if cost preflight estimate exceeds vars.budget_cents. Default false (warn only). */
  budgetStrict?: boolean;

  /**
   * Optional path to an NDJSON file. When set, the runner emits one line
   * per state transition (iteration, task start/complete, gap, escalation)
   * so babysitters don't have to grep prose logs. Path is opened append.
   */
  eventsFile?: string;
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

    // ── DAG execution (ONLY path) ─────────────────────────────────────
    let playbookDir: string;
    let playbookName: string;

    if (options.playbook) {
      playbookDir = options.playbook.templateDir;
      playbookName = options.playbook.def.name;
    } else {
      // Auto-detect default playbook
      playbookName = "default";
      playbookDir = join(projectDir, ".converge", "playbooks", playbookName);
    }

    await (await import("./dag-run.js")).dagAutonomousRun({
      projectDir,
      playbookDir,
      playbookName,
      maxTaskAttempts: options.maxTaskAttempts ?? 2,
    });
    return;
  } catch (error: any) {
    console.error(`\n❌ Run failed: ${error.message}`);
    if (options.verbose) console.error(error.stack);
    process.exit(1);
  }
}

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

  const checkpointMgr = new TaskStateManager(projectDir);

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
        const ckpt = await checkpointMgr.load();
        if (ckpt) {
          ckpt.completedTasks = (ckpt.completedTasks ?? []).filter(
            (t) => t !== node.journalTaskId,
          );
          ckpt.lockedTasks = (ckpt.lockedTasks ?? []).filter(
            (t) => t !== node.journalTaskId,
          );
          await checkpointMgr.save(ckpt);
        }
      } catch {
        /* ignore */
      }
      console.log(`  ✓ ${node.journalTaskId}: reset checkpoint to pending`);
    }

    // Execute WBS seeding
    console.log(`\n▶  Seeding: ${node.relPath}`);
    const executionId = generateExecutionId();
    const executionLogger = new ExecutionLogger(
      projectDir,
      executionId,
      options.convergeConfig?.name || "Project",
      { maxIterations: 1, maxAttemptsPerTask: 1 },
    );
    await executionLogger.writeExecutionStart();

    const result = await executeTask(
      {
        projectDir,
        epicId: node.epicId,
        journalTaskId: node.journalTaskId,
        filePath: node.filePath,
        executionLogger,
      },
      checkpointMgr,
    );

    await executionLogger.writeExecutionEnd(
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

/* ------------------------------------------------------------------ */
/*  Check linter                                                       */
/* ------------------------------------------------------------------ */

/**
 * Walk the task tree and run the check linter against every static check.
 * Returns true if the run should abort.
 *
 * Lints only static checks — callback-form checks are skipped because we
 * can't safely invoke them outside a real task context.
 */
async function runCheckLint(taskTree: TaskTree): Promise<boolean> {
  const { lintChecks, formatLintReport } = await import(
    "@converge/core/task/playbook/check-linter.ts"
  );
  type CheckDef = import("@converge/core/task/lifecycle/after.ts").CheckDef;

  // Walk the tree and collect static checks per task.
  const tasks: Array<{
    taskId: string;
    checks?: CheckDef[];
    outputs?: string[];
  }> = [];
  for (const node of taskTree.getAllNodes()) {
    const unit = node.unit;
    if (!unit) continue;
    // Skip callback-form checks — we can't safely invoke them outside a real task context.
    if (typeof unit.checks === "function") continue;
    if (!Array.isArray(unit.checks)) continue;

    const staticChecks: CheckDef[] = [];
    for (const c of unit.checks) {
      if (typeof c === "function") continue;
      if (!c || !c.cmd) continue;
      staticChecks.push({
        id: String(c.id),
        cmd: String(c.cmd),
        description: c.description ? String(c.description) : String(c.id),
      });
    }
    if (staticChecks.length === 0) continue;

    tasks.push({
      taskId: unit.id,
      checks: staticChecks,
      outputs: unit.outputs,
    });
  }

  if (tasks.length === 0) return false;

  console.log(`🧪 Linting ${tasks.length} task(s) with checks...`);
  const report = await lintChecks(tasks);
  console.log(formatLintReport(report));

  if (report.hasErrors) {
    console.log("");
    console.log(
      "❌ Pre-flight check lint failed. Fix the broken check predicates above,",
    );
    console.log(
      "   or pass --skip-check-lint to run anyway (not recommended).",
    );
    return true;
  }
  return false;
}

async function runInputContractValidation(
  taskTree: TaskTree,
  projectDir: string,
): Promise<boolean> {
  const { validateInputContracts, formatInputContractReport } = await import(
    "@converge/core/task/playbook/input-contract.ts"
  );
  const report = await validateInputContracts(taskTree, projectDir);
  console.log(formatInputContractReport(report));
  if (report.hasErrors) {
    console.log("");
    console.log(
      "   Pass --skip-check-lint to run anyway (the runner will try gap resolution at runtime).",
    );
    return true;
  }
  return false;
}
