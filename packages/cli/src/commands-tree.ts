/**
 * Tree Command
 *
 * Uses the new TaskTree API for traversal instead of file scanning.
 * Displays hierarchical task structure with status indicators.
 */

import { resolve } from "node:path";
import path from "node:path";
import { TaskTree, JournalTree } from "@converge/core/task/tree/index.ts";
import type { TaskNode } from "./next-task.ts";
import { treeNodesToTaskNodes } from "./next-task.ts";
import { printTaskTree } from "./tree-display.ts";
import { calculateExecutionPlan, getTaskStates } from "./next-task.ts";
import type { ExecutionSpan } from "./next-task.ts";
import { resolveConvergeConfig } from "@converge/core/config/loader.ts";
import { validateConvergeConfig } from "@converge/core/config/validator.ts";
import { reconcile } from "./reconcile.ts";
import type { JournalNode } from "@converge/core/task/tree/journal-tree.ts";

export interface TreeCommandOptions {
  /** Override project directory (defaults to cwd) */
  root?: string;
  /** Filter to specific task or epic ID */
  filter?: string;
  /** Scope to a named playbook (only show tasks from that playbook) */
  playbook?: string;
  // legacy options kept for CLI compat — currently unused
  showPaths?: boolean;
  showDescriptions?: boolean;
  onlyIncomplete?: boolean;
  maxDepth?: number;
  noColor?: boolean;
  showCursor?: boolean;
  /** Show additional task metadata (title, skills, deps, inputs, outputs, tags) */
  detail?: boolean;
}

export async function treeCommand(
  options: TreeCommandOptions = {},
): Promise<void> {
  try {
    const projectDir = resolve(options.root || process.cwd());
    // Resolve converge config (provides discovery patterns)
    // Falls back to minimal defaults when PROJECT.md is absent (TASK.md-only projects)
    const resolved = await resolveConvergeConfig(projectDir);
    const convergeConfig = resolved
      ? validateConvergeConfig(resolved.config, resolved.configPath)
      : ({
          name: path.basename(projectDir),
        } as import("../config/types.ts").ConvergeConfig);

    // Run discovery once and reuse for both error checking and tree loading
    const { createDiscoveryScanner } = await import("../task/discovery/scanner.ts");
    const scanner = createDiscoveryScanner(
      convergeConfig.discovery || { epics: [], tasks: [] },
      projectDir,
    );
    const discoveryResult = await scanner.scan();

    if (discoveryResult.errors.length > 0) {
      console.error("\n❌ Discovery errors:");
      for (const { file, error } of discoveryResult.errors) {
        console.error(`  - ${file}: ${error}`);
      }
      console.error("\n💡 Fix these errors before viewing the task tree.\n");
      process.exit(1);
    }

    // 1. Load TaskTree (definitions) — pass pre-scanned discovery to avoid double scan
    const taskTree = await TaskTree.load(
      projectDir,
      convergeConfig,
      discoveryResult,
    );

    // 2. Load JournalTree (execution history)
    const journalTree = await JournalTree.load(projectDir);

    // 3. Convert to TaskNode[] and augment with journal data
    const tree = treeNodesToTaskNodes(taskTree, projectDir);

    // Augment each node with journal status/attempts/journalNode
    for (const node of tree) {
      const journalPath = node.filePath.replace("/epics/", "/journal/tasks/");
      const journalNode = journalTree.getNodeByPath(journalPath);

      node.journalPath = journalPath;

      if (journalNode && journalNode.type === "task") {
        const jStatus = journalNode.status;
        node.status =
          jStatus === "interrupted"
            ? "failed"
            : jStatus === "partial"
              ? "running"
              : jStatus;
        node.attempts = journalNode.task?.totalAttempts || 0;
        node.journalNode = journalNode;
      }
    }

    if (tree.length === 0) {
      console.log("No tasks found. Run `converge init` to create a project.");
      return;
    }

    // Scope to a playbook BEFORE computing state, so checkpoint entries from
    // sibling playbooks don't bleed into the scoped view via colliding task ids
    // (e.g. both `create-api` and `integrate-web-api` define `01-foundation`).
    const playbookScope = options.playbook || process.env.CONVERGE_PLAYBOOK;
    let filteredTree = tree;
    if (playbookScope) {
      const needle = `${path.sep}playbooks${path.sep}${playbookScope}${path.sep}`;
      const needlePosix = `/playbooks/${playbookScope}/`;
      filteredTree = tree.filter(
        (n) => n.filePath.includes(needle) || n.filePath.includes(needlePosix),
      );
      if (filteredTree.length === 0) {
        console.log(
          `\n⚠️  No tasks found for playbook "${playbookScope}".\n`,
        );
        const available = [
          ...new Set(
            tree
              .map((n) => {
                const m = n.filePath.match(/[\\/]playbooks[\\/]([^\\/]+)[\\/]/);
                return m?.[1];
              })
              .filter((s): s is string => Boolean(s)),
          ),
        ].sort();
        if (available.length > 0) {
          console.log("Available playbooks:");
          available.forEach((p) => console.log(`  - ${p}`));
        }
        return;
      }
    }

    // Calculate states on the scoped tree — skip expensive auto-complete checks
    // for read-only tree display. Scoping first keeps cross-playbook id collisions
    // from polluting blocked/failed/completed sets.
    const states = await getTaskStates(projectDir, filteredTree, {
      skipAutoComplete: true,
    });

    // Apply filter if provided
    if (options.filter) {
      filteredTree = filterTaskTree(filteredTree, options.filter);
      if (filteredTree.length === 0) {
        console.log(
          `\n⚠️  No tasks found matching filter: "${options.filter}"\n`,
        );
        console.log("Available task IDs:");
        const uniqueTaskIds = [
          ...new Set(tree.map((n) => n.taskId).filter(Boolean)),
        ].sort();
        uniqueTaskIds.forEach((id) => console.log(`  - ${id}`));
        console.log("\nAvailable epic IDs:");
        const uniqueEpicIds = [
          ...new Set(tree.map((n) => n.epicId).filter(Boolean)),
        ].sort();
        uniqueEpicIds.forEach((id) => console.log(`  - ${id}`));
        return;
      }
    }

    const totalCount = filteredTree.length;

    // Count running tasks using cached filesystem status (single scan)
    const { FilesystemTaskStatus } =
      await import("../checkpoint/filesystem-status.ts");
    const fsStatus = new FilesystemTaskStatus(projectDir);
    const statusMap = fsStatus.getStatusMap();

    // Count each status by checking each task node against state sets
    let completedCount = 0;
    let failedCount = 0;
    let blockedCount = 0;
    let runningCount = 0;
    for (const node of filteredTree) {
      const jid = node.journalTaskId;
      const qualifiedId = `${node.epicId}/${jid}`;
      if (states.completed.has(jid)) {
        completedCount++;
      } else if (states.failed.has(jid)) {
        failedCount++;
      } else if (states.failureBlocked.has(jid)) {
        blockedCount++;
      } else if (
        statusMap.get(qualifiedId) === "running" ||
        statusMap.get(jid) === "running"
      ) {
        runningCount++;
      }
    }
    const pendingCount =
      totalCount - completedCount - failedCount - blockedCount - runningCount;

    const parts = [
      `📊 Tasks: ${totalCount}  Completed: ${completedCount}  Running: ${runningCount}  Failed: ${failedCount}`,
    ];
    if (pendingCount > 0) parts.push(`Pending: ${pendingCount}`);
    if (blockedCount > 0) parts.push(`Blocked: ${blockedCount}`);
    console.log(parts.join("  ") + "\n");

    // Find currently running task using cached status map
    const runningNode = findRunningTaskFromStatusMap(filteredTree, statusMap);

    // Find next pending task (same logic as run --step)
    // Skip tasks that are completed, failed, blocked, OR currently running
    const nextNode = filteredTree.find((n) => {
      if (states.completed.has(n.journalTaskId)) return false;
      if (states.failed.has(n.journalTaskId)) return false;
      if (states.blocked.has(n.journalTaskId)) return false;
      // Skip seeded/locked WBS parents that have spawned children (same logic as commands-run.ts)
      if (states.locked.has(n.journalTaskId)) {
        const progress = states.wbsProgress.get(n.journalTaskId);
        if (progress && progress.spawnCount > 0) return false;
      }
      // Skip if this task is the currently running parent (WBS tasks stay "running" while children execute)
      if (runningNode && n.journalTaskId === runningNode.journalTaskId)
        return false;
      return true;
    });

    const { plan } = calculateExecutionPlan(filteredTree);
    printTaskTree(
      filteredTree,
      states,
      nextNode?.journalTaskId ?? "",
      runningNode?.journalTaskId,
      plan,
      options.detail,
    );

    if (runningNode && runningNode.taskId === nextNode?.taskId) {
      // Running task is also the next pending task (common case)
      console.log(
        `\n⟳  Currently executing: ${formatNextLabel(nextNode, plan, filteredTree)}`,
      );
    } else if (runningNode) {
      // Running task is a parent WBS task, show both parent and next child
      console.log(
        `\n⟳  Parent task executing: ${formatNextLabel(runningNode, plan, filteredTree)}`,
      );
      if (nextNode) {
        console.log(
          `   Next subtask: ${formatNextLabel(nextNode, plan, filteredTree)}  ▶`,
        );
      }
    } else if (nextNode) {
      console.log(
        `\nNext pending: ${formatNextLabel(nextNode, plan, filteredTree)}  ▶`,
      );
    } else if (failedCount > 0) {
      // Use scoped failedCount, not states.failed.size — the latter may include
      // stale/global checkpoint entries even after getTaskStates is restricted.
      console.log(
        `\n⚠️  No runnable tasks — ${failedCount} task(s) failed. Run --unblock to attempt repair.`,
      );
    } else if (blockedCount > 0) {
      console.log(
        `\n⚠️  No runnable tasks — ${blockedCount} task(s) blocked.`,
      );
    } else {
      console.log("\n✅ All tasks complete.");
    }
  } catch (error: any) {
    console.error(`\n❌ Tree command failed: ${error.message}`);
    if (process.env.CONVERGE_DEBUG || process.env.CONVERGE_DEBUG_DEPS) {
      console.error("Stack trace:", error.stack);
    }
    process.exit(1);
  }
}

/**
 * Format a human-friendly label for the "Next pending" / "Currently executing" lines.
 * Shows execution index range and parent/child task IDs instead of raw file paths.
 */
function formatNextLabel(
  node: TaskNode,
  plan: Map<string, ExecutionSpan>,
  tree: TaskNode[],
): string {
  const span = plan.get(node.journalTaskId);
  const indexLabel = span
    ? span.startIndex === span.endIndex
      ? `${span.startIndex}.`
      : `${span.startIndex}-${span.endIndex}.`
    : "";

  let label: string;
  if (node.parentTaskId) {
    const parentNode = tree.find((n) => n.journalTaskId === node.parentTaskId);
    const parentLabel = parentNode
      ? parentNode.taskId
      : node.parentTaskId.split("/").pop()!;
    label = `${parentLabel} / ${node.taskId}`;
  } else {
    label = node.taskId;
  }

  return `${indexLabel} ${label}`;
}

/**
 * Filter task tree by task ID, epic ID, or parent task ID.
 * Includes:
 * - Exact match on taskId
 * - Exact match on epicId (shows all tasks in epic)
 * - All WBS subtasks if matched task is a WBS parent (based on file path nesting)
 */
function filterTaskTree(tree: TaskNode[], filter: string): TaskNode[] {
  const matchedTaskIds = new Set<string>();
  const matchedFilePaths = new Set<string>();

  // First pass: find direct matches (by taskId or epicId)
  for (const node of tree) {
    if (node.taskId === filter || node.epicId === filter) {
      matchedTaskIds.add(node.taskId);
      matchedFilePaths.add(node.filePath);
    }
  }

  // Second pass: include WBS subtasks by checking file path nesting
  // WBS subtasks are located under the parent task's directory
  // e.g., parent: .../002-generate-screen-prompts/task.ts
  //       child:  .../002-generate-screen-prompts/002-001-prompt-home-lesson-tree/SKILL.md
  for (const node of tree) {
    // Check if this task's path is nested under any matched task's directory
    for (const matchedPath of matchedFilePaths) {
      const matchedDir = path.dirname(matchedPath);
      if (
        node.filePath.startsWith(matchedDir + path.sep) &&
        node.filePath !== matchedPath
      ) {
        matchedTaskIds.add(node.taskId);
        break;
      }
    }

    // Also check if parentTaskId is set and matches (for /task/ pattern)
    if (node.parentTaskId && matchedTaskIds.has(node.parentTaskId)) {
      matchedTaskIds.add(node.taskId);
    }
  }

  return tree.filter((n) => matchedTaskIds.has(n.taskId));
}

/**
 * Find the currently running task using a pre-computed status map.
 * O(n) scan with O(1) per-node lookups instead of n filesystem reads.
 */
function findRunningTaskFromStatusMap(
  tree: TaskNode[],
  statusMap: Map<string, string>,
): TaskNode | null {
  for (const node of tree) {
    const qualifiedId = `${node.epicId}/${node.journalTaskId}`;
    if (
      statusMap.get(qualifiedId) === "running" ||
      statusMap.get(node.journalTaskId) === "running"
    ) {
      return node;
    }
  }
  return null;
}
