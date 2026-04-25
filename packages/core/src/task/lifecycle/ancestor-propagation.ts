/**
 * Ancestor Propagation
 *
 * When the converge executes a leaf task, its status must propagate up the task
 * hierarchy so the journal reflects the full project → epic → task → subtask tree.
 *
 * Two operations:
 *
 *   markAncestorsRunning()
 *     Called BEFORE a task executes.
 *     Marks every ancestor's TaskCheckpoint as 'running' so the journal shows
 *     the full chain in progress, not just the leaf.
 *
 *   rollUpCompletion()
 *     Called AFTER a task completes (success or fail).
 *     Walks up the ancestor chain and auto-completes (or fails) each ancestor
 *     whose all spawned subtasks are now done.
 */

import { existsSync, readdirSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getJournalStructure } from "../../journal/structure.ts";
import { CheckpointManager } from "../../checkpoint/manager.ts";
import { TaskCheckpointManager } from "../../checkpoint/task-checkpoint.ts";
import { UnitCheckpointManager } from "../../checkpoint/unit-checkpoint.ts";
import type { Unit } from "../unit/unit.ts";

/* ------------------------------------------------------------------ */
/*  markAncestorsRunning                                               */
/* ------------------------------------------------------------------ */

/**
 * Before a task executes, mark every ancestor task's checkpoint.json as
 * 'running' so the hierarchy reflects the live state.
 *
 * Only updates ancestors that aren't already 'complete' — we don't want
 * to regress a finished ancestor.
 *
 * NEW: Accepts both Unit (preferred) and legacy string parameters.
 * When Unit is provided, uses native context tree traversal.
 */
export async function markAncestorsRunning(
  unitOrProjectDir: Unit | string,
  epicId?: string,
  journalTaskId?: string,
): Promise<void> {
  // New path: Use Unit's context chain
  if (typeof unitOrProjectDir !== "string") {
    const unit = unitOrProjectDir;
    if (!unit.context) return; // Virtual unit without context

    const projectDir = unit.getProjectRoot();

    // Walk ancestor contexts natively (no string parsing)
    for (const ancestorCtx of unit.walkAncestorContexts()) {
      const taskCkpt = new TaskCheckpointManager(
        projectDir,
        ancestorCtx.epicId,
        ancestorCtx.fullTaskId,
      );
      const existing = await taskCkpt.load();

      // Only update if the ancestor checkpoint exists and isn't already complete or seeded
      // Seeded ancestors are locked WBS parents waiting for children — don't revert to running
      if (
        existing &&
        existing.status !== "complete" &&
        (existing.status as string) !== "seeded"
      ) {
        existing.status = "running";
        await taskCkpt.save(existing);
      }
    }
    return;
  }

  // Legacy path: String-based traversal (for backward compatibility)
  const projectDir = unitOrProjectDir;
  if (!epicId || !journalTaskId) {
    throw new Error(
      "epicId and journalTaskId required when calling with string projectDir",
    );
  }

  const segments = journalTaskId.split("/").filter(Boolean);
  if (segments.length <= 1) return; // No ancestors — top-level task

  for (let depth = 1; depth < segments.length; depth++) {
    const ancestorId = segments.slice(0, depth).join("/");
    const taskCkpt = new TaskCheckpointManager(projectDir, epicId, ancestorId);
    const existing = await taskCkpt.load();

    // Only update if the ancestor checkpoint exists and isn't already complete or seeded
    // Seeded ancestors are locked WBS parents waiting for children — don't revert to running
    if (
      existing &&
      existing.status !== "complete" &&
      (existing.status as string) !== "seeded"
    ) {
      existing.status = "running";
      await taskCkpt.save(existing);
    }
  }
}

/* ------------------------------------------------------------------ */
/*  rollUpCompletion                                                   */
/* ------------------------------------------------------------------ */

/**
 * After a task completes, walk up the ancestor chain.
 * For each ancestor that has a wbs.json, check whether all its spawned
 * subtasks are now done (completed or failed in the global checkpoint).
 * If so, mark the ancestor as complete or failed in both the global
 * checkpoint and its own TaskCheckpoint.
 *
 * NEW: Accepts both Unit (preferred) and legacy string parameters.
 * When Unit is provided, uses native context tree traversal.
 */
export async function rollUpCompletion(
  unitOrProjectDir: Unit | string,
  epicIdOrCheckpointMgr: string | CheckpointManager,
  journalTaskIdOrUndefined?: string,
  checkpointMgrOrUndefined?: CheckpointManager,
): Promise<void> {
  // Normalize parameters based on signature
  let projectDir: string;
  let epicId: string;
  let journalTaskId: string;
  let checkpointMgr: CheckpointManager;
  let unit: Unit | undefined;

  if (typeof unitOrProjectDir !== "string") {
    // New signature: rollUpCompletion(unit, checkpointMgr)
    unit = unitOrProjectDir;
    if (!unit.context) return; // Virtual unit without context

    projectDir = unit.getProjectRoot();
    epicId = unit.context.epicId;
    journalTaskId = unit.context.fullTaskId;
    checkpointMgr = epicIdOrCheckpointMgr as CheckpointManager;
  } else {
    // Legacy signature: rollUpCompletion(projectDir, epicId, journalTaskId, checkpointMgr)
    projectDir = unitOrProjectDir;
    epicId = epicIdOrCheckpointMgr as string;
    journalTaskId = journalTaskIdOrUndefined!;
    checkpointMgr = checkpointMgrOrUndefined!;
  }
  // If we have a Unit, use context-based traversal
  if (unit) {
    // Walk ancestor contexts (most efficient path)
    for (const ancestorCtx of unit.walkAncestorContexts()) {
      const structure = getJournalStructure(
        projectDir,
        ancestorCtx.epicId,
        ancestorCtx.fullTaskId,
      );
      if (!structure.task) break;

      // Always try to roll up — works for both WBS parents (wbs.json) and
      // static parents (folder-derived children). Returns silently when
      // no children can be found.
      await rollUpSingleAncestor(
        projectDir,
        ancestorCtx.epicId,
        ancestorCtx.fullTaskId,
        checkpointMgr,
      );
    }
    return;
  }

  // Legacy path: String-based traversal
  const segments = journalTaskId.split("/").filter(Boolean);
  if (segments.length <= 1) return; // No ancestors

  for (let depth = segments.length - 1; depth >= 1; depth--) {
    const parentJournalId = segments.slice(0, depth).join("/");
    const structure = getJournalStructure(projectDir, epicId, parentJournalId);
    if (!structure.task) break;

    await rollUpSingleAncestor(
      projectDir,
      epicId,
      parentJournalId,
      checkpointMgr,
    );
  }
}

/**
 * Helper: Roll up a single ancestor (check if all subtasks done, mark complete/failed).
 * Extracted to reduce duplication between Unit and legacy paths.
 */
async function rollUpSingleAncestor(
  projectDir: string,
  epicId: string,
  parentJournalId: string,
  checkpointMgr: CheckpointManager,
): Promise<void> {
  const structure = getJournalStructure(projectDir, epicId, parentJournalId);
  if (!structure.task) return;

  // Two ways to find this parent's children:
  //   1. wbs.json (when the parent spawned children dynamically via WBS)
  //   2. Folder scan of <parentTaskDir>/tasks/* (for static parents whose
  //      children come from playbook task definitions)
  // Try wbs.json first; fall back to folder scan when missing.
  const wbsFile = path.join(structure.task, "wbs.json");
  let subtaskSimpleIds: string[] = [];

  if (existsSync(wbsFile)) {
    try {
      const wbs = JSON.parse(await readFile(wbsFile, "utf-8")) as {
        spawnCount: number;
        subtasks: Array<{ id: string }>;
      };
      subtaskSimpleIds = wbs.subtasks.map((s) => s.id);
    } catch {
      return; // Malformed wbs.json
    }
  } else {
    // Static parent: derive children from the journal `tasks/` subdir.
    // Each child must have its own checkpoint.json to be considered seeded.
    const tasksDir = path.join(structure.task, "tasks");
    if (!existsSync(tasksDir)) return; // No children — nothing to roll up
    try {
      subtaskSimpleIds = readdirSync(tasksDir).filter((name) => {
        const full = path.join(tasksDir, name);
        if (!statSync(full).isDirectory()) return false;
        return existsSync(path.join(full, "checkpoint.json"));
      });
    } catch {
      return;
    }
    if (subtaskSimpleIds.length === 0) return; // No materialized children
  }

  const subtaskJournalIds = subtaskSimpleIds.map(
    (id) => `${parentJournalId}/${id}`,
  );

  // Read latest global checkpoint
  const checkpoint = await checkpointMgr.load();
  if (!checkpoint) return;

  let completedSet: Set<string>;
  let failedSet: Set<string>;

  if (checkpoint.version === 1) {
    completedSet = new Set(checkpoint.completedTasks);
    failedSet = new Set(checkpoint.failedTasks ?? []);
  } else {
    // V2 - use CheckpointManager methods
    const completed = await checkpointMgr.getCompletedTasks();
    const failed = await checkpointMgr.getFailedTasks();
    completedSet = new Set(completed);
    failedSet = new Set(failed);
  }

  // Check for subtasks in both hierarchical and flat formats
  // Map flat IDs to hierarchical IDs for consistent tracking
  const subtaskIdMap = new Map<string, string>(); // hierarchical -> actual ID in checkpoint
  for (let i = 0; i < subtaskJournalIds.length; i++) {
    const hierarchical = subtaskJournalIds[i];
    const simple = subtaskSimpleIds[i];

    // Check which format exists in the checkpoint
    if (completedSet.has(hierarchical) || failedSet.has(hierarchical)) {
      subtaskIdMap.set(hierarchical, hierarchical);
    } else if (completedSet.has(simple) || failedSet.has(simple)) {
      // Found in flat format - map it
      subtaskIdMap.set(hierarchical, simple);
      // Promote simple ID to completed/failed set under hierarchical key for rollup logic
      if (completedSet.has(simple)) completedSet.add(hierarchical);
      if (failedSet.has(simple)) failedSet.add(hierarchical);
    } else {
      // Not in global checkpoint — fall back to per-task checkpoints.
      // Try the unit-level checkpoint (the on-disk source of truth that
      // FilesystemTaskStatus scans) at the FULL hierarchical path first.
      // Then try the legacy TaskCheckpointManager.
      let resolvedStatus: string | undefined;
      try {
        const unitCkpt = new UnitCheckpointManager(
          projectDir,
          "task",
          epicId,
          hierarchical,
        );
        const unitCheckpoint = await unitCkpt.load();
        if (unitCheckpoint) {
          resolvedStatus = unitCheckpoint.status;
        }
      } catch {
        // ignore — fall through to legacy lookup
      }

      if (!resolvedStatus) {
        const taskCkpt = new TaskCheckpointManager(projectDir, epicId, simple);
        const taskCheckpoint = await taskCkpt.load();
        resolvedStatus = taskCheckpoint?.status;
      }

      if (resolvedStatus === "complete") {
        completedSet.add(hierarchical);
        subtaskIdMap.set(hierarchical, simple);
        await checkpointMgr.markTaskCompleted(simple, epicId);
        console.log(
          `  ↻ Synced completed task to global checkpoint: ${simple}`,
        );
      } else if (resolvedStatus === "failed") {
        failedSet.add(hierarchical);
        subtaskIdMap.set(hierarchical, simple);
        await checkpointMgr.markTaskFailed(simple, epicId);
        console.log(`  ↻ Synced failed task to global checkpoint: ${simple}`);
      }
    }
  }

  const allDone = subtaskJournalIds.every(
    (id) => completedSet.has(id) || failedSet.has(id),
  );

  // Diagnostic logging
  console.log(`  Checking parent: ${parentJournalId}`);
  console.log(`    Subtasks: ${subtaskJournalIds.join(", ")}`);
  console.log(
    `    Completed: ${
      Array.from(completedSet)
        .filter((id) => subtaskJournalIds.includes(id))
        .join(", ") || "none"
    }`,
  );
  console.log(
    `    Failed: ${
      Array.from(failedSet)
        .filter((id) => subtaskJournalIds.includes(id))
        .join(", ") || "none"
    }`,
  );
  console.log(`    All done: ${allDone}`);

  if (!allDone) return; // Some subtasks still pending — can't roll up

  const anyFailed = subtaskJournalIds.some((id) => failedSet.has(id));

  // Update global checkpoint
  if (anyFailed) {
    await checkpointMgr.markTaskFailed(parentJournalId, epicId);
  } else {
    await checkpointMgr.markTaskCompleted(parentJournalId, epicId);
  }

  // Update the parent's own TaskCheckpoint status (legacy file)
  const taskCkpt = new TaskCheckpointManager(
    projectDir,
    epicId,
    parentJournalId,
  );
  const taskCheckpoint = await taskCkpt.load();
  if (taskCheckpoint) {
    taskCheckpoint.status = anyFailed ? "failed" : "complete";
    await taskCkpt.save(taskCheckpoint);
  }

  // Update the parent's UnitCheckpoint — this is what FilesystemTaskStatus
  // reads, so without this the parent stays "seeded"/"pending" in status
  // commands and downstream WBS rollups never see the parent as complete.
  const doneCount = subtaskJournalIds.filter((id) =>
    completedSet.has(id),
  ).length;
  try {
    const parentUnitCkpt = new UnitCheckpointManager(
      projectDir,
      "task",
      epicId,
      parentJournalId,
    );
    await parentUnitCkpt.updateProgress({
      totalChildren: subtaskJournalIds.length,
      completedChildren: doneCount,
      failedChildren: subtaskJournalIds.filter((id) => failedSet.has(id))
        .length,
      childIds: subtaskSimpleIds,
      lastProgressUpdate: new Date().toISOString(),
    });
  } catch (err) {
    console.warn(
      `  ⚠ Failed to update parent UnitCheckpoint for ${parentJournalId}: ${
        (err as Error).message
      }`,
    );
  }
  console.log(
    `↑ Auto-${anyFailed ? "failed" : "completed"} parent: ${parentJournalId}` +
      ` (${doneCount}/${subtaskJournalIds.length} subtasks done)`,
  );
}
