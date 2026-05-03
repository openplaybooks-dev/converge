/**
 * Gantt Chart Command - Visual Execution Timeline
 *
 * Uses the new TaskTree API for traversal and dependency resolution.
 * Displays tasks in a Gantt-style timeline showing:
 * - Dependencies between tasks
 * - Projected execution order
 * - Blocked/ready status
 * - Task progress (completed/failed/pending)
 *
 * Hierarchy matches the tree command: epic-root nodes are merged into the
 * epic header, children keyed by journalTaskId, arbitrary nesting depth.
 */

import { resolve, basename } from "node:path";
import type { CommonOptions } from "./commands.ts";
import { TaskTree } from "@converge/core/dag/dag-tree.ts";
import type { TaskNode, TaskStates } from "./next-task.ts";
import {
  treeNodesToTaskNodes,
  calculateExecutionPlan,
  getTaskStates,
} from "./next-task.ts";
import { resolveConvergeConfig } from "@converge/core/config/loader.ts";
import { validateConvergeConfig } from "@converge/core/config/validator.ts";
import type { ConvergeConfig } from "@converge/core/config/types.ts";

export interface GanttOptions extends CommonOptions {
  /** Show only blocked tasks */
  onlyBlocked?: boolean;
  /** Show only ready (runnable) tasks */
  onlyReady?: boolean;
}

/**
 * Display tasks in Gantt chart format showing execution order and dependencies.
 */
export async function ganttCommand(options: GanttOptions = {}): Promise<void> {
  try {
    const projectDir = resolve(options.dir || process.cwd());

    // Resolve converge config (falls back to defaults for TASK.md-only projects)
    const resolved = await resolveConvergeConfig(projectDir);
    const convergeConfig = resolved
      ? validateConvergeConfig(resolved.config, resolved.configPath)
      : ({ name: basename(projectDir) } as ConvergeConfig);

    // Load tree using new TaskTree API
    const taskTree = await TaskTree.load(projectDir, convergeConfig);

    // Convert TreeNodes to legacy TaskNode format for display
    const tree = treeNodesToTaskNodes(taskTree, projectDir);

    // Calculate states — skip expensive auto-complete checks for read-only display
    const states = await getTaskStates(projectDir, tree, {
      skipAutoComplete: true,
    });

    if (tree.length === 0) {
      console.log("No tasks found. Run `converge init` to create a project.");
      return;
    }

    // Build execution plan (sequential index per leaf task, parents span children)
    const { plan, totalCount } = calculateExecutionPlan(tree);

    // Print header
    console.log("\n📊 Execution Timeline (Gantt View)\n");

    // Print legend
    printLegend();

    // Print hierarchical timeline
    printHierarchicalGantt(tree, states, plan, totalCount, options);

    // Print summary
    printSummary(tree, states);
  } catch (error: any) {
    console.error(`\n❌ Gantt command failed: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Print Gantt chart with hierarchical epic/task structure.
 * Mirrors the tree command's hierarchy logic.
 */
function printHierarchicalGantt(
  tree: TaskNode[],
  states: TaskStates,
  plan: Map<string, { startIndex: number; endIndex: number }>,
  totalCount: number,
  options: GanttOptions,
): void {
  const maxNameWidth = 40;
  const timelineWidth = Math.max(10, totalCount * 2 + 2);
  const col1 = maxNameWidth + 1;
  const col2 = timelineWidth;
  const topBorder = "┌" + "─".repeat(col1) + "┬" + "─".repeat(col2) + "┐";
  const midBorder = "├" + "─".repeat(col1) + "┼" + "─".repeat(col2) + "┤";
  const botBorder = "└" + "─".repeat(col1) + "┴" + "─".repeat(col2) + "┘";

  console.log(topBorder);
  console.log(
    "│ " +
      padRight("Task Hierarchy", maxNameWidth) +
      "│ " +
      padRight("Timeline", timelineWidth - 1) +
      "│",
  );
  console.log(midBorder);

  // Find next task to execute
  const nextNode = tree.find((n) => {
    if (
      states.completed.has(n.journalTaskId) ||
      states.failed.has(n.journalTaskId) ||
      states.blocked.has(n.journalTaskId)
    ) {
      return false;
    }
    if (states.locked.has(n.journalTaskId)) {
      const progress = states.wbsProgress.get(n.journalTaskId);
      return !progress || progress.spawnCount === 0;
    }
    return true;
  });

  // Group tasks by epic
  const epicMap = new Map<string, TaskNode[]>();
  for (const node of tree) {
    if (!epicMap.has(node.epicId)) epicMap.set(node.epicId, []);
    epicMap.get(node.epicId)!.push(node);
  }

  const epicIds = [...epicMap.keys()].sort((a, b) => {
    const aNum = parseInt(a.match(/^(\d+)/)?.[1] ?? "999", 10);
    const bNum = parseInt(b.match(/^(\d+)/)?.[1] ?? "999", 10);
    return aNum - bNum;
  });

  // Build children map keyed by journalTaskId (matches tree command)
  const childrenOf = new Map<string, TaskNode[]>();
  for (const node of tree) {
    if (node.parentTaskId) {
      if (!childrenOf.has(node.parentTaskId))
        childrenOf.set(node.parentTaskId, []);
      childrenOf.get(node.parentTaskId)!.push(node);
    }
  }

  // Recursive renderer for arbitrary depth
  const renderSubtree = (nodes: TaskNode[], prefix: string, tw: number) => {
    nodes.forEach((node, idx) => {
      const children = (childrenOf.get(node.journalTaskId) ?? []).sort((a, b) =>
        a.taskId.localeCompare(b.taskId),
      );
      const isLast = idx === nodes.length - 1;

      if (options.onlyBlocked && !states.failureBlocked.has(node.journalTaskId))
        return;
      if (
        options.onlyReady &&
        (states.completed.has(node.journalTaskId) ||
          states.failed.has(node.journalTaskId) ||
          states.blocked.has(node.journalTaskId))
      )
        return;

      const branch = isLast ? "└── " : "├── ";
      const childPrefix = prefix + (isLast ? "    " : "│   ");

      const status = getTaskStatus(node, states);
      const isNext = nextNode?.journalTaskId === node.journalTaskId;
      const span = plan.get(node.journalTaskId) ?? {
        startIndex: 1,
        endIndex: 1,
      };
      const nextMarker = isNext ? " ← next" : "";
      const taskName = padRight(
        prefix + branch + status.icon + " " + node.taskId + nextMarker,
        maxNameWidth,
      );
      const timeline = renderTimeline(
        span.startIndex,
        span.endIndex,
        status,
        tw,
      );

      console.log("│ " + taskName + "│ " + timeline + "│");

      if (children.length > 0) {
        renderSubtree(children, childPrefix, tw);
      }
    });
  };

  epicIds.forEach((epicId, epicIdx) => {
    const isLastEpic = epicIdx === epicIds.length - 1;
    const epicSpan = plan.get(epicId);

    const allEpicTasks = epicMap.get(epicId)!;

    // Detect epic-root task: a top-level task whose taskId matches the epicId
    // (same logic as tree command)
    const epicRootNode = allEpicTasks.find(
      (n) => !n.parentTaskId && n.taskId === epicId,
    );

    // Build epic folder suffix from the epic-root node's status
    let epicSuffix = "";
    if (epicRootNode) {
      const status = getTaskStatus(epicRootNode, states);
      if (status.label === "completed") epicSuffix = " ✓";
      else if (status.label === "failed") epicSuffix = " ✗";
      else if (status.label === "running") epicSuffix = " ⟳";
    }

    // Print epic header with its spanning bar
    const epicPrefix = isLastEpic ? "└── " : "├── ";
    const epicStatus = { icon: "", label: "epic" };
    const epicTimeline = epicSpan
      ? renderTimeline(
          epicSpan.startIndex,
          epicSpan.endIndex,
          epicStatus,
          timelineWidth - 1,
        )
      : padRight("", timelineWidth - 1);
    console.log(
      "│ " +
        padRight(epicPrefix + "📂 " + epicId + epicSuffix, maxNameWidth) +
        "│ " +
        epicTimeline +
        "│",
    );

    // Top-level tasks are those without a parentTaskId
    // Exclude the epic-root node (already shown on the epic folder line)
    const topLevel = allEpicTasks
      .filter((n) => !n.parentTaskId && n !== epicRootNode)
      .sort((a, b) => a.taskId.localeCompare(b.taskId));

    // If the epic-root was excluded, promote its children to top level
    if (epicRootNode) {
      const epicRootChildren = (
        childrenOf.get(epicRootNode.journalTaskId) ?? []
      ).sort((a, b) => a.taskId.localeCompare(b.taskId));
      topLevel.push(...epicRootChildren);
    }

    const epicChildPrefix = isLastEpic ? "    " : "│   ";

    renderSubtree(topLevel, epicChildPrefix, timelineWidth - 1);

    if (!isLastEpic) {
      console.log(
        "│ " +
          padRight("", maxNameWidth) +
          "│ " +
          padRight("", timelineWidth - 1) +
          "│",
      );
    }
  });

  console.log(botBorder);
}

/**
 * Get task status icon and label
 */
function getTaskStatus(
  node: TaskNode,
  states: TaskStates,
): { icon: string; label: string; color?: string } {
  if (states.completed.has(node.journalTaskId)) {
    return { icon: "✓", label: "completed", color: "green" };
  }
  if (states.failed.has(node.journalTaskId)) {
    return { icon: "✗", label: "failed", color: "red" };
  }
  if (states.failureBlocked.has(node.journalTaskId)) {
    return { icon: "🚫", label: "blocked", color: "gray" };
  }
  if (states.blocked.has(node.journalTaskId)) {
    return { icon: "○", label: "pending", color: "white" };
  }
  if (states.locked.has(node.journalTaskId)) {
    const progress = states.wbsProgress.get(node.journalTaskId);
    // Locked WITH spawned children = running (WBS parent with active children)
    if (progress && progress.spawnCount > 0) {
      return { icon: "⟳", label: "running", color: "yellow" };
    }
    // Locked but NO children = failed to spawn (should be pending/ready to retry)
    return { icon: "○", label: "pending", color: "white" };
  }
  return { icon: "○", label: "pending", color: "white" };
}

/**
 * Render timeline bar using execution plan indices (1-based).
 * Each index slot is 2 chars wide. Parent bars span all child slots.
 */
function renderTimeline(
  startIndex: number,
  endIndex: number,
  status: { icon: string; label: string },
  width: number,
): string {
  const startPos = (startIndex - 1) * 2;
  const barWidth = (endIndex - startIndex + 1) * 2;

  let barChar: string;
  if (status.label === "completed") barChar = "█";
  else if (status.label === "running") barChar = "▓";
  else if (status.label === "blocked") barChar = "░";
  else if (status.label === "failed") barChar = "▒";
  else if (status.label === "epic") barChar = "·";
  else barChar = "─";

  const bar = barChar.repeat(barWidth);
  const prefix = " ".repeat(startPos);
  const suffix = " ".repeat(Math.max(0, width - startPos - barWidth));

  return padRight(prefix + bar + suffix, width);
}

/**
 * Print legend explaining symbols
 */
function printLegend(): void {
  console.log("Legend:");
  console.log("  ✓ Completed    █ Done      ○ Pending    ─ Not started");
  console.log("  ✗ Failed       ▒ Error     ▶ Running    ▓ In progress");
  console.log("  🚫 Blocked (failed dep)    📌 Blocking task");
  console.log("");
}

/**
 * Print execution summary (counts only tree nodes, not all checkpoint entries)
 */
function printSummary(tree: TaskNode[], states: TaskStates): void {
  const total = tree.length;
  const completed = [...states.completed].filter((id) =>
    tree.some((n) => n.journalTaskId === id),
  ).length;
  const failed = [...states.failed].filter((id) =>
    tree.some((n) => n.journalTaskId === id),
  ).length;
  const blocked = [...states.failureBlocked].filter((id) =>
    tree.some((n) => n.journalTaskId === id),
  ).length;
  const ready = tree.filter((n) => {
    if (
      states.completed.has(n.journalTaskId) ||
      states.failed.has(n.journalTaskId) ||
      states.blocked.has(n.journalTaskId)
    ) {
      return false;
    }
    if (states.locked.has(n.journalTaskId)) {
      const progress = states.wbsProgress.get(n.journalTaskId);
      return !progress || progress.spawnCount === 0;
    }
    return true;
  }).length;

  console.log("\n📊 Summary:");
  console.log(`   Total Tasks: ${total}`);
  console.log(`   ✓ Completed: ${completed}`);
  console.log(`   ✗ Failed: ${failed}`);
  if (blocked > 0) console.log(`   🚫 Blocked: ${blocked}`);
  console.log(`   ▶ Ready: ${ready}`);
  console.log("");
}

/**
 * Pad string to the right with spaces
 */
function padRight(str: string, width: number): string {
  if (str.length >= width) return str.slice(0, width);
  return str + " ".repeat(width - str.length);
}
