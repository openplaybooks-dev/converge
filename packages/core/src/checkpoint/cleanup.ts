/**
 * Journal Cleanup
 *
 * Automatically removes journal directories for tasks that no longer exist
 * in the .converge/epics folder structure. This prevents orphaned journals
 * from causing issues when tasks are renamed, deleted, or moved.
 */

import { readdirSync, statSync, existsSync } from "fs";
import { rm } from "fs/promises";
import path from "path";
import { getEpicsDir } from "../journal/structure.ts";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface CleanupResult {
  /** Number of orphaned journals removed */
  removed: number;
  /** Paths of removed journals */
  removedPaths: string[];
}

/* ------------------------------------------------------------------ */
/*  Journal Cleanup                                                    */
/* ------------------------------------------------------------------ */

export class JournalCleanup {
  private projectDir: string;
  private journalDir: string;
  private epicsDir: string;

  constructor(projectDir: string) {
    this.projectDir = projectDir;
    this.journalDir = getEpicsDir(projectDir);
    this.epicsDir = path.join(projectDir, ".converge", "epics");
  }

  /**
   * Remove journal directories for tasks that no longer exist.
   * Returns the list of removed paths.
   */
  async cleanupStaleJournals(): Promise<CleanupResult> {
    const removed: string[] = [];

    if (!existsSync(this.journalDir)) {
      return { removed: 0, removedPaths: [] };
    }

    // Get all valid epic IDs from epics folder
    const validEpicIds = this.getValidEpicIds();

    // Scan journal epics
    for (const epicId of readdirSync(this.journalDir)) {
      const epicJournalDir = path.join(this.journalDir, epicId);
      if (!statSync(epicJournalDir).isDirectory()) continue;

      // Epic deleted → remove entire journal epic folder
      if (!validEpicIds.has(epicId)) {
        await rm(epicJournalDir, { recursive: true, force: true });
        removed.push(`epics/${epicId}`);
        continue;
      }

      // Epic exists → check tasks
      const validTaskIds = this.getValidTaskIdsForEpic(epicId);
      await this.cleanupTasksInDirectory(
        epicJournalDir,
        epicId,
        "",
        validTaskIds,
        removed,
      );
    }

    return {
      removed: removed.length,
      removedPaths: removed,
    };
  }

  /**
   * Get all valid epic IDs from .converge/epics folder.
   */
  private getValidEpicIds(): Set<string> {
    const epicIds = new Set<string>();

    if (!existsSync(this.epicsDir)) return epicIds;

    for (const entry of readdirSync(this.epicsDir)) {
      const epicPath = path.join(this.epicsDir, entry);
      if (statSync(epicPath).isDirectory()) {
        epicIds.add(entry);
      }
    }

    return epicIds;
  }

  /**
   * Get all valid task IDs for an epic (includes WBS subtasks).
   */
  private getValidTaskIdsForEpic(epicId: string): Set<string> {
    const taskIds = new Set<string>();
    const epicDir = path.join(this.epicsDir, epicId);

    if (!existsSync(epicDir)) return taskIds;

    this.scanValidTasksInDirectory(epicDir, "", taskIds);

    return taskIds;
  }

  /**
   * Recursively scan for valid task IDs in epic directory.
   */
  private scanValidTasksInDirectory(
    dir: string,
    parentPath: string,
    taskIds: Set<string>,
  ): void {
    for (const entry of readdirSync(dir)) {
      const entryPath = path.join(dir, entry);
      if (!statSync(entryPath).isDirectory()) continue;

      // Skip internal directories
      if (entry === "materials" || entry === "examples") continue;

      // Check if this is a task directory (has task.ts or SKILL.md)
      const hasTaskFile =
        existsSync(path.join(entryPath, "task.ts")) ||
        existsSync(path.join(entryPath, "SKILL.md"));

      if (hasTaskFile) {
        const taskPath = parentPath ? `${parentPath}/${entry}` : entry;
        taskIds.add(taskPath);

        // Recursively scan tasks/ subdirectory for WBS subtasks
        const tasksSubdir = path.join(entryPath, "tasks");
        if (existsSync(tasksSubdir) && statSync(tasksSubdir).isDirectory()) {
          this.scanValidTasksInDirectory(tasksSubdir, taskPath, taskIds);
        }
      }
    }
  }

  /**
   * Recursively cleanup tasks in a journal directory.
   */
  private async cleanupTasksInDirectory(
    dir: string,
    epicId: string,
    parentPath: string,
    validTaskIds: Set<string>,
    removed: string[],
  ): Promise<void> {
    for (const entry of readdirSync(dir)) {
      const entryPath = path.join(dir, entry);
      if (!statSync(entryPath).isDirectory()) continue;

      // Skip internal directories (don't delete attempts/logs)
      if (entry === "attempts" || entry === "logs") continue;

      // Build task path
      const taskPath = parentPath ? `${parentPath}/${entry}` : entry;

      // Check if this is a valid task
      if (!validTaskIds.has(taskPath)) {
        // Task no longer exists → remove journal
        await rm(entryPath, { recursive: true, force: true });
        removed.push(`${epicId}/${taskPath}`);
        continue;
      }

      // Task exists → recursively check tasks/ subdirectory
      const tasksSubdir = path.join(entryPath, "tasks");
      if (existsSync(tasksSubdir) && statSync(tasksSubdir).isDirectory()) {
        await this.cleanupTasksInDirectory(
          tasksSubdir,
          epicId,
          taskPath,
          validTaskIds,
          removed,
        );
      }
    }
  }

  /**
   * Run cleanup with logging.
   */
  async run(verbose = false): Promise<CleanupResult> {
    const result = await this.cleanupStaleJournals();

    if (result.removed > 0) {
      console.log(`🧹 Cleaned up ${result.removed} orphaned journal(s)`);
      if (verbose) {
        for (const path of result.removedPaths) {
          console.log(`   - Removed: ${path}`);
        }
      }
    } else if (verbose) {
      console.log("✓ No orphaned journals found");
    }

    return result;
  }
}
