/**
 * Tree Structure Utilities
 *
 * Utilities for task tree snapshotting, hashing, and discovery.
 * Supports the tree traversal cursor system.
 */

import { glob } from "glob";
import path from "node:path";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

/**
 * Task tree structure
 */
export interface TaskTree {
  /** Stable hash of tree structure */
  hash: string;

  /** All task paths discovered */
  taskPaths: string[];
}

/* ------------------------------------------------------------------ */
/*  Tree Hashing                                                      */
/* ------------------------------------------------------------------ */

/**
 * Generate hash of task tree structure
 *
 * Creates a deterministic hash from sorted task paths.
 * Used to detect structural changes between checkpoints.
 */
export function hashTaskTree(taskPaths: string[]): string {
  // Sort paths for deterministic hash
  const sorted = taskPaths.slice().sort();

  // Create stable representation
  const treeString = sorted.join("|");

  // Simple hash (32-bit FNV-1a variant)
  let hash = 0x811c9dc5;
  for (let i = 0; i < treeString.length; i++) {
    hash ^= treeString.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  // Convert to hex string
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/* ------------------------------------------------------------------ */
/*  Tree Discovery                                                    */
/* ------------------------------------------------------------------ */

/**
 * Discover task hierarchy from filesystem
 *
 * Walks the epic directory tree and finds all TASK.md files.
 * Returns a TaskTree with hash and paths.
 */
export async function discoverTaskHierarchy(
  epicPath: string,
): Promise<TaskTree> {
  const taskPaths: string[] = [];

  // Find all TASK.md files
  const taskMdFiles = await glob("**/TASK.md", {
    cwd: epicPath,
    absolute: false,
    ignore: ["node_modules/**", ".git/**", "**/subtask/**"],
  });

  // Make absolute
  taskPaths.push(...taskMdFiles.map((f) => path.join(epicPath, f)));

  return {
    hash: hashTaskTree(taskPaths),
    taskPaths,
  };
}

/**
 * Discover all task hierarchies for all epics
 *
 * Walks the entire .converge/epics directory and discovers task trees.
 */
export async function discoverAllTaskHierarchies(
  convergeDir: string,
): Promise<Map<string, TaskTree>> {
  const epicsDir = path.join(convergeDir, "epics");
  const epicDirs = await glob("*/", {
    cwd: epicsDir,
    absolute: false,
  });

  const trees = new Map<string, TaskTree>();

  for (const epicDir of epicDirs) {
    const epicId = epicDir.replace(/\/$/, "");
    const epicPath = path.join(epicsDir, epicDir);
    const tree = await discoverTaskHierarchy(epicPath);
    trees.set(epicId, tree);
  }

  return trees;
}

/* ------------------------------------------------------------------ */
/*  Path Analysis                                                     */
/* ------------------------------------------------------------------ */

/**
 * Extract task ID from file path
 *
 * Examples:
 *   .converge/epics/01-epic/003-task/TASK.md → "003-task"
 *   .converge/epics/01-epic/003-task/tasks/002-subtask/TASK.md → "002-subtask"
 */
export function extractTaskIdFromPath(filePath: string): string {
  const parts = filePath.split(path.sep);

  // Find the last directory component that looks like a task ID
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    // Match pattern: NNN-task-name
    if (/^\d{3}-/.test(part)) {
      return part;
    }
  }

  // Fallback: use the directory name of the file
  const dir = path.dirname(filePath);
  return path.basename(dir);
}

/**
 * Get parent task path from task path
 *
 * Walks up the directory tree to find the parent TASK.md.
 */
export function getParentTaskPath(
  taskPath: string,
  epicPath: string,
): string | null {
  const relativePath = path.relative(epicPath, taskPath);
  const parts = relativePath.split(path.sep);

  // Remove file name
  parts.pop();

  // Walk up to find parent
  while (parts.length > 0) {
    parts.pop();

    if (parts.length === 0) {
      // Reached epic root, no parent task
      return null;
    }

    const parentDir = path.join(epicPath, ...parts);

    // Check for TASK.md
    const taskMdPath = path.join(parentDir, "TASK.md");
    if (taskMdPath !== taskPath) {
      return taskMdPath;
    }
  }

  return null;
}

/**
 * Calculate depth of task in hierarchy
 *
 * Returns:
 *   0 = epic-level task (directly in epic directory)
 *   1 = subtask (nested once)
 *   2 = nested subtask (nested twice)
 *   etc.
 */
export function calculateTaskDepth(taskPath: string, epicPath: string): number {
  const relativePath = path.relative(epicPath, taskPath);
  const parts = relativePath.split(path.sep);

  // Remove file name
  parts.pop();

  // Count directories with task ID patterns (ignore 'tasks' folders)
  let depth = 0;
  for (const part of parts) {
    if (/^\d{3}-/.test(part)) {
      depth++;
    }
  }

  // Depth is count - 1 because first task is depth 0
  return Math.max(0, depth - 1);
}
