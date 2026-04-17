/**
 * Schedule Runner
 *
 * Runs an execute function on a repeating interval.
 * Supports skipIfBusy (no overlap) and runImmediately.
 */

import type { ScheduleConfig, ScheduleRunnerState } from './types.ts';
import type { ExecutorFn } from '../config/task-definition.ts';

export class ScheduleRunner {
  private runners = new Map<string, ScheduleRunnerState>();

  /**
   * Start a scheduled task.
   *
   * @param taskId   - Task ID for tracking
   * @param config   - Schedule configuration
   * @param executeFn - The function to run on each interval
   * @param buildCtx - Factory to create ExecutorContext per invocation
   */
  start(
    taskId: string,
    config: ScheduleConfig,
    executeFn: ExecutorFn,
    buildCtx: () => any
  ): void {
    if (this.runners.has(taskId)) {
      throw new Error(`Schedule '${taskId}' already running`);
    }

    const state: ScheduleRunnerState = {
      taskId,
      config,
      running: false,
      lastRunAt: null,
      runCount: 0,
      timer: null,
      abortController: new AbortController(),
    };

    this.runners.set(taskId, state);

    const runOnce = async () => {
      if (state.running && config.skipIfBusy) {
        return; // Skip — previous invocation still running
      }

      state.running = true;
      state.runCount++;
      state.lastRunAt = Date.now();

      try {
        const ctx = buildCtx();
        await executeFn(ctx);
      } catch (err: any) {
        console.warn(`[ScheduleRunner] Error in scheduled task '${taskId}': ${err?.message ?? err}`);
      } finally {
        state.running = false;
      }
    };

    // Run immediately if configured
    if (config.runImmediately) {
      runOnce();
    }

    // Start interval
    state.timer = setInterval(runOnce, config.intervalMs);
  }

  /**
   * Stop a specific scheduled task.
   */
  stop(taskId: string): void {
    const state = this.runners.get(taskId);
    if (!state) return;

    if (state.timer) {
      clearInterval(state.timer);
      state.timer = null;
    }
    if (state.abortController) {
      state.abortController.abort();
    }

    this.runners.delete(taskId);
  }

  /**
   * Stop all scheduled tasks. Called on epic completion/failure.
   */
  stopAll(): void {
    for (const [id] of this.runners) {
      this.stop(id);
    }
  }

  /**
   * Check if a scheduled task is registered.
   */
  has(taskId: string): boolean {
    return this.runners.has(taskId);
  }

  /**
   * List all scheduled task IDs.
   */
  list(): string[] {
    return Array.from(this.runners.keys());
  }
}
