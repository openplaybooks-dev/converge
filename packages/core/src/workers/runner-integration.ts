/**
 * RFC 0033 — Integration layer between WorkerDispatcher and the existing runner.
 *
 * This module bridges the gap between the DAG execution logic in run/index.ts
 * and the new worker process model. It provides a drop-in replacement for
 * the current in-process task execution.
 */

import { WorkerDispatcher } from "./worker-dispatcher.js";
import { LeaseManager } from "./lease-manager.js";
import { ProcessSupervisor } from "./process-supervisor.js";
import { JournalStore } from "./journal-store.js";
import type { Lease } from "./protocol.js";
import { join } from "node:path";
import { existsSync, mkdirSync } from "node:fs";

export interface RunnerIntegrationOptions {
  projectDir: string;
  maxWorkers?: number;
  workerModule?: string;
  journalDir?: string;
}

export interface TaskExecutionRequest {
  taskId: string;
  taskMd: string;
  env?: Record<string, string>;
  leaseTimeoutMs?: number;
}

export interface TaskExecutionResult {
  taskId: string;
  status: "completed" | "failed" | "deferred";
  duration: number;
  result?: any;
  error?: string;
  deferReason?: string;
  retryAfterMs?: number;
}

/**
 * Orchestrates task execution through the worker pool.
 * Manages the lifecycle of LeaseManager, ProcessSupervisor, and WorkerDispatcher.
 */
export class RunnerIntegration {
  private leaseManager: LeaseManager;
  private supervisor: ProcessSupervisor;
  private dispatcher: WorkerDispatcher;
  private journal: JournalStore;
  private completionCallbacks = new Map<string, (result: TaskExecutionResult) => void>();
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(private options: RunnerIntegrationOptions) {
    this.leaseManager = new LeaseManager();
    this.supervisor = new ProcessSupervisor();

    const journalDir = options.journalDir ?? join(options.projectDir, ".converge", "journal", "workers");
    if (!existsSync(journalDir)) {
      mkdirSync(journalDir, { recursive: true });
    }
    this.journal = new JournalStore(journalDir);

    const workerModule = options.workerModule ?? join(__dirname, "worker-process.js");
    this.dispatcher = new WorkerDispatcher({
      leaseManager: this.leaseManager,
      supervisor: this.supervisor,
      maxWorkers: options.maxWorkers ?? 4,
      workerModule,
    });
  }

  /**
   * Initialize the worker pool and start heartbeat monitoring.
   */
  async initialize(): Promise<void> {
    const workerCount = this.options.maxWorkers ?? 4;
    await this.dispatcher.ensureWorkers(workerCount);

    // Start heartbeat monitoring
    this.heartbeatInterval = setInterval(() => {
      const expired = this.dispatcher.checkHeartbeats();
      for (const lease of expired) {
        this.handleExpiredLease(lease);
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Execute a task through the worker pool.
   * Returns a promise that resolves when the task completes, fails, or is deferred.
   */
  async executeTask(request: TaskExecutionRequest): Promise<TaskExecutionResult> {
    return new Promise((resolve) => {
      // Register completion callback
      this.completionCallbacks.set(request.taskId, resolve);

      // Dispatch to worker pool
      const result = this.dispatcher.dispatch(
        request.taskId,
        request.taskMd,
        request.env ?? {},
        { leaseTimeoutMs: request.leaseTimeoutMs },
      );

      if (result.status === "queued") {
        // Task is queued, will be dispatched when a worker becomes available
        // The completion callback will be invoked when the task finishes
        return;
      }

      if (result.status === "dispatched") {
        // Task is running, completion callback will be invoked via IPC
        this.journal.append("tasks", {
          taskId: request.taskId,
          status: "running",
          leaseId: result.lease.leaseId,
          workerId: result.workerId,
          ts: Date.now(),
        }).catch((err) => {
          console.warn(`[runner-integration] Failed to log task start: ${err.message}`);
        });
      }
    });
  }

  /**
   * Handle task completion from worker process.
   * Called by the dispatcher when a worker reports completion via IPC.
   */
  async handleCompletion(message: {
    leaseId: string;
    taskId: string;
    duration: number;
    result: any;
  }): Promise<void> {
    await this.dispatcher.handleCompletion(message);

    const callback = this.completionCallbacks.get(message.taskId);
    if (callback) {
      this.completionCallbacks.delete(message.taskId);
      callback({
        taskId: message.taskId,
        status: "completed",
        duration: message.duration,
        result: message.result,
      });
    }

    await this.journal.append("tasks", {
      taskId: message.taskId,
      status: "completed",
      leaseId: message.leaseId,
      duration: message.duration,
      ts: Date.now(),
    });
  }

  /**
   * Handle task deferral from worker process.
   */
  handleDefer(
    leaseId: string,
    taskId: string,
    reason: string,
    retryAfterMs: number,
  ): void {
    this.dispatcher.handleDefer(leaseId, taskId, reason, retryAfterMs);

    const callback = this.completionCallbacks.get(taskId);
    if (callback) {
      this.completionCallbacks.delete(taskId);
      callback({
        taskId,
        status: "deferred",
        duration: 0,
        deferReason: reason,
        retryAfterMs,
      });
    }

    this.journal.append("tasks", {
      taskId,
      status: "deferred",
      leaseId,
      reason,
      retryAfterMs,
      ts: Date.now(),
    }).catch((err) => {
      console.warn(`[runner-integration] Failed to log defer: ${err.message}`);
    });
  }

  /**
   * Handle task failure from worker process.
   */
  handleFailure(leaseId: string, taskId: string, error: string): void {
    const lease = this.leaseManager.getLease(leaseId);
    if (lease) {
      this.leaseManager.fail(leaseId, "permanent", error);
    }

    const callback = this.completionCallbacks.get(taskId);
    if (callback) {
      this.completionCallbacks.delete(taskId);
      callback({
        taskId,
        status: "failed",
        duration: 0,
        error,
      });
    }

    this.journal.append("tasks", {
      taskId,
      status: "failed",
      leaseId,
      error,
      ts: Date.now(),
    }).catch((err) => {
      console.warn(`[runner-integration] Failed to log failure: ${err.message}`);
    });
  }

  /**
   * Handle expired lease (worker timeout).
   */
  private handleExpiredLease(lease: Lease): void {
    const callback = this.completionCallbacks.get(lease.taskId);
    if (callback) {
      this.completionCallbacks.delete(lease.taskId);
      callback({
        taskId: lease.taskId,
        status: "failed",
        duration: 0,
        error: "Task lease expired (worker timeout)",
      });
    }

    this.journal.append("tasks", {
      taskId: lease.taskId,
      status: "expired",
      leaseId: lease.leaseId,
      ts: Date.now(),
    }).catch((err) => {
      console.warn(`[runner-integration] Failed to log expiry: ${err.message}`);
    });
  }

  /**
   * Shutdown the worker pool and cleanup resources.
   */
  async shutdown(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }

    await this.dispatcher.shutdown();
    await this.supervisor.shutdown();
  }

  /**
   * Get current worker pool statistics.
   */
  getStats(): {
    activeWorkers: number;
    queuedTasks: number;
    activeLeases: number;
    deferredTasks: number;
  } {
    return {
      activeWorkers: this.supervisor.getAllWorkers().filter((w) => w.status === "running").length,
      queuedTasks: this.dispatcher["taskQueue"].length,
      activeLeases: this.leaseManager.getAllLeases().filter((l) => l.state === "leased").length,
      deferredTasks: this.leaseManager.getDeferredTasks().length,
    };
  }
}
