/**
 * Task Manager Implementation
 */

import type { TaskManager } from "./types.ts";
import type { TaskConfig, TaskStatus } from "../storage/types.ts";
import type { EpicDefinition } from "../functions/types.ts";

export class TaskManagerImpl implements TaskManager {
  private epics: EpicDefinition[];

  constructor(epics: EpicDefinition[]) {
    this.epics = epics;
  }

  /**
   * List all tasks (across all goals/epics)
   */
  list(): TaskConfig[] {
    const tasks: TaskConfig[] = [];

    for (const epic of this.epics) {
      // Tasks from epic.tasks
      tasks.push(...epic.tasks);

      // Tasks from goals
      for (const goal of epic.goals) {
        if (goal.tasks) {
          tasks.push(...goal.tasks);
        }

        // Tasks from sub-goals (recursive)
        this.collectTasksFromGoal(goal, tasks);
      }
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

  /**
   * Recursively collect tasks from goal hierarchy
   */
  private collectTasksFromGoal(
    goal: import("../goal/types.ts").Goal,
    tasks: TaskConfig[],
  ): void {
    if (goal.tasks) {
      tasks.push(...goal.tasks);
    }

    if (goal.goals) {
      for (const subgoal of goal.goals) {
        this.collectTasksFromGoal(subgoal, tasks);
      }
    }
  }
}
