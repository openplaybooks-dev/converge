/**
 * Tree Module
 *
 * Unified tree data structure for task traversal.
 * All task operations should use this instead of direct file access.
 *
 * Legacy exports for backward compatibility.
 */

export * from "./traversal.ts";
export * from "./visualizer.ts";

// New unified tree exports
export { TaskTree } from "./task-tree.ts";
export { TreeNode } from "./tree-node.ts";
export { JournalTree } from "./journal-tree.ts";
export type {
  TreeNodeData,
  TaskStates,
  NextTaskResult,
  WbsProgress,
} from "./types.ts";
export type { JournalNode } from "./journal-tree.ts";
