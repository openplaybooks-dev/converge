/**
 * Ensure Epic Checkpoints
 *
 * Creates checkpoint.json for epics if they don't exist.
 * Epics track their child tasks' progress.
 */

import { UnitCheckpointManager } from "./unit-checkpoint.ts";
import type { TaskNode } from "../cli/next-task.ts";

/**
 * Ensure all epics have checkpoints (ONLY if they already exist)
 *
 * This function should only create checkpoints for epics that:
 * 1. Already have an existing checkpoint file
 * 2. Have been previously executed
 *
 * It should NOT create checkpoints for pending epics that have never been started.
 */
export async function ensureEpicCheckpoints(
  projectDir: string,
  tree: TaskNode[],
): Promise<void> {
  const epicIds = [...new Set(tree.map((n) => n.epicId))];

  for (const epicId of epicIds) {
    const epicCkpt = new UnitCheckpointManager(projectDir, "epic", epicId);
    const existing = await epicCkpt.load();

    // Only update existing checkpoints - don't create new ones for pending epics
    if (existing) {
      // Checkpoint exists, ensure it's valid and up-to-date
      // No action needed - it's already loaded and valid
      // console.log(`  ✓ Loaded epic checkpoint: ${epicId}`);
    }
    // If no checkpoint exists, this epic has never been started
    // Don't create a checkpoint file for it
  }
}

/**
 * Update epic progress based on its TOP-LEVEL tasks only
 * (exclude subtasks that are children of other tasks)
 * Only updates if epic checkpoint already exists
 */
export async function updateEpicProgress(
  projectDir: string,
  epicId: string,
  tree: TaskNode[],
  completedSet: Set<string>,
  failedSet: Set<string>,
): Promise<void> {
  // Only update if epic checkpoint already exists
  const epicCkpt = new UnitCheckpointManager(projectDir, "epic", epicId);
  const existing = await epicCkpt.load();
  if (!existing) {
    // Epic checkpoint doesn't exist - don't create it
    return;
  }

  // Get all tasks in this epic
  const allEpicTasks = tree.filter((n) => n.epicId === epicId);

  // Build set of all child task IDs (tasks that have a parent)
  const allChildTaskIds = new Set<string>();
  for (const task of allEpicTasks) {
    if (task.parentTaskId) {
      allChildTaskIds.add(task.taskId);
    }
  }

  // Also check folder structure for direct nesting (tasks nested under other tasks)
  for (const task of allEpicTasks) {
    const taskDir = task.filePath.substring(0, task.filePath.lastIndexOf("/"));
    const directChildren = allEpicTasks.filter(
      (other) =>
        other !== task &&
        !other.parentTaskId && // Only consider tasks without explicit parentTaskId
        other.filePath.startsWith(taskDir + "/") &&
        other.filePath.substring(0, other.filePath.lastIndexOf("/")) !==
          taskDir, // Direct children only
    );
    for (const child of directChildren) {
      allChildTaskIds.add(child.taskId);
    }
  }

  // Top-level tasks are those that are NOT children
  const topLevelTasks = allEpicTasks.filter(
    (n) => !allChildTaskIds.has(n.taskId),
  );

  const totalTasks = topLevelTasks.length;
  const completedTasks = topLevelTasks.filter((n) =>
    completedSet.has(n.journalTaskId),
  ).length;
  const failedTasks = topLevelTasks.filter((n) =>
    failedSet.has(n.journalTaskId),
  ).length;

  // updateProgress will only save if values have actually changed
  await epicCkpt.updateProgress({
    totalChildren: totalTasks,
    completedChildren: completedTasks,
    failedChildren: failedTasks,
    childIds: topLevelTasks.map((n) => n.taskId),
    lastProgressUpdate: new Date().toISOString(),
  });
}
