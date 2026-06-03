/**
 * RFC 0033 Phase 2 — Process Supervisor
 *
 * Manages isolated worker processes via child_process.fork().
 * Replaces the AgentManager's in-memory registry with a cleaner lifecycle model:
 * - Track workers by ID, not just PID
 * - Guarantee cleanup on shutdown (SIGTERM → grace period → SIGKILL)
 * - Detect orphans (processes that exited without our knowledge)
 * - IPC protocol for task dispatch/results
 *
 * Memory safety: exited workers are removed from all internal maps.
 */

import { fork, type ChildProcess } from "node:child_process";

export interface SpawnOptions {
  /** Path to the worker module to fork */
  modulePath: string;
  /** CLI args to pass to the worker */
  args?: string[];
  /** Environment variables (merged with process.env) */
  env?: Record<string, string>;
  /** Max allowed lifetime in ms before auto-kill (0 = no limit) */
  maxLifetimeMs?: number;
}

export interface WorkerInfo {
  workerId: string;
  pid: number;
  status: "running" | "exited" | "killed" | "hung";
  modulePath: string;
  startedAt: number;
  exitedAt?: number;
  exitCode?: number | null;
  exitSignal?: string | null;
  process?: ChildProcess;
}

export interface ShutdownOptions {
  /** Grace period in ms before force-killing (default: 5000ms) */
  gracePeriodMs?: number;
}

let workerCounter = 0;

export class ProcessSupervisor {
  private workers = new Map<string, WorkerInfo>();
  private isShuttingDown = false;

  /**
   * Spawn a new worker process via child_process.fork().
   * Returns a unique workerId for subsequent operations.
   */
  async spawn(options: SpawnOptions): Promise<string> {
    if (!options.modulePath) {
      throw new Error("modulePath is required");
    }

    const now = Date.now();
    const proc = fork(options.modulePath, options.args ?? [], {
      env: { ...process.env, ...options.env },
      silent: false,
      stdio: "inherit",
    });

    if (!proc.pid) {
      throw new Error("Forked process has no PID");
    }

    workerCounter++;
    const workerId = `worker-${now}-${proc.pid}-${workerCounter}`;

    const info: WorkerInfo = {
      workerId,
      pid: proc.pid,
      status: "running",
      modulePath: options.modulePath,
      startedAt: now,
      process: proc,
    };

    this.workers.set(workerId, info);

    // Attach exit handler
    proc.on("exit", (code, signal) => {
      this.handleExit(workerId, code, signal);
    });

    // Attach error handler
    proc.on("error", (error) => {
      console.error(
        `❌ Worker ${workerId} (PID=${proc.pid}) error:`,
        error.message,
      );
      this.handleExit(workerId, -1, "error");
    });

    return workerId;
  }

  /**
   * Send an IPC message to a worker.
   */
  async send(
    workerId: string,
    message: import("node:child_process").Serializable,
  ): Promise<void> {
    const info = this.workers.get(workerId);
    if (!info) {
      throw new Error(`Worker ${workerId} not found`);
    }

    if (!info.process?.connected) {
      throw new Error(`Worker ${workerId} is not connected`);
    }

    info.process.send(message);
  }

  /**
   * Kill a worker process with the specified signal.
   * Idempotent — safe to call on already-killed workers.
   */
  async kill(
    workerId: string,
    signal: "SIGTERM" | "SIGKILL" = "SIGTERM",
  ): Promise<void> {
    const info = this.workers.get(workerId);
    if (!info) {
      throw new Error(`Worker ${workerId} not found`);
    }

    if (info.status !== "running") {
      return; // Already dead
    }

    try {
      info.process?.kill(signal);
      info.status = "killed";
    } catch (error: any) {
      if (error.code !== "ESRCH") {
        throw error;
      }
      // Process already dead
      info.status = "exited";
    }
  }

  /**
   * Get worker info by ID.
   */
  getWorker(workerId: string): WorkerInfo | undefined {
    return this.workers.get(workerId);
  }

  /**
   * Get all workers.
   */
  getAllWorkers(): WorkerInfo[] {
    return Array.from(this.workers.values());
  }

  /**
   * Graceful shutdown: SIGTERM all workers, wait for exit, SIGKILL stragglers.
   */
  async shutdown(options: ShutdownOptions = {}): Promise<void> {
    if (this.isShuttingDown) {
      return; // Idempotent
    }
    this.isShuttingDown = true;

    const gracePeriodMs = options.gracePeriodMs ?? 5000;

    // Get all running workers
    const runningWorkers = this.getAllWorkers().filter(
      (w) => w.status === "running",
    );

    // SIGTERM all workers
    await Promise.all(
      runningWorkers.map(async (w) => {
        try {
          await this.kill(w.workerId, "SIGTERM");
        } catch {
          // Ignore errors during shutdown
        }
      }),
    );

    // Wait for graceful exit — check status transitions
    const startTime = Date.now();
    while (Date.now() - startTime < gracePeriodMs) {
      const stillRunning = this.getAllWorkers().filter(
        (w) => w.status === "running",
      );
      if (stillRunning.length === 0) break;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // SIGKILL any remaining workers
    const stillRunning = this.getAllWorkers().filter(
      (w) => w.status === "running",
    );
    await Promise.all(
      stillRunning.map(async (w) => {
        try {
          await this.kill(w.workerId, "SIGKILL");
        } catch {
          // Ignore
        }
      }),
    );

    // Clear all workers from memory
    this.workers.clear();
  }

  /**
   * Cleanup orphaned workers whose processes have exited.
   * Returns the list of cleaned-up workers.
   */
  async cleanupOrphans(): Promise<WorkerInfo[]> {
    const orphans: WorkerInfo[] = [];

    for (const [workerId, info] of this.workers) {
      if (info.status === "running") {
        // Check if process is still alive
        try {
          process.kill(info.pid, 0);
        } catch {
          // Process is dead, clean it up
          info.status = "exited";
          info.exitedAt = Date.now();
          orphans.push({ ...info });
          this.workers.delete(workerId);
        }
      } else if (info.status === "exited" || info.status === "killed") {
        // Already exited/killed — remove from memory
        orphans.push({ ...info });
        this.workers.delete(workerId);
      }
    }

    return orphans;
  }

  private handleExit(
    workerId: string,
    code: number | null,
    signal: string | null,
  ): void {
    const info = this.workers.get(workerId);
    if (!info) return;

    info.status = "exited";
    info.exitCode = code;
    info.exitSignal = signal;
    info.exitedAt = Date.now();

    // Don't delete immediately — let cleanupOrphans() sweep later.
    // This allows callers to query getWorker() after exit events fire.
  }
}
