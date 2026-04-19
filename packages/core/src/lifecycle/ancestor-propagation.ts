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

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getJournalStructure } from "../journal/structure.ts";
import { CheckpointManager } from "../checkpoint/manager.ts";
import { TaskCheckpointManager } from "../checkpoint/task-checkpoint.ts";
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

      const wbsFile = path.join(structure.task, "wbs.json");
      if (!existsSync(wbsFile)) break; // Not a WBS parent — stop rolling up

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

    const wbsFile = path.join(structure.task, "wbs.json");
    if (!existsSync(wbsFile)) break; // Not a WBS parent — stop rolling up

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

  const wbsFile = path.join(structure.task, "wbs.json");
  if (!existsSync(wbsFile)) return;

  let wbs: { spawnCount: number; subtasks: Array<{ id: string }> };
  try {
    wbs = JSON.parse(await readFile(wbsFile, "utf-8"));
  } catch {
    return; // Malformed wbs.json
  }

  // Build the journalTaskId for each spawned subtask
  // WBS subtasks can be stored in two formats in the global checkpoint:
  // 1. Hierarchical: "parent-id/child-id" (when parentTaskId is set in discovery)
  // 2. Flat: "child-id" (when tasks are direct children without /task/ pattern)
  // We need to check both formats for backward compatibility
  const subtaskJournalIds = wbs.subtasks.map(
    (s) => `${parentJournalId}/${s.id}`,
  );
  const subtaskSimpleIds = wbs.subtasks.map((s) => s.id);

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
      // Not in global checkpoint - check task-level checkpoint using simple ID
      const taskCkpt = new TaskCheckpointManager(projectDir, epicId, simple);
      const taskCheckpoint = await taskCkpt.load();

      if (taskCheckpoint) {
        if (taskCheckpoint.status === "complete") {
          completedSet.add(hierarchical);
          subtaskIdMap.set(hierarchical, simple);
          // Also add to global checkpoint using the actual ID (simple)
          await checkpointMgr.markTaskCompleted(simple, epicId);
          console.log(
            `  ↻ Synced completed task to global checkpoint: ${simple}`,
          );
        } else if (taskCheckpoint.status === "failed") {
          failedSet.add(hierarchical);
          subtaskIdMap.set(hierarchical, simple);
          // Also add to global checkpoint using the actual ID (simple)
          await checkpointMgr.markTaskFailed(simple, epicId);
          console.log(`  ↻ Synced failed task to global checkpoint: ${simple}`);
        }
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

  // Update the parent's own TaskCheckpoint status
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

  const doneCount = subtaskJournalIds.filter((id) =>
    completedSet.has(id),
  ).length;
  console.log(
    `↑ Auto-${anyFailed ? "failed" : "completed"} parent: ${parentJournalId}` +
      ` (${doneCount}/${subtaskJournalIds.length} subtasks done)`,
  );
}
