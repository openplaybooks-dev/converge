/**
 * Yields Spawner
 *
 * Executes task spawning logic, managing target epic, approval workflow,
 * and task registration.
 */

import type { TaskConfig } from '../storage/types.ts';
import type { YieldsDeclarative } from '../functions/types.ts';
import type { FilesystemStorage } from '../storage/filesystem.ts';

/* ------------------------------------------------------------------ */
/*  Yields Spawner                                                    */
/* ------------------------------------------------------------------ */

export class YieldsSpawner {
  private storage: FilesystemStorage;

  constructor(storage: FilesystemStorage) {
    this.storage = storage;
  }

  /**
   * Spawn tasks into target epic
   */
  async spawnTasks(
    tasks: TaskConfig[],
    config: {
      epicId: string;
      target?: YieldsDeclarative['target'];
      approval?: YieldsDeclarative['approval'];
    }
  ): Promise<{
    spawned: TaskConfig[];
    pending: TaskConfig[];
  }> {
    console.log(`[YieldsSpawner] Spawning ${tasks.length} tasks into epic: ${config.epicId}`);

    const spawned: TaskConfig[] = [];
    const pending: TaskConfig[] = [];

    // Determine target epic
    const targetEpicId = this.determineTargetEpic(config.epicId, config.target);

    // Check approval mode
    if (config.approval === 'review') {
      // Add to pending for manual approval
      console.log('[YieldsSpawner] Approval required, adding to pending');
      pending.push(...tasks);
      return { spawned, pending };
    }

    // Immediate spawning
    for (const task of tasks) {
      try {
        // Write task config to storage
        this.storage.writeTaskConfig(targetEpicId, task);

        spawned.push(task);
        console.log(`[YieldsSpawner] Spawned task: ${task.id}`);
      } catch (error: any) {
        console.error(`[YieldsSpawner] Failed to spawn task ${task.id}: ${error.message}`);
      }
    }

    return { spawned, pending };
  }

  /**
   * Determine target epic for spawned tasks
   */
  private determineTargetEpic(
    currentEpicId: string,
    target?: YieldsDeclarative['target']
  ): string {
    switch (target) {
      case 'next-epic':
        // In real impl, would look up next epic in sequence
        return currentEpicId;

      case 'new-epic':
        // In real impl, would create a new epic
        return currentEpicId;

      case 'current-epic':
      default:
        return currentEpicId;
    }
  }

  /**
   * Approve pending tasks
   */
  async approvePendingTasks(
    pendingTasks: TaskConfig[],
    epicId: string
  ): Promise<TaskConfig[]> {
    const spawned: TaskConfig[] = [];

    for (const task of pendingTasks) {
      try {
        this.storage.writeTaskConfig(epicId, task);
        spawned.push(task);
      } catch (error: any) {
        console.error(`[YieldsSpawner] Failed to approve task ${task.id}: ${error.message}`);
      }
    }

    return spawned;
  }
}

/**
 * Create a new yields spawner
 */
export function createYieldsSpawner(storage: FilesystemStorage): YieldsSpawner {
  return new YieldsSpawner(storage);
}
