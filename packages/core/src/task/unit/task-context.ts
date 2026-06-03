/**
 * Task Context - Path-Based Hierarchical Context
 *
 * Path-First Architecture:
 * - Path is the single source of truth
 * - All IDs are derived from path structure
 * - Context is hierarchical with automatic parent references
 * - No manual ID tracking required
 */

import * as path from "node:path";
import {
  extractJournalTaskId,
  extractEpicId,
  extractLeafTaskId,
  extractParentTaskId,
  constructJournalPath,
} from "./path-utils.ts";

/**
 * Hierarchical task context with path-based ID derivation.
 *
 * Everything is computed from the path - no manual tracking needed.
 *
 * Example path:
 *   .converge/epics/03-implement-app/003-generate-svg-assets/tasks/003-001-asset-logo
 *
 * Derived properties:
 *   epicId: "03-implement-app"
 *   taskId: "003-001-asset-logo"
 *   parentTaskId: "003-generate-svg-assets"
 *   fullTaskId: "003-generate-svg-assets/003-001-asset-logo"
 *   journalPath: ".converge/journal/tasks/03-implement-app/003-generate-svg-assets/tasks/003-001-asset-logo"
 *
 * The journal path mirrors the epics structure EXACTLY - same folders, just journal/ instead of epics/!
 * Note: Using 'tasks' (plural) because there are always multiple subtasks.
 */
export interface TaskContext {
  /**
   * Absolute or relative path to task directory (source of truth).
   * This is the ONLY input - everything else is computed.
   */
  readonly path: string;

  /**
   * Epic ID - parsed from path.
   * Example: "03-implement-app"
   */
  readonly epicId: string;

  /**
   * Task ID (leaf segment) - parsed from path.
   * Example: "003-001-asset-logo"
   */
  readonly taskId: string;

  /**
   * Parent task ID (if this is a subtask) - parsed from path.
   * Example: "003-generate-svg-assets"
   */
  readonly parentTaskId?: string;

  /**
   * Full hierarchical task ID (journal path with "/" separators, no "task" segments).
   * Example: "003-generate-svg-assets/003-001-asset-logo"
   * This is used for checkpoint IDs and task identification.
   */
  readonly fullTaskId: string;

  /**
   * Journal path (computed from task path - mirrors epics structure EXACTLY).
   * Example: ".converge/journal/tasks/03-implement-app/003-generate-svg-assets/tasks/003-001-asset-logo"
   * Note: Same structure as epics, just with "journal" instead of first occurrence of path
   * Uses 'tasks' (plural) because there are always multiple subtasks.
   */
  readonly journalPath: string;

  /**
   * Parent context (for nested Seed tasks).
   * Allows traversing the hierarchy: child.parent.parent...
   */
  readonly parent?: TaskContext;
}

/**
 * Create a hierarchical task context from path.
 *
 * Uses shared path utilities for consistent ID extraction across the framework.
 *
 * Path parsing rules:
 * - Epics are at: .converge/epics/{epicId}/{taskId}
 * - Subtasks are at: .converge/epics/{epicId}/{parentTask}/tasks/{subtaskId}
 * - Sub-subtasks are at: .converge/epics/{epicId}/{parentTask}/tasks/{subtask}/tasks/{subsubtaskId}
 *
 * Journal paths mirror epic structure EXACTLY:
 * - Task journal: .converge/journal/tasks/{epicId}/{taskId}/
 * - Subtask journal: .converge/journal/tasks/{epicId}/{parentTask}/tasks/{subtaskId}/
 * - Same folders, just journal/ prefix instead of being under epics/
 *
 * Note: Using 'tasks' (plural) because there are always multiple subtasks.
 *
 * @param taskPath - Absolute or relative path to task directory
 * @param parent - Optional parent context (for building hierarchy)
 * @returns TaskContext with all IDs derived from path
 */
export function createTaskContext(
  taskPath: string,
  parent?: TaskContext,
): TaskContext {
  // Use shared utilities for consistent path parsing
  const epicId = extractEpicId(taskPath);
  const taskId = extractLeafTaskId(taskPath);
  const parentTaskId = extractParentTaskId(taskPath);
  const fullTaskId = extractJournalTaskId(taskPath);
  const journalPath = constructJournalPath(taskPath);

  return {
    path: taskPath,
    epicId,
    taskId,
    parentTaskId,
    fullTaskId,
    journalPath,
    parent,
  };
}

/**
 * Get epic ID from task context or path.
 * Convenience helper for backward compatibility.
 *
 * @param contextOrPath - TaskContext or path string
 * @returns Epic ID
 */
function getEpicIdFromContext(contextOrPath: TaskContext | string): string {
  if (typeof contextOrPath === "string") {
    return createTaskContext(contextOrPath).epicId;
  }
  return contextOrPath.epicId;
}

/**
 * Get task ID from task context or path.
 * Convenience helper for backward compatibility.
 *
 * @param contextOrPath - TaskContext or path string
 * @returns Task ID
 */
function getTaskIdFromContext(contextOrPath: TaskContext | string): string {
  if (typeof contextOrPath === "string") {
    return createTaskContext(contextOrPath).taskId;
  }
  return contextOrPath.taskId;
}

/**
 * Create child task context from parent.
 *
 * Example:
 *   parent: .converge/epics/03-app/002-pages
 *   childId: "002-001-home"
 *   result: .converge/epics/03-app/002-pages/tasks/002-001-home
 *
 * @param parent - Parent task context
 * @param childId - Child task ID (directory name)
 * @returns Child task context with parent reference
 */
function createChildContext(parent: TaskContext, childId: string): TaskContext {
  const childPath = path.join(parent.path, "tasks", childId);
  return createTaskContext(childPath, parent);
}
