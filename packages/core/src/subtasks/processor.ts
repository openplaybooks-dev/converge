import type { SubtasksConfig } from "./types.ts";
import type { TaskContext } from "../context/types.ts";
import type { TaskResult } from "../functions/types.ts";
import type { TaskConfig } from "../storage/types.ts";

/**
 * Processes subtasks configuration and generates subtask definitions
 */
export class SubtasksProcessor {
  /**
   * Process subtasks config and generate task configs
   */
  async process(
    config: SubtasksConfig,
    ctx: TaskContext,
    result: TaskResult,
  ): Promise<TaskConfig[]> {
    // Call generator function
    const subtasks = await config.generator(ctx, result);

    // Validate subtasks
    for (const subtask of subtasks) {
      if (!subtask.id) {
        throw new Error("Subtask must have an id");
      }
      if (!subtask.title) {
        throw new Error(`Subtask ${subtask.id} must have a title`);
      }
    }

    return subtasks;
  }
}

export function createSubtasksProcessor(): SubtasksProcessor {
  return new SubtasksProcessor();
}
