import type { TaskContext } from "../../context/types.ts";
import type { TaskResult } from "../checks/types.ts";
import type { TaskConfig } from "../../storage/types.ts";

/**
 * Subtasks generator function
 * Called after main task prompt executes to create child tasks
 */
export type SubtasksGeneratorFn = (
  ctx: TaskContext,
  result: TaskResult,
) => Promise<TaskConfig[]> | TaskConfig[];

/**
 * Subtasks configuration
 */
export interface SubtasksConfig {
  /**
   * Generator function to create subtasks
   * Called after main task completes
   */
  generator: SubtasksGeneratorFn;

  /**
   * Execution mode - always sequential for now
   */
  mode?: "sequential";
}
