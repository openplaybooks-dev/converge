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
   * Run a specific task.
   *
   * This method historically returned a placeholder `{ status: "completed" }`
   * without actually executing anything — a silent-success hazard for any
   * caller that consumed the return value as a real lifecycle signal. The
   * proper entry point for task execution is `run()` from
   * `packages/core/src/run/index.ts`, which orchestrates the DAG runner,
   * checkpointing, repair pipeline, and journaling.
   *
   * Rather than retain a lying placeholder, this method now throws with a
   * clear pointer to the correct API. If you reach this from your own
   * code, switch to the high-level `run()` (or `runDag()` for narrower
   * use cases).
   */
  async run(taskId: string): Promise<TaskStatus> {
    const task = this.get(taskId);

    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    throw new Error(
      `TaskManagerImpl.run('${taskId}') is not implemented and will not be — ` +
        `it previously returned a placeholder 'completed' status without ` +
        `executing anything, masking real failures. Use the high-level ` +
        `run() from '@converge/core/run' instead, which handles ` +
        `orchestration, checkpointing, repair, and journaling.`,
    );
  }

  /**
   * Get task by ID
   */
  get(taskId: string): TaskConfig | undefined {
    const allTasks = this.list();
    return allTasks.find((t) => t.id === taskId);
  }
}
