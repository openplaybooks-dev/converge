/**
 * Tree Command
 *
 * Uses the new TaskTree API for traversal instead of file scanning.
 * Displays hierarchical task structure with status indicators.
 */

import { resolve, join } from "node:path";
import path from "node:path";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { TaskTree } from "@openplaybooks/converge-core/dag"
import type { TaskNode } from "./next-task.ts";
import { treeNodesToTaskNodes } from "./next-task.ts";
import { printTaskTree } from "./tree-display.ts";
import { calculateExecutionPlan, getTaskStates } from "./next-task.ts";
import type { ExecutionSpan } from "./next-task.ts";
import { resolveConvergeConfig } from "@openplaybooks/converge-core/config";
import { validateConvergeConfig } from "@openplaybooks/converge-core/config";

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
    const { createDiscoveryScanner } = await import("@openplaybooks/converge-core/task/discovery/scanner");
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

    // 2. Load runstate from target directory for status augmentation
    const runstateNodes = loadRunstateNodes(projectDir);

    // 3. Convert to TaskNode[] and augment with journal data
    const tree = treeNodesToTaskNodes(taskTree, projectDir);

    // Augment each node with runstate status/attempts
    for (const node of tree) {
      node.journalPath = "";
      const rs = runstateNodes.get(node.journalTaskId) || runstateNodes.get(node.taskId);
      if (rs) {
        node.status = rs.status === "pass" ? "complete" : rs.status === "error" ? "failed" : rs.status;
        node.attempts = rs.attempts || 0;
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
        console.log("\nAvailable groups:");
        const uniqueEpicIds = [
          ...new Set(tree.map((n) => n.epicId).filter(Boolean)),
        ].sort();
        uniqueEpicIds.forEach((id) => console.log(`  - ${id}`));
        return;
      }
    }

    const totalCount = filteredTree.length;

    // Count running tasks using cached filesystem state (single scan)
    const { FileSystemStateReader } =
      await import("@openplaybooks/converge-core/checkpoint");
    const fsState = new FileSystemStateReader(projectDir);
    const statusMap = fsState.getStatusMap();

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
      // Skip seeded/locked Seed parents that have spawned children (same logic as commands-run.ts)
      if (states.locked.has(n.journalTaskId)) {
        const progress = states.seedProgress.get(n.journalTaskId);
        if (progress && progress.spawnCount > 0) return false;
      }
      // Skip if this task is the currently running parent (Seed tasks stay "running" while children execute)
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
      // Running task is a parent Seed task, show both parent and next child
      console.log(
        `\n⟳  Parent task executing: ${formatNextLabel(runningNode, plan, filteredTree)}`,
      );
      if (nextNode) {
        console.log(
          `   Next subtask: ${formatNextLabel(nextNode, plan, filteredTree)}  ▶`,
        );
      }
    } else if (
      nextNode &&
      completedCount + failedCount + blockedCount + runningCount < totalCount
    ) {
      // Suppress "Next pending" when every task is accounted for elsewhere —
      // otherwise a stale tree-walker hit shows phantom pending work after
      // the run has actually completed.
      console.log(
        `\nNext pending: ${formatNextLabel(nextNode, plan, filteredTree)}  ▶`,
      );
    } else if (completedCount === totalCount && totalCount > 0) {
      console.log(`\n✅ All tasks complete.`);
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
 * - All Seed subtasks if matched task is a Seed parent (based on file path nesting)
 */
function filterTaskTree(tree: TaskNode[], filter: string): TaskNode[] {
  // Use journalTaskId (globally unique) for set membership, not taskId
  // (which can collide across phases like `01-foo` and `02-foo/01-foo`).
  const matchedJournalIds = new Set<string>();
  const matchedFilePaths = new Set<string>();

  // Helper: resolve a node's task directory (filePath may be a file like
  // `.../TASK.md` or already a directory).
  const taskDirOf = (fp: string): string => {
    if (/\.(md|ts|tsx|js|jsx|yml|yaml)$/.test(fp)) {
      return path.dirname(fp);
    }
    return fp;
  };

  // First pass: find direct matches (by taskId, epicId, or journalTaskId).
  for (const node of tree) {
    if (
      node.taskId === filter ||
      node.epicId === filter ||
      node.journalTaskId === filter
    ) {
      matchedJournalIds.add(node.journalTaskId);
      matchedFilePaths.add(node.filePath);
    }
  }

  // Second pass: include descendants by either:
  //   (a) Hierarchical journalTaskId — `<parent>/...` matches `<parent>` (most reliable).
  //   (b) File path nested under the matched node's task dir (fallback for non-Seed).
  // Loop until no new descendants are added (handles multi-level chains).
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of tree) {
      if (matchedJournalIds.has(node.journalTaskId)) continue;

      // (a) journalTaskId hierarchy
      let added = false;
      for (const matchedJid of matchedJournalIds) {
        if (node.journalTaskId.startsWith(matchedJid + "/")) {
          matchedJournalIds.add(node.journalTaskId);
          matchedFilePaths.add(node.filePath);
          changed = true;
          added = true;
          break;
        }
      }
      if (added) continue;

      // (b) file path nested under matched task's own directory
      for (const matchedPath of matchedFilePaths) {
        const matchedTaskDir = taskDirOf(matchedPath);
        if (
          node.filePath.startsWith(matchedTaskDir + path.sep) &&
          node.filePath !== matchedPath
        ) {
          matchedJournalIds.add(node.journalTaskId);
          matchedFilePaths.add(node.filePath);
          changed = true;
          break;
        }
      }
    }
  }

  return tree.filter((n) => matchedJournalIds.has(n.journalTaskId));
}

/**
 * Find the currently running task using a pre-computed status map.
 * O(n) scan with O(1) per-node lookups instead of n filesystem reads.
 */
/** Load runstate nodes from target/ and journal/ runstate.json files. */
function loadRunstateNodes(projectDir: string): Map<string, { status: string; attempts: number }> {
  const map = new Map<string, { status: string; attempts: number }>();
  const roots = [
    join(projectDir, ".converge", "target"),
    join(projectDir, ".converge", "journal"),
  ];

  for (const root of roots) {
    if (!existsSync(root)) continue;
    try {
      for (const pb of readdirSync(root, { withFileTypes: true })) {
        if (!pb.isDirectory()) continue;
        const p = join(root, pb.name, "runstate.json");
        if (!existsSync(p)) continue;
        const rs = JSON.parse(readFileSync(p, "utf-8"));
        for (const [id, n] of Object.entries<any>(rs.dag?.nodes ?? {})) {
          map.set(id, { status: n.status ?? "pending", attempts: n.attempts ?? 0 });
        }
      }
    } catch { /* no runstate yet */ }
  }
  return map;
}

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
