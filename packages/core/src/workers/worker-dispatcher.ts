/**
 * RFC 0033 Phase 3 — Worker Dispatcher
 *
 * Coordinates task dispatch to worker processes via IPC.
 * Enforces environment isolation (no process.env mutation),
 * worker pool limits, lease timeouts, and heartbeat enforcement.
 */

import type { LeaseManager } from "./lease-manager.js";
import type { ProcessSupervisor } from "./process-supervisor.js";
import type { CompleteRequest } from "./protocol.js";

export interface DispatcherConfig {
  leaseManager: LeaseManager;
  supervisor: ProcessSupervisor;
  maxWorkers: number;
  workerModule: string;
  heartbeatIntervalMs?: number;
}

export interface DispatchResult {
  status: "dispatched" | "queued";
  workerId?: string;
  lease: any;
  queuedTask?: { taskMd: string; env?: Record<string, string> };
}

export interface QueuedTask {
  taskId: string;
  taskMd: string;
  env?: Record<string, string>;
  leaseTimeoutMs?: number;
}

export interface CompletionMessage {
  leaseId: string;
  taskId: string;
  duration: number;
  result: unknown;
}

export class WorkerDispatcher {
  private config: Required<DispatcherConfig>;
  private activeWorkers = new Map<string, string>(); // workerId -> taskId
  private taskQueue: QueuedTask[] = [];
  private heartbeatInterval?: ReturnType<typeof setInterval>;

  constructor(config: DispatcherConfig) {
    this.config = {
      ...config,
      heartbeatIntervalMs: config.heartbeatIntervalMs ?? 10_000,
    };

    // Start heartbeat timer
    this.heartbeatInterval = setInterval(() => {
      this.checkHeartbeats();
    }, this.config.heartbeatIntervalMs);
  }

  /**
   * Dispatch a task to an available worker.
   * If all workers are busy, queue the task.
   */
  dispatch(
    taskId: string,
    taskMd: string,
    env: Record<string, string> = {},
    options?: { leaseTimeoutMs?: number },
  ): DispatchResult {
    // Check if task is already leased
    const existingLease = this.config.leaseManager.getTaskLease(taskId);
    if (existingLease && existingLease.state === "leased") {
      throw new Error(`Task ${taskId} is already leased`);
    }

    // If this task was previously leased (deferred/expired), free the worker slot
    // The worker is still tracked in activeWorkers but the lease is no longer "leased"
    if (existingLease) {
      const workerForTask = this.getWorkerForTask(taskId);
      if (workerForTask) {
        this.activeWorkers.delete(workerForTask);
      }
    }

    // Find available worker
    const availableWorker = this.findAvailableWorker();

    if (!availableWorker) {
      // Queue the task
      this.taskQueue.push({ taskId, taskMd, env, ...options });
      return {
        status: "queued",
        lease: null,
        queuedTask: { taskMd, env },
      };
    }

    // Acquire lease and dispatch
    const lease = this.config.leaseManager.acquire(availableWorker, taskId, {
      taskMd,
      env,
      leaseTimeoutMs: options?.leaseTimeoutMs,
    });

    // Track active worker
    this.activeWorkers.set(availableWorker, taskId);

    // Dispatch via IPC (env passed in message, NOT via process.env)
    this.config.supervisor.send(availableWorker, {
      type: "task:start",
      payload: {
        leaseId: lease.leaseId,
        taskId,
        taskMd,
        leaseUntil: new Date(lease.leaseUntil).toISOString(),
        env, // Isolated env — worker merges with its own process.env
      },
    });

    return {
      status: "dispatched",
      workerId: availableWorker,
      lease,
    };
  }

  /**
   * Handle task completion message from worker IPC.
   */
  async handleCompletion(message: CompletionMessage): Promise<void> {
    this.config.leaseManager.complete(message.leaseId, []);

    // Free the worker
    const workerId = this.getWorkerForTask(message.taskId);
    if (workerId) {
      this.activeWorkers.delete(workerId);
      this.drainQueue();
    }
  }

  /**
   * Handle task defer message from worker IPC (transient failure, retry later).
   */
  handleDefer(
    leaseId: string,
    taskId: string,
    reason: string,
    retryAfterMs: number,
  ): void {
    this.config.leaseManager.defer(leaseId, "transient", reason, retryAfterMs);

    // Free the worker slot
    const workerId = this.getWorkerForTask(taskId);
    if (workerId) {
      this.activeWorkers.delete(workerId);
      this.drainQueue();
    }
  }

  /**
   * Check heartbeats and expire stalled leases.
   * Returns list of expired leases.
   */
  checkHeartbeats(): any[] {
    const expired = this.config.leaseManager.expireStaleLeases();

    // Free workers for expired leases
    for (const lease of expired) {
      const workerId = this.getWorkerForTask(lease.taskId);
      if (workerId) {
        this.activeWorkers.delete(workerId);
        this.drainQueue();
      }
    }

    return expired;
  }

  /**
   * Ensure minimum number of worker processes are running.
   * Spawns new workers if needed.
   */
  async ensureWorkers(count: number): Promise<void> {
    const currentWorkers = this.config.supervisor.getAllWorkers().length;
    const needed = Math.max(0, count - currentWorkers);

    for (let i = 0; i < needed; i++) {
      await this.config.supervisor.spawn({
        modulePath: this.config.workerModule,
        env: { WORKER_INDEX: String(currentWorkers + i) },
      });
    }
  }

  /**
   * Shutdown dispatcher and all workers.
   */
  async shutdown(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.taskQueue = [];
    this.activeWorkers.clear();
  }

  private findAvailableWorker(): string | null {
    const allWorkers = this.config.supervisor.getAllWorkers();
    for (const worker of allWorkers) {
      if (!this.activeWorkers.has(worker.workerId)) {
        return worker.workerId;
      }
    }
    // All workers are busy or no workers exist yet
    return null;
  }

  private drainQueue(): void {
    while (this.taskQueue.length > 0) {
      const available = this.findAvailableWorker();
      if (!available) break;

      const task = this.taskQueue.shift()!;
      this.dispatch(task.taskId, task.taskMd, task.env, {
        leaseTimeoutMs: task.leaseTimeoutMs,
      });
    }
  }

  private getWorkerForTask(taskId: string): string | null {
    for (const [workerId, tId] of this.activeWorkers) {
      if (tId === taskId) return workerId;
    }
    return null;
  }
}
