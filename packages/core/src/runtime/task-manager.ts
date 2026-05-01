/**
 * Task Manager Implementation
 */

import type { TaskManager } from "./types.ts";
import type { TaskConfig, TaskStatus } from "../storage/types.ts";
import type { EpicDefinition } from "../task/checks/types.ts";

export class TaskManagerImpl implements TaskManager {
  private epics: EpicDefinition[];

  constructor(epics: EpicDefinition[]) {
    this.epics = epics;
  }

  /**
   * List all tasks (across all epics)
   */
  list(): TaskConfig[] {
    const tasks: TaskConfig[] = [];

    for (const epic of this.epics) {
      tasks.push(...epic.tasks);
    }

    return tasks;
  }

  /**
   * Run a specific task
   */
  async run(taskId: string): Promise<TaskStatus> {
    const task = this.get(taskId);

    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // TODO: Actual task execution
    // For now, return placeholder status
    return {
      id: taskId,
      status: "completed",
      currentGaps: [],
      attempts: 1,
    };
  }

  /**
   * Get task by ID
   */
  get(taskId: string): TaskConfig | undefined {
    const allTasks = this.list();
    return allTasks.find((t) => t.id === taskId);
  }
}
