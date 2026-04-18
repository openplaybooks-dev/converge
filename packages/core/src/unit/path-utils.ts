/**
 * Path Utilities - Consistent Path Resolution for WBS Hierarchies
 *
 * Provides shared utilities for extracting task IDs, epic IDs, and parent context
 * from file paths. Ensures consistent behavior across Unit creation, context creation,
 * and task execution.
 *
 * Key principles:
 * - Path is the single source of truth
 * - Parent context is detected from /task/ segments in paths
 * - journalTaskId preserves full hierarchy (e.g., "parent/child")
 * - Epic structure is mirrored exactly in journal structure
 */

import * as path from "node:path";

/**
 * Extract full hierarchical journal task ID from a task path.
 *
 * Strips /tasks/ directory markers to build hierarchical parent-child relationships.
 *
 * Examples:
 *   .../epics/03-app/002-pages/TASK.md
 *     → "002-pages"
 *
 *   .../epics/03-app/tasks/002-pages/TASK.md
 *     → "03-app/002-pages"  (epic-root is parent when tasks/ is first)
 *
 *   .../epics/03-app/002-pages/tasks/002-001-home/TASK.md
 *     → "002-pages/002-001-home"
 *
 *   .../epics/03-app/tasks/002-pages/tasks/002-001-home/TASK.md
 *     → "03-app/002-pages/002-001-home"  (epic-root + both tasks/ stripped)
 *
 * @param taskPath - Absolute or relative path to task file or directory
 * @returns Full hierarchical task ID for parent-child relationships
 */
export function extractJournalTaskId(taskPath: string): string {
  // Normalize path separators
  const normalizedPath = taskPath.split(path.sep).join("/");
  const parts = normalizedPath.split("/");

  // Try playbook path first: .converge/playbooks/{name}/tasks/{taskId}/TASK.md
  const playbooksIndex = parts.indexOf("playbooks");
  if (
    playbooksIndex !== -1 &&
    playbooksIndex + 2 < parts.length &&
    parts[playbooksIndex + 2] === "tasks"
  ) {
    // Segments after playbooks/{name}/tasks/
    const taskSegments = parts.slice(playbooksIndex + 3);
    const hierarchicalSegments: string[] = [];
    for (const segment of taskSegments) {
      if (
        segment === "tasks" ||
        segment.endsWith(".ts") ||
        segment.endsWith(".md")
      ) {
        continue;
      }
      hierarchicalSegments.push(segment);
    }
    if (hierarchicalSegments.length === 0) {
      return parts[playbooksIndex + 1]; // playbook name as fallback
    }
    return hierarchicalSegments.join("/");
  }

  // Find epics directory index
  const epicsIndex = parts.indexOf("epics");
  if (epicsIndex === -1) {
    throw new Error(`Invalid task path (no 'epics' directory): ${taskPath}`);
  }

  // Validate that we have an epic ID
  if (epicsIndex + 1 >= parts.length) {
    throw new Error(
      `Invalid task path (no epic ID after 'epics'): ${taskPath}`,
    );
  }

  // Everything after the epic ID is part of the task hierarchy
  const epicId = parts[epicsIndex + 1];
  const taskSegments = parts.slice(epicsIndex + 2); // Skip 'epics' and epic ID

  // When the first segment after the epic ID is 'tasks/', the epic-root task
  // (TASK.md in the epic dir) is the parent of these children.
  // Prepend epicId so children get hierarchical IDs like "03-build-screens/001-home-skill-tree".
  const startsWithTasks =
    taskSegments.length > 0 && taskSegments[0] === "tasks";

  // Build hierarchical ID by joining segments, skipping 'tasks' directory markers
  // to create clean parent-child relationships (e.g., "parent/child")
  const hierarchicalSegments: string[] = [];
  if (startsWithTasks) {
    hierarchicalSegments.push(epicId);
  }
  for (const segment of taskSegments) {
    // Skip 'tasks' directory markers and file names
    if (
      segment === "tasks" ||
      segment.endsWith(".ts") ||
      segment.endsWith(".md")
    ) {
      continue;
    }
    hierarchicalSegments.push(segment);
  }

  // Epic-level task: TASK.md sits directly in the epic folder (no task subfolders)
  // Use the epic ID as the task ID
  if (hierarchicalSegments.length === 0) {
    return epicId;
  }

  return hierarchicalSegments.join("/");
}

/**
 * Extract epic ID from task path.
 *
 * @param taskPath - Absolute or relative path to task file or directory
 * @returns Epic ID (e.g., "03-implement-app")
 */
export function extractEpicId(taskPath: string): string {
  const normalizedPath = taskPath.split(path.sep).join("/");
  const parts = normalizedPath.split("/");

  // Try playbook path: .converge/playbooks/{name}/tasks/...
  // Use the playbook name as the epic ID
  const playbooksIndex = parts.indexOf("playbooks");
  if (playbooksIndex !== -1 && playbooksIndex + 1 < parts.length) {
    return parts[playbooksIndex + 1];
  }

  const epicsIndex = parts.indexOf("epics");

  if (epicsIndex === -1) {
    throw new Error(`Invalid task path (no 'epics' directory): ${taskPath}`);
  }

  const epicId = parts[epicsIndex + 1];
  if (!epicId) {
    throw new Error(
      `Invalid task path (no epic ID after 'epics'): ${taskPath}`,
    );
  }

  return epicId;
}

/**
 * Extract epic directory path from task path.
 *
 * @param taskPath - Absolute or relative path to task file or directory
 * @returns Absolute path to epic directory
 */
export function extractEpicDir(taskPath: string): string {
  const normalizedPath = taskPath.split(path.sep).join("/");
  const parts = normalizedPath.split("/");

  // Try playbook path: .converge/playbooks/{name}/tasks/...
  // The "epic dir" equivalent is .converge/playbooks/{name}/tasks/
  const playbooksIndex = parts.indexOf("playbooks");
  if (
    playbooksIndex !== -1 &&
    playbooksIndex + 2 < parts.length &&
    parts[playbooksIndex + 2] === "tasks"
  ) {
    return parts.slice(0, playbooksIndex + 3).join("/");
  }

  const epicsIndex = parts.indexOf("epics");

  if (epicsIndex === -1) {
    throw new Error(`Invalid task path (no 'epics' directory): ${taskPath}`);
  }

  // Epic directory is at epicsIndex + 1
  const epicDirParts = parts.slice(0, epicsIndex + 2);
  return epicDirParts.join("/");
}

/**
 * Extract leaf task ID from task path (just the immediate directory name).
 *
 * @param taskPath - Absolute or relative path to task file or directory
 * @returns Leaf task ID (e.g., "002-001-home")
 */
export function extractLeafTaskId(taskPath: string): string {
  const normalizedPath = taskPath.split(path.sep).join("/");
  const parts = normalizedPath.split("/");

  // Find the last segment that looks like a task ID (numbered prefix)
  for (let i = parts.length - 1; i >= 0; i--) {
    const segment = parts[i];
    // Skip empty segments, file names, and 'tasks' markers
    // Note: Using 'tasks' (plural) because there are always multiple subtasks
    if (
      !segment ||
      segment.endsWith(".ts") ||
      segment.endsWith(".md") ||
      segment === "tasks"
    ) {
      continue;
    }
    // Check if it has a numbered prefix (e.g., "002-pages" or "002-001-home")
    if (/^\d{2,3}-/.test(segment)) {
      return segment;
    }
  }

  throw new Error(`Invalid task path (no task ID found): ${taskPath}`);
}

/**
 * Extract parent task ID from task path (if this is a subtask).
 *
 * Returns undefined for root tasks.
 *
 * @param taskPath - Absolute or relative path to task file or directory
 * @returns Parent task ID, or undefined if this is a root task
 */
export function extractParentTaskId(taskPath: string): string | undefined {
  const normalizedPath = taskPath.split(path.sep).join("/");
  const parts = normalizedPath.split("/");

  // Find all 'tasks' directory markers (plural - there are always multiple subtasks)
  const tasksIndices: number[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === "tasks") {
      tasksIndices.push(i);
    }
  }

  // If there are no 'tasks' markers, this is a root task
  if (tasksIndices.length === 0) {
    return undefined;
  }

  // The parent is the segment immediately before the last 'tasks' marker
  const lastTasksIndex = tasksIndices[tasksIndices.length - 1];
  const parentSegment = parts[lastTasksIndex - 1];

  // Validate it's a task ID (has numbered prefix)
  if (parentSegment && /^\d{2,3}-/.test(parentSegment)) {
    return parentSegment;
  }

  return undefined;
}

/**
 * Construct journal path from task path.
 *
 * Journal structure mirrors the epic structure EXACTLY (no extra subdirectories):
 *   .converge/epics/03-app/002-pages
 *   → .converge/journal/tasks/03-app/002-pages
 *
 *   .converge/epics/03-app/002-pages/tasks/002-001-home
 *   → .converge/journal/tasks/03-app/002-pages/tasks/002-001-home
 *
 *   .converge/epics/03-app/002-pages/tasks/002-001-home/TASK.md
 *   → .converge/journal/tasks/03-app/002-pages/tasks/002-001-home
 *
 * @param taskPath - Absolute or relative path to task file or directory
 * @returns Journal path (mirrors epic structure with journal/tasks/ root)
 */
export function constructJournalPath(taskPath: string): string {
  const normalizedPath = taskPath.split(path.sep).join("/");
  const parts = normalizedPath.split("/");

  // Try playbook path: .converge/playbooks/{name}/tasks/...
  // → .converge/journal/{name}/tasks/...
  const playbooksIndex = parts.indexOf("playbooks");
  if (
    playbooksIndex !== -1 &&
    playbooksIndex + 2 < parts.length &&
    parts[playbooksIndex + 2] === "tasks"
  ) {
    const playbookName = parts[playbooksIndex + 1];
    const journalParts = [
      ...parts.slice(0, playbooksIndex),
      "journal",
      playbookName,
      "tasks",
      ...parts.slice(playbooksIndex + 3),
    ];
    const lastPart = journalParts[journalParts.length - 1];
    if (lastPart && (lastPart.endsWith(".md") || lastPart.endsWith(".ts"))) {
      journalParts.pop();
    }
    return journalParts.join("/");
  }

  const epicsIndex = parts.indexOf("epics");

  if (epicsIndex === -1) {
    throw new Error(`Invalid task path (no 'epics' directory): ${taskPath}`);
  }

  // Replace 'epics' with 'journal/{playbook}/tasks/'
  const playbook = process.env.CONVERGE_PLAYBOOK ?? "default";
  const journalParts = [
    ...parts.slice(0, epicsIndex),
    "journal",
    playbook,
    "tasks",
    ...parts.slice(epicsIndex + 1),
  ];

  // Remove file extensions if present (TASK.md, task.ts)
  const lastPart = journalParts[journalParts.length - 1];
  if (lastPart && (lastPart.endsWith(".md") || lastPart.endsWith(".ts"))) {
    journalParts.pop();
  }

  return journalParts.join("/");
}

/**
 * Resolve TASK.md file path from task directory.
 *
 * @param taskDir - Absolute path to task directory
 * @returns Absolute path to TASK.md file
 */
export function resolveTaskMdPath(taskDir: string): string {
  return path.join(taskDir, "TASK.md");
}
