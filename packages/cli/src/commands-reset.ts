/**
 * Reset Command - Enhanced Version
 *
 * Removes journals and WBS-generated tasks to allow clean re-execution.
 */

import { existsSync, mkdirSync } from "node:fs";
import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, dirname, basename } from "node:path";
import { resolve } from "node:path";
import type { CommonOptions } from "./commands.ts";
import { getJournalRoot, getEpicsDir } from "@converge/core/journal/structure.ts";

export interface ResetOptions extends CommonOptions {
  /** Delete output files */
  outputs?: boolean;
  /** Delete WBS-generated task files */
  wbs?: boolean;
  /** Full reset: --outputs + --wbs */
  all?: boolean;
}

/**
 * Reset one or more tasks to re-run them.
 *
 * Usage:
 *   converge reset 003-generate-html-designs
 *   converge reset 003-generate-html-designs --outputs
 *   converge reset 003-generate-html-designs --wbs
 *   converge reset 003-generate-html-designs --all  # outputs + wbs
 *   converge reset --all  # reset entire project
 */
export async function resetCommand(
  taskIds: string[],
  options: ResetOptions = {},
): Promise<void> {
  // Handle --all flag (full project reset)
  if (options.all && taskIds.length === 0) {
    return resetProjectCommand(options);
  }

  if (taskIds.length === 0) {
    console.error(
      "❌ Usage: converge reset <taskId> [taskId...] [--outputs] [--wbs] [--all]",
    );
    console.error("");
    console.error("Options:");
    console.error("  --outputs  Delete task output files");
    console.error("  --wbs      Delete WBS-generated task files");
    console.error("  --all      Full reset (--outputs + --wbs)");
    console.error("");
    console.error("Examples:");
    console.error("  converge reset 003-generate-html-designs");
    console.error("  converge reset 003-generate-html-designs --all");
    console.error("  converge reset --all  # reset entire project");
    process.exit(1);
  }

  // If --all is specified with task IDs, enable all cleanup options
  if (options.all) {
    options.outputs = true;
    options.wbs = true;
  }

  const projectDir = resolve(options.dir || process.cwd());
  const { CheckpointManager } = await import("@converge/core/checkpoint/manager.ts");

  const checkpointMgr = new CheckpointManager(projectDir);
  const checkpoint = await checkpointMgr.load();

  if (!checkpoint) {
    console.log("ℹ️  No checkpoint found — nothing to reset.");
    return;
  }

  console.log(`\n🔄 Resetting ${taskIds.length} task(s)...\n`);

  for (const taskId of taskIds) {
    await resetSingleTask(
      taskId,
      projectDir,
      checkpoint,
      checkpointMgr,
      options,
    );
  }

  // Save updated checkpoint
  checkpoint.timestamp = new Date().toISOString();
  await checkpointMgr.save(checkpoint);
  console.log("\n✅ Checkpoint updated");

  // Print summary
  console.log("");
  if (options.outputs) {
    console.log("💡 Output files deleted. Task will regenerate from scratch.");
  }
  if (options.wbs) {
    console.log(
      "💡 WBS-generated task files deleted. Parent will re-spawn children.",
    );
  }
  if (!options.outputs && !options.wbs) {
    console.log(
      "💡 Run: converge run --step   to re-execute the reset task(s)",
    );
    console.log("   Add --outputs to also delete generated output files.");
    console.log("   Add --wbs to also delete WBS-generated task files.");
    console.log("   Add --all for full reset (outputs + wbs).");
  } else {
    console.log("💡 Run: converge run   to re-execute from scratch");
  }
}

/**
 * Reset a single task.
 */
async function resetSingleTask(
  taskId: string,
  projectDir: string,
  checkpoint: any,
  checkpointMgr: any,
  options: ResetOptions,
): Promise<void> {
  console.log(`📋 Resetting: ${taskId}`);

  const journalDir = getJournalRoot(projectDir);
  const epicsDir = join(projectDir, ".converge", "epics");
  const journalEpicsDir = getEpicsDir(projectDir);

  // Find task's journal directory and epic
  const taskJournalDir = await findTaskJournalDir(journalEpicsDir, taskId);
  const epicId = taskJournalDir
    ? await getEpicIdFromJournalPath(taskJournalDir)
    : null;

  // 1. Remove from checkpoint (all tracking sets)
  let removed = false;
  const toRemove = [taskId];

  // Also include journal task ID if found
  if (taskJournalDir) {
    const journalTaskId = getJournalTaskIdFromPath(taskJournalDir);
    if (journalTaskId) toRemove.push(journalTaskId);
  }

  if (checkpoint.version === 1) {
    // V1 - modify arrays directly
    for (const id of toRemove) {
      if (checkpoint.completedTasks.includes(id)) {
        checkpoint.completedTasks = checkpoint.completedTasks.filter(
          (t: string) => t !== id,
        );
        removed = true;
      }
      if (checkpoint.failedTasks && checkpoint.failedTasks.includes(id)) {
        checkpoint.failedTasks = checkpoint.failedTasks.filter(
          (t: string) => t !== id,
        );
        removed = true;
      }
      if (checkpoint.seededTasks && checkpoint.seededTasks.includes(id)) {
        checkpoint.seededTasks = checkpoint.seededTasks.filter(
          (t: string) => t !== id,
        );
        removed = true;
      }
      if (checkpoint.lockedTasks.includes(id)) {
        checkpoint.lockedTasks = checkpoint.lockedTasks.filter(
          (t: string) => t !== id,
        );
        removed = true;
      }
    }
  } else if (checkpoint.version === 2) {
    // V2 - use CheckpointManager methods
    for (const id of toRemove) {
      try {
        await checkpointMgr.removeFromCompleted(id, epicId ?? undefined);
        removed = true;
      } catch {
        // Task might not exist in checkpoint
      }
    }
  }

  if (removed) {
    console.log("   ✅ Removed from checkpoint");
  } else {
    console.log("   ℹ️  Not found in checkpoint (already unlocked)");
  }

  // 2. Delete entire journal directory for this task (includes WBS children)
  if (taskJournalDir && existsSync(taskJournalDir)) {
    await rm(taskJournalDir, { recursive: true, force: true });
    console.log("   ✅ Deleted journal directory (including WBS children)");
  } else {
    console.log("   ℹ️  No journal directory found");
  }

  // 3. Delete WBS-generated task files (if --wbs or --all)
  if (options.wbs && epicId) {
    const wbsTaskDir = join(epicsDir, epicId, taskId, "task");
    if (existsSync(wbsTaskDir)) {
      const wbsFiles = await readdir(wbsTaskDir, { recursive: true });
      await rm(wbsTaskDir, { recursive: true, force: true });
      console.log(
        `   ✅ Deleted WBS task directory (${wbsFiles.length} files)`,
      );
    } else {
      console.log("   ℹ️  No WBS tasks found");
    }
  }

  // 4. Delete output files (if --outputs or --all)
  if (options.outputs && taskJournalDir) {
    await deleteTaskOutputs(taskJournalDir, projectDir);
  }

  console.log(`   ✔  ${taskId} reset complete\n`);
}

/**
 * Find the journal directory for a given task ID.
 * Searches recursively through epics to find matching task.
 */
async function findTaskJournalDir(
  epicsDir: string,
  taskId: string,
): Promise<string | null> {
  if (!existsSync(epicsDir)) return null;

  async function search(dir: string): Promise<string | null> {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        // Check if this directory name matches the task ID
        if (
          entry.name === taskId ||
          entry.name.endsWith(`-${taskId}`) ||
          entry.name.includes(`/${taskId}`)
        ) {
          return fullPath;
        }

        // Recursively search subdirectories
        const result = await search(fullPath);
        if (result) return result;
      }
    }

    return null;
  }

  return search(epicsDir);
}

/**
 * Extract epic ID from journal path.
 * Path format: .converge/journal/tasks/{epicId}/tasks/{taskId}
 */
async function getEpicIdFromJournalPath(
  journalPath: string,
): Promise<string | null> {
  const parts = journalPath.split("/");
  // Journal path: ...journal/tasks/{epicId}/... or ...journal/{playbook}/tasks/{epicId}/...
  // Find 'journal' then look for the first directory after the 'tasks' segment that follows it
  const journalIdx = parts.lastIndexOf("journal");
  if (journalIdx === -1) return null;

  // Walk forward from journal to find the 'tasks' segment, then the epicId after it
  for (let i = journalIdx + 1; i < parts.length - 1; i++) {
    if (parts[i] === "tasks") {
      return parts[i + 1] || null;
    }
  }
  return null;
}

/**
 * Extract journal task ID from path.
 * Handles nested WBS tasks with "/" separator.
 */
function getJournalTaskIdFromPath(journalPath: string): string | null {
  const parts = journalPath.split("/");
  const tasksIndex = parts.findIndex((p) => p === "tasks");
  if (tasksIndex === -1 || tasksIndex + 1 >= parts.length) return null;

  // Get all parts after 'tasks' directory
  const taskParts = parts.slice(tasksIndex + 1);

  // For WBS children, join with '/' to get journalTaskId format
  // e.g., "003-generate-html-designs/003-001-design-home"
  if (taskParts.length > 1) {
    return taskParts.join("/");
  }

  return taskParts[0];
}

/**
 * Delete output files declared in the task's journal.
 */
async function deleteTaskOutputs(
  taskJournalDir: string,
  projectDir: string,
): Promise<void> {
  // Check for wbs.json (WBS parent tasks)
  const wbsFile = join(taskJournalDir, "wbs.json");
  if (existsSync(wbsFile)) {
    const wbs = JSON.parse(await readFile(wbsFile, "utf-8"));
    if (wbs.subtasks && Array.isArray(wbs.subtasks)) {
      for (const subtask of wbs.subtasks) {
        if (subtask.writeToPath) {
          const abs = join(projectDir, subtask.writeToPath);
          if (existsSync(abs)) {
            await rm(dirname(abs), { recursive: true, force: true });
            console.log(`   🗑️  Deleted WBS output: ${subtask.writeToPath}`);
          }
        }
      }
    }
  }

  // Check for status.json (regular tasks)
  const statusFile = join(taskJournalDir, "status.json");
  if (existsSync(statusFile)) {
    const status = JSON.parse(await readFile(statusFile, "utf-8"));

    // Delete outputs from checklist
    if (status.checklist && Array.isArray(status.checklist)) {
      for (const item of status.checklist) {
        if (item.type === "output" && item.details) {
          const pattern = item.details;

          if (pattern.includes("*") || pattern.includes("?")) {
            // Glob pattern
            const { glob } = await import("glob");
            const matches = await glob(pattern, { cwd: projectDir });
            for (const match of matches) {
              const abs = join(projectDir, match);
              if (existsSync(abs)) {
                await rm(abs, { force: true });
                console.log(`   🗑️  Deleted output: ${match}`);
              }
            }
          } else {
            // Single file
            const abs = join(projectDir, pattern);
            if (existsSync(abs)) {
              await rm(abs, { force: true });
              console.log(`   🗑️  Deleted output: ${pattern}`);
            }
          }
        }
      }
    }
  }
}

/**
 * Reset the entire project to initial state.
 * Deletes all journals, checkpoints, and WBS-generated tasks.
 */
async function resetProjectCommand(options: ResetOptions): Promise<void> {
  const projectDir = resolve(options.dir || process.cwd());
  const journalDir = getJournalRoot(projectDir);
  const checkpointFile = join(journalDir, ".checkpoint.json");

  console.log("\n⚠️  WARNING: Full project reset");
  console.log("This will delete:");
  console.log("  - All journal entries");
  console.log("  - All checkpoint data");
  console.log("  - All WBS-generated task files");
  if (options.outputs) {
    console.log("  - All task output files");
  }
  console.log("");

  // TODO: Add interactive confirmation
  // For now, just proceed with warning
  console.log("🔄 Resetting project...\n");

  // Delete entire journal directory
  if (existsSync(journalDir)) {
    await rm(journalDir, { recursive: true, force: true });
    console.log("✅ Deleted journal directory");
  }

  // Recreate journal structure
  const epicsRoot = getEpicsDir(projectDir);
  mkdirSync(epicsRoot, { recursive: true });
  console.log("✅ Recreated journal structure");

  // Create empty V2 checkpoint
  const { CheckpointManager } = await import("@converge/core/checkpoint/manager.ts");
  const checkpointMgr = new CheckpointManager(projectDir);
  await checkpointMgr.save({
    version: 2,
    timestamp: new Date().toISOString(),
    iteration: 0,
    totalGapsResolved: 0,
    totalErrors: 0,
    _cache: {
      completedCount: 0,
      failedCount: 0,
      lastScan: new Date().toISOString(),
    },
  });
  console.log("✅ Created fresh V2 checkpoint");

  // Delete all WBS task directories
  const epicsDir = join(projectDir, ".converge", "epics");
  if (existsSync(epicsDir)) {
    const epicDirs = await readdir(epicsDir, { withFileTypes: true });
    for (const epicEntry of epicDirs) {
      if (!epicEntry.isDirectory()) continue;

      const epicPath = join(epicsDir, epicEntry.name);
      const taskDirs = await readdir(epicPath, { withFileTypes: true });

      for (const taskEntry of taskDirs) {
        if (!taskEntry.isDirectory()) continue;

        const wbsDir = join(epicPath, taskEntry.name, "task");
        if (existsSync(wbsDir)) {
          await rm(wbsDir, { recursive: true, force: true });
          console.log(
            `✅ Deleted WBS tasks: ${epicEntry.name}/${taskEntry.name}/task/`,
          );
        }
      }
    }
  }

  console.log("\n✅ Project reset complete");
  console.log("💡 Run: converge run   to start fresh execution");
}
