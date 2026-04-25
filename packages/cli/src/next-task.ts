/**
 * Stateless "find next task" logic.
 *
 * Three-phase flow — re-computable from the filesystem at any time:
 *   1. buildTaskTree()       → sorted flat list of TaskNode[]
 *   2. getCompletedTaskIds() → Set<string> from checkpoint + journal status.json
 *   3. findNextTask()        → first TaskNode not yet complete
 *
 * Both --step and --step --dry use the same function so they're always in sync.
 */

import {
  existsSync,
  readdirSync as fsReaddirSync,
  statSync as fsStatSync,
  readFileSync as fsReadFileSync,
} from "node:fs";
import path from "node:path";
import { CheckpointManager } from "@converge/core/checkpoint/manager.ts";
import { TaskCheckpointManager } from "@converge/core/checkpoint/task-checkpoint.ts";
import { UnitCheckpointManager } from "@converge/core/checkpoint/unit-checkpoint.ts";
import {
  constructJournalPath,
  extractJournalTaskId,
} from "@converge/core/task/unit/path-utils.ts";
import { Unit } from "@converge/core/task/unit/index.ts";
import { pathExists } from "@converge/core/task/unit/helpers.ts";
import { check as checkCmd } from "@converge/core/task/facts/api.ts";
import { resolveChecks as resolveChecksForUnit } from "@converge/core/task/unit/resolve.ts";
import type { TaskTree } from "@converge/core/task/tree/index.ts";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface TaskNode {
  /** e.g. "01-data-analysis-schema-design" */
  epicId: string;
  /** Leaf task ID, e.g. "001-analyze-google-sheets-data" */
  taskId: string;
  /** Absolute path to TASK.md */
  filePath: string;
  /** Relative path from projectDir for display */
  relPath: string;
  /**
   * taskId of the parent task when this is a WBS subtask.
   * e.g. "003-generate-screens" for "003-001-generate-dashboard"
   */
  parentTaskId?: string;
  /**
   * Slash-separated ID used for checkpoint keys.
   * Equals `parentTaskId/taskId` for WBS subtasks, `taskId` otherwise.
   */
  journalTaskId: string;
  /**
   * Absolute journal directory for this task.
   * Derived directly from filePath via constructJournalPath — no reconstruction.
   */
  journalPath: string;
  /** Whether this task is a blocker (must complete successfully) */
  blocking?: boolean;
  /** Task IDs or "tag:*" patterns this task depends on */
  dependencies?: string[];
  /** Tags extracted from task definition for dependency reference */
  tags?: string[];
  /** Human-readable title from task definition */
  title?: string;
  /** Task description from task definition */
  description?: string;
  /** Input files/artifacts this task requires */
  inputs?: string[];
  /** Output files/artifacts this task produces */
  outputs?: string[];
  /** Skills used by this task */
  skills?: string[];
  /** Whether this task is a WBS parent (has wbs: config) */
  isWbsParent?: boolean;
  /** Execution status from journal (optional, added when wiring trees) */
  status?: "pending" | "running" | "complete" | "failed" | "seeded";
  /** Number of execution attempts from journal (optional, added when wiring trees) */
  attempts?: number;
  /** Linked journal node (optional, added when wiring trees) */
  journalNode?: any; // JournalNode type
}

/**
 * Build a synthetic TaskNode for a virtual parent that exists only in the
 * journal hierarchy (no TASK.md on disk). Borrows epicId/filePath from a
 * known child so downstream code that checks file paths still has something
 * sensible to look at.
 */
function makeVirtualTaskNode(
  journalTaskId: string,
  epicId: string,
  refChild: TaskNode,
): TaskNode {
  const taskId = journalTaskId.split("/").pop() || journalTaskId;
  const parentTaskId = journalTaskId.includes("/")
    ? journalTaskId.split("/").slice(0, -1).join("/")
    : undefined;
  return {
    epicId,
    taskId,
    filePath: refChild.filePath, // best effort — not used for virtual nodes
    relPath: refChild.relPath,
    parentTaskId: parentTaskId === epicId ? undefined : parentTaskId,
    journalTaskId,
    journalPath: refChild.journalPath,
    blocking: false,
    dependencies: undefined,
    tags: ["virtual-parent"],
    title: undefined,
    description: undefined,
    inputs: undefined,
    outputs: undefined,
    skills: undefined,
    isWbsParent: true,
  };
}

/* ------------------------------------------------------------------ */
/*  TaskTree → TaskNode[] converter                                    */
/* ------------------------------------------------------------------ */

/**
 * Convert a TaskTree (new API) into the legacy TaskNode[] format.
 *
 * Used by tree, gantt, and run commands so they all share the same
 * conversion logic and produce consistent task lists.
 */
export function treeNodesToTaskNodes(
  taskTree: TaskTree,
  projectDir: string,
): TaskNode[] {
  return taskTree.getAllNodes().map((node) => {
    const epicId = node.epicId || "unknown";

    // Derive parentTaskId from journalTaskId structure.
    // journalTaskId format: "epicId/taskId" for epic-root children,
    //                       "epicId/parentTask/childTask" for WBS subtasks.
    // parentTaskId should be undefined for top-level tasks within an epic
    // (where the parent portion is just the epicId itself).
    let parentTaskId: string | undefined;
    if (node.id.includes("/")) {
      const parentPortion = node.id.split("/").slice(0, -1).join("/");
      // If parent portion is just the epicId, this is a top-level epic task
      if (parentPortion !== epicId) {
        parentTaskId = parentPortion;
      }
    }

    return {
      epicId,
      taskId: node.id.split("/").pop() || node.id,
      filePath: node.unit.path,
      relPath: node.unit.path.replace(projectDir + "/", ""),
      parentTaskId,
      journalTaskId: node.id,
      journalPath: constructJournalPath(node.unit.path),
      blocking: node.blocking,
      dependencies: node.unit.dependencies,
      tags: node.tags,
      title: node.unit.title,
      description: node.unit.description,
      inputs: node.unit.inputs,
      outputs: node.unit.outputs,
      skills: Array.isArray(node.unit.skill)
        ? node.unit.skill
        : node.unit.skill
          ? [node.unit.skill]
          : undefined,
      isWbsParent: node.isWbsParent || undefined,
    };
  });
}

/* ------------------------------------------------------------------ */
/*  Phase 1 — Build task tree                                          */
/* ------------------------------------------------------------------ */

/**
 * Build a sorted, flat task tree from discovered epics + tasks.
 * Order matches what `converge run --step` actually executes.
 * Loads blocking status from task definitions (TASK.md).
 */
export async function buildTaskTree(
  epics: Array<{ filePath: string }>,
  tasks: Array<{ filePath: string }>,
  projectDir: string,
): Promise<TaskNode[]> {
  const sortedEpics = [...epics].sort((a, b) =>
    a.filePath.localeCompare(b.filePath),
  );
  const result: TaskNode[] = [];

  for (const epic of sortedEpics) {
    const epicDir = path.dirname(epic.filePath);
    const epicId = path.basename(epicDir);

    const epicTasks = tasks
      .filter((t) => t.filePath.startsWith(epicDir))
      .sort((a, b) => a.filePath.localeCompare(b.filePath));

    for (const task of epicTasks) {
      const taskDir = path.dirname(task.filePath);
      const taskId = path.basename(taskDir);

      // Derive journal task ID from the file path (source of truth — no regex reconstruction).
      const journalTaskId = extractJournalTaskId(taskDir);

      // Detect parent for display/dependency purposes only.
      const parentTaskId = journalTaskId.includes("/")
        ? journalTaskId.split("/").slice(0, -1).join("/")
        : undefined;

      // Journal path mirrors task definition path exactly: insert 'journal/' before 'epics/'.
      const journalPath = constructJournalPath(task.filePath);

      // Load blocking status, dependencies, and tags from task definition
      let blocking = true; // Default to blocking
      let dependencies: string[] | undefined;
      let tags: string[] | undefined;
      try {
        const unit = await Unit.fromPath(task.filePath);
        blocking = unit.blocking !== false;
        dependencies = unit.dependencies;
        tags = unit.tags;

        if (process.env.CONVERGE_DEBUG_DEPS === "true") {
          console.log(
            `📦 Loaded ${taskId}: blocking=${blocking}, dependencies=${JSON.stringify(dependencies)}, tags=${JSON.stringify(tags)}`,
          );
        }
      } catch (err) {
        // If task definition cannot be loaded, skip it entirely
        // (it's not a valid task - likely a directory without TASK.md)
        console.warn(`⚠️  Failed to load ${taskId}: ${(err as Error).message}`);
        continue; // Skip this invalid task
      }

      result.push({
        epicId,
        taskId,
        filePath: task.filePath,
        relPath: path.relative(projectDir, task.filePath),
        parentTaskId,
        journalTaskId,
        journalPath,
        blocking,
        dependencies,
        tags,
      });
    }
  }

  // Append orphaned tasks (not under any epic)
  const epicDirs = new Set(sortedEpics.map((e) => path.dirname(e.filePath)));
  const orphans = tasks
    .filter((t) => ![...epicDirs].some((d) => t.filePath.startsWith(d)))
    .sort((a, b) => a.filePath.localeCompare(b.filePath));

  for (const task of orphans) {
    const taskDir = path.dirname(task.filePath);
    const taskId = path.basename(taskDir);

    // Try to infer epic from path pattern .converge/epics/{epicId}/...
    // This handles dynamically spawned WBS subtasks that may not be matched by the epic filter above
    const epicMatch = task.filePath.match(/\.converge[/\\]epics[/\\]([^/\\]+)/);
    const inferredEpicId = epicMatch ? epicMatch[1] : "standalone";

    // Derive journalTaskId and parentTaskId using the same logic as the epic case.
    // extractJournalTaskId strips 'tasks/' markers and prepends the epicId when the
    // first segment after the epic folder is 'tasks/', producing hierarchical IDs like
    // "03-build-screens/001-skill-tree" and "03-build-screens/001-skill-tree/001-01-prompt".
    let journalTaskId: string;
    let parentTaskId: string | undefined;

    if (inferredEpicId !== "standalone") {
      try {
        journalTaskId = extractJournalTaskId(taskDir);
      } catch {
        journalTaskId = taskId;
      }
      parentTaskId = journalTaskId.includes("/")
        ? journalTaskId.split("/").slice(0, -1).join("/")
        : undefined;
    } else {
      journalTaskId = taskId;
    }

    // Load blocking status, dependencies, and tags from task definition
    let blocking = true; // Default to blocking
    let dependencies: string[] | undefined;
    let tags: string[] | undefined;
    try {
      const unit = await Unit.fromPath(task.filePath);
      blocking = unit.blocking !== false;
      dependencies = unit.dependencies;
      tags = unit.tags;

      if (process.env.CONVERGE_DEBUG_DEPS === "true" && dependencies) {
        console.log(
          `📦 Loaded ${taskId}: dependencies=${JSON.stringify(dependencies)}, tags=${JSON.stringify(tags)}`,
        );
      }
    } catch (err) {
      // Ignore errors loading task definition - blocking defaults to true
      if (process.env.CONVERGE_DEBUG_DEPS === "true") {
        console.warn(`⚠️  Failed to load ${taskId}: ${(err as Error).message}`);
      }
    }

    result.push({
      epicId: inferredEpicId,
      taskId,
      filePath: task.filePath,
      relPath: path.relative(projectDir, task.filePath),
      parentTaskId,
      journalTaskId,
      journalPath: constructJournalPath(task.filePath),
      blocking,
      dependencies,
      tags,
    });
  }

  return result;
}

/* ------------------------------------------------------------------ */
/*  Phase 2 — Detect completed tasks                                   */
/* ------------------------------------------------------------------ */

export interface WbsProgress {
  /** Whether the parent task has seeded its subtasks */
  seeded: boolean;
  seededAt?: string;
  /** Total subtasks spawned */
  spawnCount: number;
  /** How many subtasks are complete */
  completedSubtasks: number;
  /** How many subtasks failed */
  failedSubtasks: number;
  /** All spawned subtask IDs (leaf taskId, not journalTaskId) */
  subtaskIds: string[];
}

export interface TaskStates {
  completed: Set<string>;
  failed: Set<string>;
  /** Seeded WBS parents — locked (won't re-run) but not yet complete */
  seeded: Set<string>;
  locked: Set<string>;
  /**
   * WBS progress for parent tasks — keyed by the parent's journalTaskId.
   * Only present for tasks that have a wbs.json in their journal directory.
   */
  wbsProgress: Map<string, WbsProgress>;
  /** journalTaskIds blocked by failed dependencies */
  blocked: Set<string>;
  /** journalTaskIds of failed blocking tasks */
  blockingFailures: Set<string>;
  /** journalTaskIds blocked because a dependency actually failed — subset of blocked, for display only */
  failureBlocked: Set<string>;
}

/**
 * Returns the set of taskIds that are already complete.
 *
 * Sources (both checked, union returned):
 *   - CheckpointManager.completedTasks  (.converge/journal/.checkpoint.json)
 *   - journal status.json               (.converge/journal/tasks/{epicId}/tasks/{taskId}/status.json)
 */
export async function getCompletedTaskIds(
  projectDir: string,
  tree: TaskNode[],
): Promise<Set<string>> {
  return (await getTaskStates(projectDir, tree)).completed;
}

/**
 * Returns completed, failed, and locked task ID sets from the checkpoint + journal.
 *
 * - completed: successfully finished
 * - failed: failed and locked to unblock downstream
 * - locked: all tasks the runner won't re-run (completed ∪ failed ∪ in-progress by another process)
 */
export async function getTaskStates(
  projectDir: string,
  tree: TaskNode[],
  options?: { skipAutoComplete?: boolean },
): Promise<TaskStates> {
  const completed = new Set<string>();
  const failed = new Set<string>();
  const seeded = new Set<string>();
  const locked = new Set<string>();
  const wbsProgress = new Map<string, WbsProgress>();
  // Collect async checkpoint writes so they complete before the function returns
  const pendingWrites: Promise<void>[] = [];
  const blockingFailures = new Set<string>();
  const blocked = new Set<string>();
  const failureBlocked = new Set<string>();

  // Source 1+2: Use cached filesystem status (single scan of all checkpoint.json files).
  // This replaces both the checkpoint manager's getCompleted/getFailed/getLocked calls
  // AND the per-task status.json reading loop.
  const checkpointMgr = new CheckpointManager(projectDir);
  const statusMap = checkpointMgr.getStatusMap();

  // Build a set of ids the passed tree owns. Any checkpoint entry outside this
  // set belongs to a sibling playbook / stale run and must NOT bleed into the
  // scoped state — otherwise a task id shared across playbooks (e.g.
  // `01-foundation`) gets its state merged and miscounted.
  const treeIds = new Set<string>();
  for (const node of tree) {
    treeIds.add(node.journalTaskId);
    treeIds.add(node.taskId);
    if (node.epicId) treeIds.add(`${node.epicId}/${node.journalTaskId}`);
  }
  const inScope = (id: string): boolean => {
    if (treeIds.has(id)) return true;
    const taskIdOnly = id.includes("/") ? id.split("/").slice(1).join("/") : id;
    return treeIds.has(taskIdOnly);
  };

  for (const [id, status] of statusMap) {
    if (!inScope(id)) continue;

    // Add both the full key and the stripped taskId-only key
    const taskIdOnly = id.includes("/") ? id.split("/").slice(1).join("/") : id;

    if (status === "complete") {
      completed.add(id);
      completed.add(taskIdOnly);
    } else if (status === "failed") {
      failed.add(id);
      failed.add(taskIdOnly);
    } else if (status === "seeded") {
      seeded.add(id);
      seeded.add(taskIdOnly);
    }

    if (status === "complete" || status === "failed" || status === "seeded") {
      locked.add(id);
      locked.add(taskIdOnly);
    }
  }

  // Also check V1 checkpoint arrays for backward compat — same scope filter.
  const checkpoint = await checkpointMgr.load();
  if (checkpoint && checkpoint.version === 1) {
    for (const id of checkpoint.completedTasks) if (inScope(id)) completed.add(id);
    for (const id of checkpoint.failedTasks ?? []) if (inScope(id)) failed.add(id);
    for (const id of checkpoint.seededTasks ?? []) if (inScope(id)) seeded.add(id);
    for (const id of checkpoint.lockedTasks) if (inScope(id)) locked.add(id);
  }

  // Source 3: Folder structure — derive parent-child relationships from the filesystem
  // The folder structure is the source of truth. Subtasks are ANY tasks nested under a parent's directory,
  // regardless of whether they were spawned via WBS seeding or created manually.
  //
  // Pattern 1: .../parent-task/task/child-task/TASK.md (with /task/ subdirectory - parentTaskId set)
  // Pattern 2: .../parent-task/child-task/TASK.md (direct nesting - parentTaskId NOT set)
  //
  // We build parent-child relationships from the tree, then compute progress from checkpoint state.

  // Build parent → children mapping from tree structure
  const parentChildMap = new Map<
    string,
    { epicId: string; children: TaskNode[] }
  >();

  for (const node of tree) {
    // Case 1: Node has parentTaskId set (Pattern 1 - /task/ subdirectory)
    if (node.parentTaskId) {
      if (!parentChildMap.has(node.parentTaskId)) {
        parentChildMap.set(node.parentTaskId, {
          epicId: node.epicId,
          children: [],
        });
      }
      parentChildMap.get(node.parentTaskId)!.children.push(node);
    } else {
      // Case 2: Check if other tasks are nested under this node's directory (Pattern 2 - direct nesting)
      // Exclude nodes that already have parentTaskId set — they're handled by Case 1 and would be double-counted.
      //
      // node.filePath may be a FILE path (e.g. .../TASK.md) or a DIRECTORY path depending on how
      // the tree was built. Normalise to the task's own directory and use forward-slash comparison
      // so that the check works cross-platform regardless of path.sep.
      const fp = node.filePath.replace(/\\/g, "/");
      const nodeDir = /\.(md|ts|tsx|js|jsx)$/.test(fp)
        ? fp.slice(0, fp.lastIndexOf("/"))
        : fp;

      const potentialChildren = tree.filter((other) => {
        if (other === node || other.parentTaskId) return false; // Skip self and explicitly-parented nodes
        const ofp = other.filePath.replace(/\\/g, "/");
        const otherDir = /\.(md|ts|tsx|js|jsx)$/.test(ofp)
          ? ofp.slice(0, ofp.lastIndexOf("/"))
          : ofp;
        if (!otherDir.startsWith(nodeDir + "/")) return false;
        // Direct children only. Two layouts both count as "direct":
        //   1. parentDir/childName       (sibling-style nesting)
        //   2. parentDir/tasks/childName (converge `tasks/` convention)
        // Anything deeper is a grandchild, not a direct child.
        let rel = otherDir.slice(nodeDir.length + 1);
        if (rel.startsWith("tasks/")) rel = rel.slice("tasks/".length);
        return !rel.includes("/");
      });

      if (potentialChildren.length > 0) {
        // This node is a parent
        if (!parentChildMap.has(node.journalTaskId)) {
          parentChildMap.set(node.journalTaskId, {
            epicId: node.epicId,
            children: [],
          });
        }
        parentChildMap
          .get(node.journalTaskId)!
          .children.push(...potentialChildren);
      }
    }
  }

  // Add any WBS-spawned children that exist on disk in the journal but aren't
  // in `tree`. WBS materializes TASK.md under journal/, not playbooks/, so the
  // playbook scanner doesn't see them. Without this, the parent's `tasks/`
  // subdir has fully-completed children whose status is invisible to rollup.
  {
    for (const node of tree) {
      if (!node.journalPath) continue;
      // node.journalPath may be the playbook path or already the journal path.
      // Normalize to the journal path so we look in the right place.
      const journalTaskDir = node.journalPath.includes("/journal/")
        ? node.journalPath
        : node.journalPath.replace("/playbooks/", "/journal/");
      const tasksSubdir = path.join(journalTaskDir, "tasks");
      if (!existsSync(tasksSubdir)) continue;
      let entries: string[];
      try {
        entries = fsReaddirSync(tasksSubdir);
      } catch {
        continue;
      }
      const childIds = entries.filter((d: string) => {
        const p = path.join(tasksSubdir, d);
        try {
          return (
            fsStatSync(p).isDirectory() &&
            existsSync(path.join(p, "checkpoint.json"))
          );
        } catch {
          return false;
        }
      });
      if (childIds.length === 0) continue;

      const existingChildren = parentChildMap.get(node.journalTaskId)
        ?.children ?? [];
      const existingIds = new Set(
        existingChildren.map((c) => c.journalTaskId),
      );

      for (const childId of childIds) {
        const fullChildId = `${node.journalTaskId}/${childId}`;
        if (existingIds.has(fullChildId)) continue;

        // Read the child's checkpoint to determine its status.
        const cpPath = path.join(tasksSubdir, childId, "checkpoint.json");
        let childStatus: string | undefined;
        try {
          const cp = JSON.parse(fsReadFileSync(cpPath, "utf-8"));
          childStatus = cp.status;
        } catch {
          continue;
        }

        // Add to parentChildMap (creating entry if needed).
        let entry = parentChildMap.get(node.journalTaskId);
        if (!entry) {
          entry = { epicId: node.epicId, children: [] };
          parentChildMap.set(node.journalTaskId, entry);
        }
        const candidate = path.join(tasksSubdir, childId, "TASK.md");
        const refChild = existsSync(candidate)
          ? {
              ...node,
              filePath: candidate,
              relPath: candidate.replace(projectDir + "/", ""),
            }
          : node;
        const virtualChild = makeVirtualTaskNode(
          fullChildId,
          node.epicId,
          refChild,
        );
        entry.children.push(virtualChild);

        // Reflect the child's status in the global completed/failed sets so
        // the parent rollup loop can see it.
        if (childStatus === "complete") {
          completed.add(fullChildId);
        } else if (childStatus === "failed") {
          failed.add(fullChildId);
        }
      }
    }
  }

  // Synthesize virtual parent entries for journalTaskIds that appear as parent
  // keys in the map but have no corresponding TaskNode in `tree`. This happens
  // when a WBS spawns a multi-level hierarchy where the intermediate "screen"
  // parents have no static TASK.md on disk — they exist only in the journal.
  // Without this, rollup walks through the leaf → screen → phase chain only
  // partway: the phase never sees its screen children as "complete".
  //
  // For each parent key, we walk its journalTaskId upward; for each ancestor
  // that has children but isn't itself a child of someone else, we add a
  // virtual TaskNode (using one of its children for epicId) and register it
  // as a child of its parent in parentChildMap.
  {
    const knownTaskIds = new Set(tree.map((n) => n.journalTaskId));
    let added = true;
    while (added) {
      added = false;
      for (const [parentKey, entry] of Array.from(parentChildMap)) {
        if (!parentKey.includes("/")) continue;
        const grandparentKey = parentKey.split("/").slice(0, -1).join("/");
        if (!grandparentKey || grandparentKey === entry.epicId) continue;
        if (parentChildMap.has(grandparentKey)) {
          // Grandparent already has an entry — make sure parentKey is in its
          // children list (synthesizing if absent from `tree`).
          const gp = parentChildMap.get(grandparentKey)!;
          if (!gp.children.some((c) => c.journalTaskId === parentKey)) {
            gp.children.push(
              makeVirtualTaskNode(parentKey, entry.epicId, entry.children[0]),
            );
            knownTaskIds.add(parentKey);
            added = true;
          }
          continue;
        }
        // Grandparent not yet in parentChildMap. Create it with parentKey as
        // its only known child (more children may be added in later passes).
        parentChildMap.set(grandparentKey, {
          epicId: entry.epicId,
          children: [
            makeVirtualTaskNode(parentKey, entry.epicId, entry.children[0]),
          ],
        });
        knownTaskIds.add(parentKey);
        added = true;
      }
    }
  }

  // Guard: WBS parents marked complete but with no children in the tree.
  // This catches cases where a WBS parent's checkpoint says "complete" but the
  // WBS never actually ran (no spawned children exist).
  //
  // Distinguish three states:
  //   (a) Truly never spawned (no on-disk children, no progress record) → reset
  //   (b) Spawned and completed (progress.completedChildren === totalChildren)
  //       but tree-builder didn't find the child TASK.md files → KEEP as complete
  //   (c) Tree visibility issue (children exist on disk under tasks/ but tree
  //       didn't pick them up) → KEEP as complete
  //
  // We trust the parent's own checkpoint.json `progress` block: if it says all
  // children done, the work happened — don't revert based on tree visibility.
  for (const node of tree) {
    if (!node.isWbsParent) continue;
    if (!completed.has(node.journalTaskId)) continue;

    const entry = parentChildMap.get(node.journalTaskId);
    if (entry && entry.children.length > 0) continue; // tree found children; fine

    // Tree didn't find children. Before reverting, check the parent's own
    // checkpoint progress and the on-disk journal `tasks/` subdir.
    const journalTaskDir = node.journalPath
      ? path.dirname(node.journalPath).replace("/playbooks/", "/journal/")
      : null;
    const tasksSubdir = journalTaskDir
      ? path.join(journalTaskDir, "tasks")
      : null;
    const onDiskChildren =
      tasksSubdir && existsSync(tasksSubdir)
        ? (() => {
            try {
              const fs = require("node:fs");
              return fs.readdirSync(tasksSubdir).filter((d: string) => {
                const p = path.join(tasksSubdir, d);
                return (
                  fs.statSync(p).isDirectory() &&
                  fs.existsSync(path.join(p, "checkpoint.json"))
                );
              });
            } catch {
              return [];
            }
          })()
        : [];

    if (onDiskChildren.length > 0) {
      // Tree didn't pick them up but they exist with checkpoints — keep complete.
      continue;
    }

    // Genuinely orphan: no children anywhere. Reset.
    console.warn(
      `⚠️  WBS parent ${node.journalTaskId} marked complete but has no children — reverting to pending`,
    );
    completed.delete(node.journalTaskId);
    locked.delete(node.journalTaskId);
    seeded.delete(node.journalTaskId);

    pendingWrites.push(
      checkpointMgr
        .removeFromCompleted(node.journalTaskId, node.epicId)
        .catch((err) => {
          console.error(
            `   ❌ Failed to clear stale checkpoint for ${node.journalTaskId}: ${(err as Error).message}`,
          );
        }),
    );
  }

  // Compute progress for each parent from folder structure
  for (const [parentJournalTaskId, { epicId, children }] of parentChildMap) {
    if (children.length === 0) continue;

    // Count completed/failed children based on their status in checkpoint
    let completedSubtasks = 0;
    let failedSubtasks = 0;
    const subtaskIds: string[] = [];

    for (const child of children) {
      subtaskIds.push(child.taskId);

      if (completed.has(child.journalTaskId)) {
        completedSubtasks++;
      } else if (failed.has(child.journalTaskId)) {
        failedSubtasks++;
      }
    }

    const spawnCount = children.length;

    // Use seeded status from cached checkpoint status instead of reading wbs.json
    const wasSeeded = seeded.has(parentJournalTaskId);

    // Store progress for this parent (auto-completion happens AFTER output validation)
    wbsProgress.set(parentJournalTaskId, {
      seeded: wasSeeded,
      spawnCount,
      completedSubtasks,
      failedSubtasks,
      subtaskIds,
    });

    // Update universal unit checkpoint with progress information (fire-and-forget)
    const unitCkpt = new UnitCheckpointManager(
      projectDir,
      "task",
      epicId,
      parentJournalTaskId,
    );
    unitCkpt.updateProgress({
      totalChildren: spawnCount,
      completedChildren: completedSubtasks,
      failedChildren: failedSubtasks,
      childIds: subtaskIds,
      lastProgressUpdate: new Date().toISOString(),
    });

    // Also update legacy task checkpoint for backward compatibility (fire-and-forget)
    const taskCkpt = new TaskCheckpointManager(
      projectDir,
      epicId,
      parentJournalTaskId,
    );
    taskCkpt.load().then((parentCheckpoint) => {
      if (parentCheckpoint) {
        parentCheckpoint.progress = {
          totalChildren: spawnCount,
          completedChildren: completedSubtasks,
          failedChildren: failedSubtasks,
          childTaskIds: subtaskIds,
          lastProgressUpdate: new Date().toISOString(),
        };
        taskCkpt.save(parentCheckpoint);
      }
    });
  }

  // Source 4: Validate outputs for completed and failed tasks
  // - Remove tasks from "completed" if their required outputs are missing
  // - Reconcile tasks marked "failed" if all their required outputs exist
  // - Skip revalidation for repair-completed tasks with skipRevalidation flag

  // Reload checkpoint to get latest task metadata (may have been updated by repairs)
  const latestCheckpoint = await checkpointMgr.load();
  const taskMetadata = latestCheckpoint?.taskMetadata || {};

  for (const node of tree) {
    // Skip output validation for tasks with skipRevalidation metadata
    const metadata = taskMetadata[node.journalTaskId];
    if (metadata?.skipRevalidation) {
      // Trust that repair system has validated this task
      continue;
    }

    // Use outputs already available on the TaskNode (populated during tree building)
    const outputs = node.outputs;

    // Skip if no outputs declared
    if (!outputs || outputs.length === 0) continue;

    // Check if all declared outputs exist (handle both absolute paths and glob patterns)
    const missingOutputs: string[] = [];
    for (const output of outputs) {
      const exists = await pathExists(projectDir, output);
      if (!exists) {
        missingOutputs.push(output);
      }
    }

    // Case 1: Task marked completed but outputs missing - UNCOMPLETE AND UPDATE CHECKPOINT
    if (completed.has(node.journalTaskId) && missingOutputs.length > 0) {
      completed.delete(node.journalTaskId);
      console.warn(
        `⚠️  Task ${node.journalTaskId} marked complete but missing outputs:`,
      );
      for (const missing of missingOutputs) {
        console.warn(`   - ${missing}`);
      }

      // Automatically update checkpoint to remove from completed
      pendingWrites.push(
        checkpointMgr
          .removeFromCompleted(node.journalTaskId, node.epicId)
          .catch((err) => {
            console.error(
              `   ❌ Failed to update checkpoint for ${node.journalTaskId}: ${err.message}`,
            );
          }),
      );
    }

    // Case 2: Task marked failed but all outputs exist - RECONCILE CHECKPOINT
    // Skip WBS parents — their completion is determined by children, not outputs on disk
    const isWbsParent =
      parentChildMap.has(node.journalTaskId) ||
      wbsProgress.has(node.journalTaskId) ||
      node.isWbsParent;
    if (
      failed.has(node.journalTaskId) &&
      missingOutputs.length === 0 &&
      !isWbsParent
    ) {
      console.warn(
        `⚠️  Task ${node.journalTaskId} marked failed but all outputs exist. Reconciling checkpoint...`,
      );

      // Move from failed to completed in memory
      failed.delete(node.journalTaskId);
      completed.add(node.journalTaskId);

      // Update checkpoint to reflect reality
      pendingWrites.push(
        checkpointMgr
          .reconcileTask(
            node.journalTaskId,
            "marked failed but all required outputs exist",
            node.epicId,
          )
          .catch((err) => {
            console.error(
              `   ❌ Failed to reconcile checkpoint for ${node.journalTaskId}: ${err.message}`,
            );
          }),
      );
    }
  }

  // Source 4.1: Auto-complete pending tasks whose checks already pass
  // When artifacts exist outside the converge flow (e.g. batch operations),
  // run checks for pending leaf tasks and auto-complete if all pass.
  // Skipped in read-only contexts (e.g. tree display) for performance.
  if (options?.skipAutoComplete) {
    // Skip expensive check evaluation — tree/gantt/graph only need status display
  } else
    for (const node of tree) {
      // Skip already-resolved tasks
      if (
        completed.has(node.journalTaskId) ||
        failed.has(node.journalTaskId) ||
        seeded.has(node.journalTaskId)
      )
        continue;

      // Skip parent tasks (they auto-complete via children)
      if (parentChildMap.has(node.journalTaskId)) continue;

      // Load task definition to get checks and outputs
      let unit: Unit | null = null;
      try {
        unit = await Unit.fromPath(node.filePath);
      } catch {
        continue;
      }

      // Skip WBS parent tasks — they complete only via children, never via checks
      if (unit.wbsFn) continue;

      const checks = unit.checks;
      const outputs = unit.config.outputs;

      // Skip tasks with no checks defined — nothing to validate
      if (!checks || (Array.isArray(checks) && checks.length === 0)) continue;

      // First: verify all declared outputs exist
      if (outputs && outputs.length > 0) {
        let allOutputsExist = true;
        for (const output of outputs) {
          if (!(await pathExists(projectDir, output))) {
            allOutputsExist = false;
            break;
          }
        }
        if (!allOutputsExist) continue;
      }

      // Then: run all check commands
      const resolvedChecks = await resolveChecksForUnit(unit);
      let allChecksPassed = true;
      for (const chk of resolvedChecks) {
        if (!chk.cmd) continue;
        const result = await checkCmd(chk.cmd, projectDir);
        if (!result.ok) {
          allChecksPassed = false;
          break;
        }
      }

      if (allChecksPassed) {
        completed.add(node.journalTaskId);
        console.log(`  ✓ Auto-completed (checks pass): ${node.journalTaskId}`);

        // Persist to checkpoint
        pendingWrites.push(
          checkpointMgr
            .markTaskCompleted(node.journalTaskId, node.epicId)
            .catch((err) => {
              console.warn(
                `⚠️  Failed to persist auto-completion: ${(err as Error).message}`,
              );
            }),
        );
      }
    }

  // Source 4.5: Auto-complete parents based on CURRENT child state (after output validation)
  // This MUST run AFTER output validation to use accurate child completion state.
  //
  // Multi-level chains require fixed-point iteration: marking a child-parent
  // complete in pass N must enable its grandparent to be marked complete in
  // pass N+1. JS Map iteration order can put the deeper parent after the
  // shallower one, so a single pass leaves grandparents stuck. Loop until no
  // change to the completed/failed sets.
  let parentRollupChanged = true;
  let parentRollupPasses = 0;
  while (parentRollupChanged && parentRollupPasses < 10) {
    parentRollupChanged = false;
    parentRollupPasses++;
  for (const [parentJournalTaskId, { epicId, children }] of parentChildMap) {
    if (children.length === 0) continue;

    // Re-count completed/failed children based on CURRENT state (after output validation)
    let currentCompletedSubtasks = 0;
    let currentFailedSubtasks = 0;

    for (const child of children) {
      if (completed.has(child.journalTaskId)) {
        currentCompletedSubtasks++;
      } else if (failed.has(child.journalTaskId)) {
        currentFailedSubtasks++;
      }
    }

    const spawnCount = children.length;

    // Parents with declared outputs must have them on disk before auto-completing,
    // even when every child is marked complete. This stops stale checkpoints from
    // a prior run (children=complete) from cascading a parent to completed when
    // the parent's own outputs have been deleted or were never materialized.
    // WBS parents (wbs.js-driven) opt out — their completion lives in children.
    const parentNode = tree.find(
      (t) => t.journalTaskId === parentJournalTaskId,
    );
    const parentOutputs = parentNode?.outputs ?? [];
    const parentIsWbs = parentNode?.isWbsParent === true;
    let parentOutputsMissing = false;
    if (!parentIsWbs && parentOutputs.length > 0) {
      for (const output of parentOutputs) {
        if (!(await pathExists(projectDir, output))) {
          parentOutputsMissing = true;
          break;
        }
      }
    }

    // Case 1: Auto-complete parent if all children are done AND parent outputs exist
    if (
      currentCompletedSubtasks + currentFailedSubtasks === spawnCount &&
      !parentOutputsMissing
    ) {
      if (currentFailedSubtasks > 0) {
        // Any child failed → parent failed
        if (!failed.has(parentJournalTaskId)) {
          failed.add(parentJournalTaskId);
          seeded.delete(parentJournalTaskId);
          completed.delete(parentJournalTaskId);
          parentRollupChanged = true;
          console.log(
            `  ↻ Auto-failed parent: ${parentJournalTaskId} (${currentFailedSubtasks}/${spawnCount} children failed)`,
          );

          // Persist to global checkpoint
          pendingWrites.push(
            checkpointMgr
              .markTaskFailed(parentJournalTaskId, epicId)
              .catch((err) => {
                console.warn(
                  `⚠️  Failed to persist parent failure: ${err.message}`,
                );
              }),
          );
        }
      } else {
        // All children completed → parent completed
        if (!completed.has(parentJournalTaskId)) {
          completed.add(parentJournalTaskId);
          seeded.delete(parentJournalTaskId);
          failed.delete(parentJournalTaskId);
          parentRollupChanged = true;
          console.log(
            `  ↻ Auto-completed parent: ${parentJournalTaskId} (${currentCompletedSubtasks}/${spawnCount} children done)`,
          );

          // Persist to global checkpoint
          pendingWrites.push(
            checkpointMgr
              .markTaskCompleted(parentJournalTaskId, epicId)
              .catch((err) => {
                console.warn(
                  `⚠️  Failed to persist parent completion: ${err.message}`,
                );
              }),
          );
        }
      }
    } else if (parentRollupPasses === 1) {
      // Case 2: Children NOT all done - parent should be seeded (waiting for children)
      // This covers: completed/failed parents being reverted, AND pending parents after --restart.
      // Only run on the FIRST pass; later passes might see a parent whose children are still
      // catching up via fixed-point rollup. Reverting on those passes would cause oscillation.
      if (!seeded.has(parentJournalTaskId)) {
        const wasCompleted = completed.has(parentJournalTaskId);
        const wasFailed = failed.has(parentJournalTaskId);
        const progress = wbsProgress.get(parentJournalTaskId);
        // Parent with spawned children: normal lifecycle (parent ran, children still executing)
        const isWbsParent = progress && progress.spawnCount > 0;

        completed.delete(parentJournalTaskId);
        failed.delete(parentJournalTaskId);
        seeded.add(parentJournalTaskId);

        if (isWbsParent) {
          // Normal WBS lifecycle: parent ran and spawned children, children still executing
          // No alarming message — this is expected
        } else if (wasCompleted) {
          console.log(
            `  ↻ Reverted parent to seeded: ${parentJournalTaskId} (${currentCompletedSubtasks}/${spawnCount} children done)`,
          );
        } else if (wasFailed) {
          console.log(
            `  ↻ Reverted failed parent to seeded: ${parentJournalTaskId} (children state changed)`,
          );
        }
        // If pending (e.g. after --restart): no log needed, expected state

        // Update global checkpoint - move back to seeded (only if was previously tracked)
        if (wasCompleted || wasFailed) {
          const ckpt = await checkpointMgr.load();
          if (ckpt) {
            if (ckpt.version === 1) {
              // V1 - modify arrays directly
              ckpt.completedTasks = ckpt.completedTasks.filter(
                (id) => id !== parentJournalTaskId,
              );
              ckpt.failedTasks = (ckpt.failedTasks ?? []).filter(
                (id) => id !== parentJournalTaskId,
              );
              if (!ckpt.seededTasks) ckpt.seededTasks = [];
              if (!ckpt.seededTasks.includes(parentJournalTaskId)) {
                ckpt.seededTasks.push(parentJournalTaskId);
              }
              await checkpointMgr.save(ckpt);
            } else if (ckpt.version === 2) {
              // V2 - use CheckpointManager methods
              await checkpointMgr.removeFromCompleted(
                parentJournalTaskId,
                epicId,
              );
              await checkpointMgr.markTaskSeeded(parentJournalTaskId, epicId);
            }
          }
        }
      }
    }
  }
  } // end of while (fixed-point parent rollup)

  // Source 5: Dependency-based blocking resolution
  // Step 1: Identify failed blocking tasks
  for (const node of tree) {
    if (node.blocking && failed.has(node.journalTaskId)) {
      blockingFailures.add(node.journalTaskId);
      if (process.env.CONVERGE_DEBUG_DEPS === "true") {
        console.log(
          `🔴 Blocking failure detected: ${node.journalTaskId} (blocking=${node.blocking}, tags=${node.tags?.join(", ")})`,
        );
      }
    }
  }

  // Step 2: Mark dependent tasks as blocked (iterate until transitive closure)
  let prevBlockedSize = -1; // Start with -1 to ensure at least one iteration
  let prevFailureBlockedSize = -1;
  let iterations = 0;
  const maxIterations = 100; // Safety limit to prevent infinite loops

  while (
    (blocked.size !== prevBlockedSize ||
      failureBlocked.size !== prevFailureBlockedSize) &&
    iterations < maxIterations
  ) {
    prevBlockedSize = blocked.size;
    prevFailureBlockedSize = failureBlocked.size;
    iterations++;

    for (const node of tree) {
      // Skip if already blocked
      if (blocked.has(node.journalTaskId)) continue;

      // Check explicit dependencies
      if (node.dependencies) {
        for (const dep of node.dependencies) {
          if (dep.startsWith("tag:")) {
            // Tag dependency - block if ANY of these conditions:
            // 1. A task with this tag has failed as a blocking task
            // 2. A task with this tag is blocked (transitive blocking)
            // 3. NO task with this tag has completed yet (prerequisite not met)
            const tag = dep.substring(4); // Remove "tag:" prefix

            const hasFailedTagDep = tree.some(
              (t) =>
                t.tags?.includes(tag) &&
                t.blocking &&
                failed.has(t.journalTaskId),
            );

            const hasBlockedTagDep = tree.some(
              (t) => t.tags?.includes(tag) && blocked.has(t.journalTaskId),
            );

            const hasFailureBlockedTagDep = tree.some(
              (t) =>
                t.tags?.includes(tag) && failureBlocked.has(t.journalTaskId),
            );

            const hasCompletedTagDep = tree.some(
              (t) => t.tags?.includes(tag) && completed.has(t.journalTaskId),
            );

            if (process.env.CONVERGE_DEBUG_DEPS === "true") {
              console.log(
                `   [Iter ${iterations}] Checking ${node.journalTaskId} dependency on tag:${tag}:`,
              );
              console.log(`     hasFailedTagDep: ${hasFailedTagDep}`);
              console.log(`     hasBlockedTagDep: ${hasBlockedTagDep}`);
              console.log(`     hasCompletedTagDep: ${hasCompletedTagDep}`);
              console.log(
                `     → will block: ${hasFailedTagDep || hasBlockedTagDep || !hasCompletedTagDep}`,
              );
            }

            // Block if any dependency with this tag failed, is blocked, or none completed
            if (hasFailedTagDep || hasBlockedTagDep || !hasCompletedTagDep) {
              blocked.add(node.journalTaskId);
              // Only failure-block when the tag dep actually failed (not just incomplete)
              if (hasFailedTagDep || hasFailureBlockedTagDep) {
                failureBlocked.add(node.journalTaskId);
              }
              break; // One failed dependency is enough to block
            }
          } else {
            // Direct task ID dependency - block if:
            // 1. The task is a blocking failure
            // 2. The task is blocked
            // 3. The task has not completed yet
            const depNode = tree.find(
              (t) => t.journalTaskId === dep || t.taskId === dep,
            );

            if (!depNode) {
              // Dependency not found - this is a configuration error
              console.warn(
                `⚠️  Dependency "${dep}" not found for task ${node.journalTaskId}`,
              );
              continue;
            }

            const isDepBlocked = blocked.has(depNode.journalTaskId);
            const isDepFailed = blockingFailures.has(depNode.journalTaskId);
            const isDepFailureBlocked = failureBlocked.has(
              depNode.journalTaskId,
            );
            const isDepCompleted = completed.has(depNode.journalTaskId);

            if (process.env.CONVERGE_DEBUG_DEPS === "true") {
              console.log(
                `   [Iter ${iterations}] Checking ${node.journalTaskId} dependency on ${dep}:`,
              );
              console.log(`     isDepBlocked: ${isDepBlocked}`);
              console.log(`     isDepFailed: ${isDepFailed}`);
              console.log(`     isDepCompleted: ${isDepCompleted}`);
              console.log(
                `     → will block: ${isDepFailed || isDepBlocked || !isDepCompleted}`,
              );
            }

            if (isDepFailed || isDepBlocked || !isDepCompleted) {
              blocked.add(node.journalTaskId);
              // Only failure-block when the dep actually failed (not just incomplete/running)
              if (isDepFailed || isDepFailureBlocked) {
                failureBlocked.add(node.journalTaskId);
              }
              break;
            }
          }
        }
      }

      // Also block WBS children of failed blocking parents (implicit)
      if (node.parentTaskId && blockingFailures.has(node.parentTaskId)) {
        blocked.add(node.journalTaskId);
        failureBlocked.add(node.journalTaskId);
      }
    }
  }

  if (process.env.CONVERGE_DEBUG_DEPS === "true") {
    console.log(
      `🔄 Dependency resolution converged after ${iterations} iterations`,
    );
    console.log(`   Blocked tasks: ${blocked.size}`);
  }

  // Step 3: Ensure WBS children inherit parent's blocked status (only when appropriate)
  for (const node of tree) {
    if (node.parentTaskId) {
      const parent = tree.find((t) => t.journalTaskId === node.parentTaskId);
      if (parent) {
        // If parent is blocked (by dependencies or failure), block child
        if (blocked.has(parent.journalTaskId)) {
          blocked.add(node.journalTaskId);
          // Propagate failure-blocked status only when parent is failure-blocked
          if (failureBlocked.has(parent.journalTaskId)) {
            failureBlocked.add(node.journalTaskId);
          }
        }
        // If parent is a blocking failure, block child
        // UNLESS parent is a WBS parent with discovered children (partial failure)
        // In that case, children should be runnable to allow completion
        if (blockingFailures.has(parent.journalTaskId)) {
          const parentWbs = wbsProgress.get(parent.journalTaskId);
          const isWbsPartialFailure = parentWbs && parentWbs.spawnCount > 0;

          if (process.env.CONVERGE_DEBUG_DEPS === "true") {
            console.log(
              `🔍 Checking child ${node.journalTaskId} of blocking failure ${parent.journalTaskId}`,
            );
            console.log(
              `   parentWbs: ${JSON.stringify(parentWbs)}, isWbsPartialFailure: ${isWbsPartialFailure}`,
            );
          }

          if (!isWbsPartialFailure) {
            // Normal blocking failure - block all children
            blocked.add(node.journalTaskId);
            failureBlocked.add(node.journalTaskId);
            if (process.env.CONVERGE_DEBUG_DEPS === "true") {
              console.log(`   → Blocking child (normal blocking failure)`);
            }
          } else {
            if (process.env.CONVERGE_DEBUG_DEPS === "true") {
              console.log(
                `   → NOT blocking child (WBS partial failure - child should run)`,
              );
            }
          }
          // else: WBS partial failure - children should run to complete parent
        }
        // ONLY block child if parent hasn't completed AND parent is NOT seeded/running
        // If parent is seeded or has spawned children, children should be executable
        const parentSeeded = seeded.has(parent.journalTaskId);
        const parentHasChildren =
          wbsProgress.has(parent.journalTaskId) &&
          wbsProgress.get(parent.journalTaskId)!.spawnCount > 0;
        const parentNotStarted =
          !completed.has(parent.journalTaskId) &&
          !failed.has(parent.journalTaskId) &&
          !parentSeeded &&
          !parentHasChildren;

        if (parentNotStarted) {
          blocked.add(node.journalTaskId);
        }
      }
    }
  }

  // Step 4: Block subsequent tasks when a blocking task fails
  // Tasks are ordered sequentially within epics and across epics (by file path)
  // If a blocking task fails, ALL tasks that come after it (same epic AND subsequent epics) should be blocked
  const epicTaskMap = new Map<string, TaskNode[]>();

  // Group tasks by epic
  for (const node of tree) {
    if (!epicTaskMap.has(node.epicId)) {
      epicTaskMap.set(node.epicId, []);
    }
    epicTaskMap.get(node.epicId)!.push(node);
  }

  // Sort epics by numeric prefix (execution order)
  const sortedEpicIds = Array.from(epicTaskMap.keys()).sort((a, b) => {
    const aMatch = a.match(/^(\d+)-/);
    const bMatch = b.match(/^(\d+)-/);
    const aNum = aMatch ? parseInt(aMatch[1], 10) : 999;
    const bNum = bMatch ? parseInt(bMatch[1], 10) : 999;
    return aNum - bNum;
  });

  let globalBlockingFailure = false;
  let globalFailureBlocked = false; // true only when cause is an actual failure (not seeded WBS)

  // For each epic (in execution order), block tasks that come after failed blocking tasks
  for (const epicId of sortedEpicIds) {
    const epicTasks = epicTaskMap.get(epicId)!;
    // Sort tasks by file path (matches execution order within epic)
    const sortedTasks = epicTasks.sort((a, b) =>
      a.filePath.localeCompare(b.filePath),
    );

    if (process.env.CONVERGE_DEBUG_DEPS === "true") {
      console.log(`\n📂 Processing epic: ${epicId}`);
      console.log(
        `   Tasks in epic: ${sortedTasks.map((t) => `${t.taskId}(blocking=${t.blocking})`).join(", ")}`,
      );
    }

    for (const task of sortedTasks) {
      // Skip WBS subtasks (they have parentTaskId) - only consider top-level epic tasks
      if (task.parentTaskId) continue;

      // If we've encountered a global blocking failure, block ALL subsequent tasks (even in other epics)
      if (globalBlockingFailure) {
        blocked.add(task.journalTaskId);
        if (globalFailureBlocked) {
          failureBlocked.add(task.journalTaskId);
        }
        if (process.env.CONVERGE_DEBUG_DEPS === "true") {
          console.log(
            `🔒 Blocking ${task.journalTaskId} - comes after failed blocking task`,
          );
        }
        continue;
      }

      // Check if THIS task has failed AND is a blocking task
      // ONLY blocking tasks should block subsequent tasks
      if (
        process.env.CONVERGE_DEBUG_DEPS === "true" &&
        failed.has(task.journalTaskId)
      ) {
        console.log(
          `🔍 Checking failed task: ${task.journalTaskId} (blocking=${task.blocking})`,
        );
      }

      if (task.blocking && failed.has(task.journalTaskId)) {
        // Special case: Failed WBS parent with discovered children
        // (partial failure - subtasks were written but wbs.json wasn't)
        const wbs = wbsProgress.get(task.journalTaskId);
        if (wbs && wbs.spawnCount > 0) {
          const allSubtasksDone =
            wbs.completedSubtasks + wbs.failedSubtasks === wbs.spawnCount;
          if (!allSubtasksDone) {
            globalBlockingFailure = true;
            globalFailureBlocked = true;
            console.log(
              `🚫 Blocking task failure detected: ${task.journalTaskId} (blocking=true) - ALL subsequent tasks will be blocked`,
            );
            console.log(
              `   Note: WBS parent has incomplete children (${wbs.completedSubtasks}/${wbs.spawnCount} done)`,
            );
            continue;
          }
          // All subtasks done - fall through to regular failed-task blocking
        }

        globalBlockingFailure = true;
        globalFailureBlocked = true;
        console.log(
          `🚫 Blocking task failure detected: ${task.journalTaskId} (blocking=true) - ALL subsequent tasks will be blocked`,
        );
      }

      // Check if THIS task is a WBS parent that is seeded but not yet complete
      // When a blocking WBS parent is seeded, block all subsequent tasks until ALL subtasks complete
      if (
        task.blocking &&
        seeded.has(task.journalTaskId) &&
        !completed.has(task.journalTaskId)
      ) {
        const wbs = wbsProgress.get(task.journalTaskId);
        if (wbs && wbs.spawnCount > 0) {
          const allSubtasksDone =
            wbs.completedSubtasks + wbs.failedSubtasks === wbs.spawnCount;
          if (!allSubtasksDone) {
            globalBlockingFailure = true;
            console.log(
              `🚫 Blocking WBS parent running: ${task.journalTaskId} (blocking=true) - ALL subsequent tasks blocked until subtasks complete (${wbs.completedSubtasks}/${wbs.spawnCount} done)`,
            );
          }
        }
      }
    }
  }

  // Step 4b: Apply sibling blocking within WBS parent groups.
  // Mirrors top-level sibling blocking: the first non-completed blocking subtask
  // blocks all subsequent siblings within the same parent.
  const subtasksByParent = new Map<string, TaskNode[]>();
  for (const node of tree) {
    if (!node.parentTaskId) continue;
    if (!subtasksByParent.has(node.parentTaskId)) {
      subtasksByParent.set(node.parentTaskId, []);
    }
    subtasksByParent.get(node.parentTaskId)!.push(node);
  }

  for (const siblings of subtasksByParent.values()) {
    const sorted = [...siblings].sort((a, b) =>
      a.filePath.localeCompare(b.filePath),
    );
    let siblingBlocker = false;
    let siblingFailureBlocker = false;
    for (const sibling of sorted) {
      if (siblingBlocker) {
        blocked.add(sibling.journalTaskId);
        if (siblingFailureBlocker) {
          failureBlocked.add(sibling.journalTaskId);
        }
        continue;
      }
      // First sibling that is blocking and not yet completed starts blocking subsequent ones
      if (sibling.blocking !== false && !completed.has(sibling.journalTaskId)) {
        siblingBlocker = true;
        // Only failure-block subsequent siblings if the blocker actually failed
        if (
          failed.has(sibling.journalTaskId) ||
          failureBlocked.has(sibling.journalTaskId)
        ) {
          siblingFailureBlocker = true;
        }
      }
    }
  }

  // Step 5: Block ALL children of blocked parent tasks
  // If a parent task is blocked, all its subtasks should also be blocked
  for (const node of tree) {
    if (node.parentTaskId && blocked.has(node.parentTaskId)) {
      blocked.add(node.journalTaskId);
      if (failureBlocked.has(node.parentTaskId)) {
        failureBlocked.add(node.journalTaskId);
      }
      if (process.env.CONVERGE_DEBUG_DEPS === "true") {
        console.log(
          `🔒 Blocking ${node.journalTaskId} - parent ${node.parentTaskId} is blocked`,
        );
      }
    }
  }

  if (process.env.CONVERGE_DEBUG_DEPS === "true") {
    console.log(`\n📊 Task States Summary:`);
    console.log(`   Completed: ${completed.size}`);
    console.log(`   Failed: ${failed.size} - ${Array.from(failed).join(", ")}`);
    console.log(
      `   Blocking Failures: ${blockingFailures.size} - ${Array.from(blockingFailures).join(", ")}`,
    );
    console.log(
      `   Blocked: ${blocked.size} - ${Array.from(blocked).join(", ")}`,
    );
    console.log(
      `   Failure Blocked: ${failureBlocked.size} - ${Array.from(failureBlocked).join(", ")}\n`,
    );
  }

  // Wait for all checkpoint writes to complete before returning.
  // These must be persisted so autonomousRun (which loads a fresh tree) sees them.
  if (pendingWrites.length > 0) {
    await Promise.all(pendingWrites);
  }

  return {
    completed,
    failed,
    seeded,
    locked,
    wbsProgress,
    blocked,
    blockingFailures,
    failureBlocked,
  };
}

/* ------------------------------------------------------------------ */
/*  Execution Plan                                                     */
/* ------------------------------------------------------------------ */

export interface ExecutionSpan {
  /** 1-based inclusive start slot (leaf tasks: startIndex === endIndex) */
  startIndex: number;
  /** 1-based inclusive end slot */
  endIndex: number;
}

/**
 * Assigns sequential execution indices depth-first across epics and tasks.
 *
 * Rules (mirror converge blocking):
 *   - Epics are siblings — epic N starts after epic N-1 ends
 *   - Top-level tasks within an epic are siblings — sequential
 *   - WBS subtasks within a parent are siblings — sequential
 *   - Parents span their children (startIndex = first child, endIndex = last child)
 *   - Leaf tasks each consume one slot
 *
 * The returned plan is keyed by journalTaskId for tasks and by epicId for epics.
 */
export function calculateExecutionPlan(tree: TaskNode[]): {
  plan: Map<string, ExecutionSpan>;
  totalCount: number;
} {
  const plan = new Map<string, ExecutionSpan>();
  let counter = 1;

  // Build children map keyed by parentTaskId (= journalTaskId of parent)
  const childrenOf = new Map<string, TaskNode[]>();
  for (const node of tree) {
    if (node.parentTaskId) {
      if (!childrenOf.has(node.parentTaskId))
        childrenOf.set(node.parentTaskId, []);
      childrenOf.get(node.parentTaskId)!.push(node);
    }
  }
  for (const children of childrenOf.values()) {
    children.sort((a, b) => a.taskId.localeCompare(b.taskId));
  }

  // Top-level tasks per epic
  const epicTopLevel = new Map<string, TaskNode[]>();
  for (const node of tree) {
    if (!node.parentTaskId) {
      if (!epicTopLevel.has(node.epicId)) epicTopLevel.set(node.epicId, []);
      epicTopLevel.get(node.epicId)!.push(node);
    }
  }
  const sortedEpicIds = [...epicTopLevel.keys()].sort((a, b) => {
    const aNum = parseInt(a.match(/^(\d+)/)?.[1] ?? "999", 10);
    const bNum = parseInt(b.match(/^(\d+)/)?.[1] ?? "999", 10);
    return aNum - bNum;
  });

  function assignSpan(node: TaskNode): void {
    const children = childrenOf.get(node.journalTaskId) ?? [];
    const start = counter;
    counter++; // parent/leaf always gets its own slot first
    for (const child of children) assignSpan(child);
    plan.set(node.journalTaskId, { startIndex: start, endIndex: counter - 1 });
  }

  for (const epicId of sortedEpicIds) {
    const nodes = epicTopLevel.get(epicId)!;
    nodes.sort((a, b) => a.taskId.localeCompare(b.taskId));
    const epicStart = counter;
    for (const node of nodes) assignSpan(node);
    plan.set(epicId, { startIndex: epicStart, endIndex: counter - 1 });
  }

  return { plan, totalCount: counter - 1 };
}

/* ------------------------------------------------------------------ */
/*  Phase 3 — Find next task                                           */
/* ------------------------------------------------------------------ */

export interface NextTaskResult {
  node: TaskNode;
  completedCount: number;
  totalCount: number;
  completedIds: Set<string>;
}

/**
 * Stateless next-task resolution:
 *   1. Build task tree from epics + tasks
 *   2. Load task states from checkpoint + journal
 *   3. Return the first task that is not done (completed, failed, or seeded/locked)
 *
 * Seeded WBS parent tasks are skipped — they are locked and waiting for their
 * subtasks to complete; the engine drives their subtasks directly.
 */
export async function findNextTask(
  projectDir: string,
  epics: Array<{ filePath: string }>,
  tasks: Array<{ filePath: string }>,
): Promise<NextTaskResult | null> {
  const tree = await buildTaskTree(epics, tasks, projectDir);
  if (tree.length === 0) return null;

  const states = await getTaskStates(projectDir, tree);
  const { completed, failed, locked, blocked, seeded } = states;

  const isDone = (n: TaskNode) =>
    completed.has(n.journalTaskId) ||
    failed.has(n.journalTaskId) ||
    locked.has(n.journalTaskId) ||
    blocked.has(n.journalTaskId) || // Skip blocked tasks
    seeded.has(n.journalTaskId); // Skip seeded WBS parents (waiting for children)

  const completedCount = tree.filter((n) =>
    completed.has(n.journalTaskId),
  ).length;

  const next = tree.find((n) => !isDone(n));
  if (!next) return null;

  return {
    node: next,
    completedCount,
    totalCount: tree.length,
    completedIds: completed,
  };
}
