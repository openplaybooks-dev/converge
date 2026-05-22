/**
 * Path Utilities - Consistent Path Resolution for Seed Hierarchies
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
import { existsSync } from "node:fs";

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

  const collapseSpawned = (segments: string[]): string[] => {
    const ids: string[] = [];
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (segment.endsWith(".ts") || segment.endsWith(".md")) continue;
      if (segment === "tasks") continue;
      if (segment === "spawned") {
        const child = segments[i + 1];
        if (child && !child.endsWith(".ts") && !child.endsWith(".md")) {
          ids.push(child);
          i++;
        }
        continue;
      }
      ids.push(segment);
    }
    return ids;
  };

  // Try playbook path first: .converge/playbooks/{name}/...
  const playbooksIndex = parts.indexOf("playbooks");
  if (playbooksIndex !== -1 && playbooksIndex + 1 < parts.length) {
    const playbookName = parts[playbooksIndex + 1];
    const afterName = parts[playbooksIndex + 2];

    // Root TASK.md: playbooks/{name}/TASK.md → use playbook name as ID
    if (!afterName || afterName.endsWith(".md") || afterName.endsWith(".ts")) {
      return playbookName;
    }

    if (afterName === "tasks") {
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
        return playbookName; // playbook name as fallback
      }

      // When the playbook has a root TASK.md, children under tasks/
      // must be prefixed with the playbook name to establish parent-child
      // relationship in the tree (e.g. "self-improvement-loop/epoch-001").
      const playbookDir = parts.slice(0, playbooksIndex + 2).join(path.sep);
      const hasRootTaskMd = existsSync(path.join(playbookDir, "TASK.md"));
      if (hasRootTaskMd) {
        return [playbookName, ...hierarchicalSegments].join("/");
      }
      return hierarchicalSegments.join("/");
    }

    if (afterName === "templates") {
      // Template task: playbooks/{name}/templates/{templateName}/TASK.md
      // Journal path uses the task instance ID from inventory row, not template name.
      // The taskDef.id is passed via CONVERGE_TASK_ID env or ctx.journalTaskId.
      const taskId =
        process.env.CONVERGE_TASK_ID ||
        parts[playbooksIndex + 3] ||
        "unknown";
      const execId = process.env.CONVERGE_EXECUTION_ID;
      const tasksSegment = execId
        ? ["executions", execId, "tasks"]
        : ["tasks"];
      return [
        ...parts.slice(0, playbooksIndex),
        "journal",
        playbookName,
        ...tasksSegment,
        taskId,
      ].join("/");
    }
  }

  // Journal path: .converge/journal/{name}/tasks/{parent}/tasks/{child}/...
  // Journal mirrors the playbook — strip `tasks/` markers the same way.
  // When the playbook has a root TASK.md the ids are prefixed with the
  // playbook name to match the playbook-tree extractor's output.
  const journalIndex = parts.indexOf("journal");
  if (journalIndex !== -1 && journalIndex + 1 < parts.length) {
    const playbookName = parts[journalIndex + 1];
    const afterName = parts[journalIndex + 2];
    // Root TASK.md at journal/{name}/TASK.md (no `tasks/` wrapper yet).
    if (!afterName || afterName.endsWith(".md") || afterName.endsWith(".ts")) {
      return playbookName;
    }
    if (afterName === "tasks") {
      const taskSegments = parts.slice(journalIndex + 3);
      const hierarchicalSegments = collapseSpawned(taskSegments);
      if (hierarchicalSegments.length === 0) {
        return playbookName;
      }
      const journalDir = parts.slice(0, journalIndex + 2).join(path.sep);
      const hasRootTaskMd = existsSync(path.join(journalDir, "TASK.md"));
      if (hasRootTaskMd) {
        return [playbookName, ...hierarchicalSegments].join("/");
      }
      return hierarchicalSegments.join("/");
    }
    // Execution-scoped: journal/{playbook}/executions/{execId}/tasks/{...}/TASK.md
    if (afterName === "executions") {
      const execIdx = journalIndex + 2;
      // Skip "executions" and the execution ID, then find "tasks"
      const tasksIdx = parts.indexOf("tasks", execIdx + 1);
      if (tasksIdx !== -1) {
        const taskSegments = parts.slice(tasksIdx + 1);
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
        if (hierarchicalSegments.length > 0) {
          return hierarchicalSegments.join("/");
        }
      }
      return playbookName;
    }
  }

  // Spawned path: playbooks/{name}/spawned/{child}/... (dynamic seed children)
  if (playbooksIndex !== -1) {
    const afterName = parts[playbooksIndex + 2];
    if (afterName === "spawned") {
      const spawnedSegments = parts.slice(playbooksIndex + 3);
      const ids: string[] = [];
      for (const segment of spawnedSegments) {
        if (segment === "spawned" || segment.endsWith(".md")) continue;
        ids.push(segment);
      }
      if (ids.length > 0) return ids.join("/");
      return parts[playbooksIndex + 3] ?? parts[playbooksIndex + 1];
    }
  }

  // Inventory spawned path: .converge/inventory/{playbook}/spawned/{id}/...
  // Spawned tasks from `converge spawn task` land here.
  const inventoryIndex = parts.indexOf("inventory");
  if (inventoryIndex !== -1) {
    const afterInventory = parts[inventoryIndex + 2]; // {playbook}/spawned
    if (afterInventory === "spawned") {
      const spawnedSegments = parts.slice(inventoryIndex + 3);
      const ids: string[] = [];
      for (const segment of spawnedSegments) {
        if (segment === "spawned" || segment.endsWith(".md")) continue;
        ids.push(segment);
      }
      if (ids.length > 0) return ids.join("/");
      return parts[inventoryIndex + 3] ?? parts[inventoryIndex + 1];
    }
  }

  // Journal spawned path: .converge/journal/{playbook}/spawned/{id}/...
  // Spawned tasks rendered to journal/spawned (gitignored).
  const journalSpawnedIndex = parts.indexOf("journal");
  if (journalSpawnedIndex !== -1) {
    const afterJournal = parts[journalSpawnedIndex + 2]; // {playbook}/spawned
    if (afterJournal === "spawned") {
      const spawnedSegments = parts.slice(journalSpawnedIndex + 3);
      const ids: string[] = [];
      for (const segment of spawnedSegments) {
        if (segment === "spawned" || segment.endsWith(".md")) continue;
        ids.push(segment);
      }
      if (ids.length > 0) return ids.join("/");
      return parts[journalSpawnedIndex + 3] ?? parts[journalSpawnedIndex + 1];
    }
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
    const afterName = parts[playbooksIndex + 2];
    // Template path: playbooks/{name}/templates/{template}/... → use playbook name
    if (afterName === "templates") {
      return parts[playbooksIndex + 1];
    }
    return parts[playbooksIndex + 1];
  }

  // Journal path: .converge/journal/{name}/tasks/... → name is the epic id.
  const journalIndex = parts.indexOf("journal");
  if (journalIndex !== -1 && journalIndex + 1 < parts.length) {
    return parts[journalIndex + 1];
  }

  // Inventory spawned path: .converge/inventory/{playbook}/spawned/{id}/...
  const inventoryIndex = parts.indexOf("inventory");
  if (inventoryIndex !== -1 && inventoryIndex + 1 < parts.length) {
    return parts[inventoryIndex + 1]; // playbook name as epic
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

  // Journal path: .converge/journal/{name}/tasks/... — the "epic dir"
  // equivalent is the journal's per-playbook root directory.
  const journalIndex = parts.indexOf("journal");
  if (journalIndex !== -1 && journalIndex + 1 < parts.length) {
    return parts.slice(0, journalIndex + 2).join("/");
  }

  // Inventory spawned path: .converge/inventory/{playbook}/spawned/{id}/...
  const inventoryIndex = parts.indexOf("inventory");
  if (inventoryIndex !== -1 && inventoryIndex + 1 < parts.length) {
    return parts.slice(0, inventoryIndex + 2).join("/");
  }

  // Try playbook path: .converge/playbooks/{name}/...
  // The "epic dir" equivalent is the playbook directory itself
  const playbooksIndex = parts.indexOf("playbooks");
  if (playbooksIndex !== -1 && playbooksIndex + 1 < parts.length) {
    const afterName = parts[playbooksIndex + 2];
    // Root TASK.md: playbooks/{name}/TASK.md → epic dir is playbooks/{name}/
    if (!afterName || afterName.endsWith(".md") || afterName.endsWith(".ts")) {
      return parts.slice(0, playbooksIndex + 2).join("/");
    }
    if (afterName === "tasks" || afterName === "spawned" || afterName === "templates") {
      return parts.slice(0, playbooksIndex + 3).join("/");
    }
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

  // Playbook paths: playbooks/{name}/... → extract leaf from path segments
  // without requiring numeric prefix (playbook tasks use arbitrary IDs like "epoch-001")
  const playbooksIndex = parts.indexOf("playbooks");
  if (playbooksIndex !== -1 && playbooksIndex + 1 < parts.length) {
    const afterName = parts[playbooksIndex + 2];
    // Root TASK.md: playbooks/{name}/TASK.md → use playbook name
    if (!afterName || afterName.endsWith(".md") || afterName.endsWith(".ts")) {
      return parts[playbooksIndex + 1];
    }
    // Template path: playbooks/{name}/templates/{template}/... → use CONVERGE_TASK_ID or template name
    if (afterName === "templates") {
      const taskId = process.env.CONVERGE_TASK_ID;
      if (taskId) return taskId;
      // Fall back to template name
      if (playbooksIndex + 3 < parts.length) {
        return parts[playbooksIndex + 3];
      }
      return parts[playbooksIndex + 1];
    }
    // Child task: return last directory segment (skip files and "tasks" markers)
    for (let i = parts.length - 1; i > playbooksIndex + 1; i--) {
      const seg = parts[i];
      if (!seg || seg.endsWith(".ts") || seg.endsWith(".md") || seg === "tasks") {
        continue;
      }
      return seg;
    }
    return parts[playbooksIndex + 1];
  }

  // Inventory spawned path: .converge/inventory/{playbook}/spawned/{id}/...
  const inventoryIndex = parts.indexOf("inventory");
  if (inventoryIndex !== -1) {
    for (let i = parts.length - 1; i > inventoryIndex + 1; i--) {
      const seg = parts[i];
      if (!seg || seg.endsWith(".md") || seg.endsWith(".ts") || seg === "spawned") {
        continue;
      }
      return seg;
    }
    return parts[inventoryIndex + 1];
  }

  // Journal paths: journal/{name}/tasks/... → last directory segment, skipping
  // files and "tasks" markers.
  const journalIndex = parts.indexOf("journal");
  if (journalIndex !== -1 && journalIndex + 1 < parts.length) {
    for (let i = parts.length - 1; i > journalIndex + 1; i--) {
      const seg = parts[i];
      if (
        !seg ||
        seg.endsWith(".ts") ||
        seg.endsWith(".md") ||
        seg === "tasks"
      ) {
        continue;
      }
      return seg;
    }
    return parts[journalIndex + 1];
  }

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

  // Playbook template path: playbooks/{name}/templates/{template}/... → parent is from env
  const playbooksIndex = parts.indexOf("playbooks");
  if (playbooksIndex !== -1 && playbooksIndex + 2 < parts.length) {
    const afterName = parts[playbooksIndex + 2];
    if (afterName === "templates") {
      // Template tasks are spawned children — parent comes from CONVERGE_PARENT_TASK_ID
      const parentId = process.env.CONVERGE_PARENT_TASK_ID;
      return parentId || undefined;
    }
  }

  // Journal path: journal/{pb}/tasks/{parent}/tasks/{child}/...
  // The parent is the segment immediately before the last `tasks/` marker.
  // For journal paths we don't require a numeric prefix — playbook task ids
  // can be arbitrary (e.g. "epoch-001", "intel").
  const journalIndex = parts.indexOf("journal");
  if (journalIndex !== -1) {
    const lastTasksIndex = parts.lastIndexOf("tasks");
    if (lastTasksIndex > journalIndex + 2) {
      const parentSegment = parts[lastTasksIndex - 1];
      if (parentSegment) return parentSegment;
    }
    return undefined;
  }

  // Legacy (epic-based) path: require a numeric prefix on the parent segment
  // to avoid picking up the `tasks/` marker inside the epic dir itself.
  const tasksIndices: number[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === "tasks") {
      tasksIndices.push(i);
    }
  }

  if (tasksIndices.length === 0) {
    return undefined;
  }

  const lastTasksIndex = tasksIndices[tasksIndices.length - 1];
  const parentSegment = parts[lastTasksIndex - 1];

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

  // Journal path in: the path is already a journal location (e.g. a
  // Seed-spawned child under .converge/journal/{name}/tasks/...).
  // Strip trailing TASK.md/file segment and return the directory as-is —
  // it IS the journal path.
  const journalIdx = parts.indexOf("journal");
  if (journalIdx !== -1 && journalIdx + 1 < parts.length) {
    // When an execution is active but the path still points to the shared
    // tasks/ directory, redirect to the execution-scoped tasks/ directory.
    const executionId = process.env.CONVERGE_EXECUTION_ID;
    if (executionId) {
      const playbookName = parts[journalIdx + 1];
      const tasksIdx = parts.indexOf("tasks", journalIdx + 2);
      if (tasksIdx !== -1 && parts.indexOf("executions", journalIdx + 2) === -1) {
        const taskSegments = parts.slice(tasksIdx + 1);
        const last = taskSegments[taskSegments.length - 1];
        const cleanSegments = (last && (last.endsWith(".md") || last.endsWith(".ts")))
          ? taskSegments.slice(0, -1)
          : taskSegments;
        return [
          ...parts.slice(0, journalIdx),
          "journal",
          playbookName,
          "executions",
          executionId,
          "tasks",
          ...cleanSegments,
        ].join("/");
      }
    }
    const last = parts[parts.length - 1];
    if (last && (last.endsWith(".md") || last.endsWith(".ts"))) {
      return parts.slice(0, -1).join("/");
    }
    return parts.join("/");
  }

  // Try playbook path: .converge/playbooks/{name}/...
  // → .converge/journal/{name}/...
  const playbooksIndex = parts.indexOf("playbooks");
  if (playbooksIndex !== -1 && playbooksIndex + 1 < parts.length) {
    const playbookName = parts[playbooksIndex + 1];
    const afterName = parts[playbooksIndex + 2];

    // Root TASK.md: playbooks/{name}/TASK.md → journal/{name}/
    if (!afterName || afterName.endsWith(".md") || afterName.endsWith(".ts")) {
      return [...parts.slice(0, playbooksIndex), "journal", playbookName].join("/");
    }

    if (afterName === "tasks" || afterName === "spawned") {
      const executionId = process.env.CONVERGE_EXECUTION_ID;
      const tasksSegment = executionId
        ? ["executions", executionId, "tasks"]
        : ["tasks"];
      const journalParts = [
        ...parts.slice(0, playbooksIndex),
        "journal",
        playbookName,
        ...tasksSegment,
        ...parts.slice(playbooksIndex + 3),
      ];
      const lastPart = journalParts[journalParts.length - 1];
      if (lastPart && (lastPart.endsWith(".md") || lastPart.endsWith(".ts"))) {
        journalParts.pop();
      }
      return journalParts.join("/");
    }

    if (afterName === "templates") {
      // Template task: playbooks/{name}/templates/{templateName}/TASK.md
      // → journal/{name}/tasks/{taskId} where taskId comes from the inventory row.
      const taskId = process.env.CONVERGE_TASK_ID || parts[playbooksIndex + 3] || "unknown";
      const execId = process.env.CONVERGE_EXECUTION_ID;
      const tasksSegment = execId
        ? ["executions", execId, "tasks"]
        : ["tasks"];
      const journalParts = [
        ...parts.slice(0, playbooksIndex),
        "journal",
        playbookName,
        ...tasksSegment,
        taskId,
      ];
      const lastPart = journalParts[journalParts.length - 1];
      if (lastPart && (lastPart.endsWith(".md") || lastPart.endsWith(".ts"))) {
        journalParts.pop();
      }
      return journalParts.join("/");
    }
  }

  // Inventory spawned path: .converge/inventory/{playbook}/spawned/{id}/...
  // → .converge/journal/{playbook}/tasks/{id}
  const inventoryIndex = parts.indexOf("inventory");
  if (inventoryIndex !== -1 && inventoryIndex + 1 < parts.length) {
    const pb = parts[inventoryIndex + 1];
    const execId = process.env.CONVERGE_EXECUTION_ID;
    const tasksSegment = execId
      ? ["executions", execId, "tasks"]
      : ["tasks"];
    const spawnedSegments = parts.slice(inventoryIndex + 2); // spawned/{id}/...
    const cleanSegments = spawnedSegments.filter(
      (s) => s !== "spawned" && !s.endsWith(".md") && !s.endsWith(".ts"),
    );
    return [
      ...parts.slice(0, inventoryIndex),
      "journal",
      pb,
      ...tasksSegment,
      ...cleanSegments,
    ].join("/");
  }

  const epicsIndex = parts.indexOf("epics");

  if (epicsIndex === -1) {
    throw new Error(`Invalid task path (no 'epics' directory): ${taskPath}`);
  }

  // Replace 'epics' with 'journal/{playbook}/executions/{executionId}/tasks/'
  // when an execution is active; otherwise 'journal/{playbook}/tasks/'.
  const playbook = process.env.CONVERGE_PLAYBOOK ?? "default";
  const execId = process.env.CONVERGE_EXECUTION_ID;
  const tasksSegment = execId
    ? ["executions", execId, "tasks"]
    : ["tasks"];
  const journalParts = [
    ...parts.slice(0, epicsIndex),
    "journal",
    playbook,
    ...tasksSegment,
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
