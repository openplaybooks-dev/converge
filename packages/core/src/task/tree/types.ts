/**
 * Tree Module Types
 *
 * Core types for the unified tree data structure.
 * All task operations should use these types instead of direct file access.
 */

import type { Unit } from "../unit/unit.ts";
import type { TreeNode } from "./tree-node.ts";

/**
 * Lightweight node data for API results.
 * TreeNode wraps Unit directly, but API results return this lighter structure.
 */
export interface TreeNodeData {
  /** Unique identifier */
  id: string;

  /** The task unit */
  unit: Unit;

  /** Epic this task belongs to */
  epicId: string | undefined;

  /** Whether this is a WBS parent */
  isWbsParent: boolean;

  /** Whether this task is blocking */
  blocking: boolean;

  /** Tags for dependency matching */
  tags: string[];
}

/**
 * Task states computed via tree traversal.
 * NOT stored in files - computed dynamically from checkpoint + tree structure.
 */
export interface TaskStates {
  /** Successfully completed tasks */
  completed: Set<string>;

  /** Failed tasks (locked to unblock downstream) */
  failed: Set<string>;

  /** WBS parents that have seeded children */
  seeded: Set<string>;

  /** All locked tasks (completed ∪ failed ∪ seeded) */
  locked: Set<string>;

  /** Tasks blocked by failed dependencies */
  blocked: Set<string>;

  /** Failed blocking tasks that block dependents */
  blockingFailures: Set<string>;

  /** Tasks blocked because a dependency actually failed — subset of blocked, for display only */
  failureBlocked: Set<string>;

  /** WBS progress for parent tasks (keyed by journalTaskId) */
  wbsProgress: Map<string, WbsProgress>;
}

/**
 * Result from findNextTask() traversal.
 */
export interface NextTaskResult {
  /** The node to execute */
  node: TreeNodeData;

  /** How many tasks are complete */
  completedCount: number;

  /** Total task count */
  totalCount: number;
}

/**
 * Progress information for WBS parent tasks.
 */
export interface WbsProgress {
  /** Whether the parent has seeded its children */
  seeded: boolean;

  /** When seeding occurred */
  seededAt?: string;

  /** Total children spawned */
  spawnCount: number;

  /** How many children completed */
  completedSubtasks: number;

  /** How many children failed */
  failedSubtasks: number;

  /** Child task IDs (leaf taskId, not journalTaskId) */
  subtaskIds: string[];
}
