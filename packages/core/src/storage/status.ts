/**
 * Runtime Status Management
 *
 * Manages runtime state (status files) separately from authored config.
 * Provides higher-level APIs for status transitions and state queries.
 */

import { FilesystemStorage } from "./filesystem.ts";
import type { EpicStatus, TaskStatus } from "./types.ts";

/* ------------------------------------------------------------------ */
/*  Status Manager                                                    */
/* ------------------------------------------------------------------ */

export class StatusManager {
  constructor(private storage: FilesystemStorage) {}

  /* ────────────────────────────────────────────────────────────── */
  /*  Epic Status Management                                        */
  /* ────────────────────────────────────────────────────────────── */

  /**
   * Get epic status or create default if not exists
   */
  getEpicStatus(epicId: string): EpicStatus {
    const existing = this.storage.readEpicStatus(epicId);
    if (existing) return existing;

    // Create default status
    const defaultStatus: EpicStatus = {
      id: epicId,
      status: "planned",
      currentGaps: [],
      attempts: 0,
      metadata: {
        lastUpdated: new Date().toISOString(),
      },
    };

    return defaultStatus;
  }

  /**
   * Update epic status
   */
  updateEpicStatus(
    epicId: string,
    updates: Partial<Omit<EpicStatus, "id">>,
  ): EpicStatus {
    const current = this.getEpicStatus(epicId);
    const updated: EpicStatus = {
      ...current,
      ...updates,
      id: epicId,
      metadata: {
        ...current.metadata,
        lastUpdated: new Date().toISOString(),
      },
    };

    this.storage.writeEpicStatus(updated);
    return updated;
  }

  /**
   * Transition epic to a new status
   */
  transitionEpic(
    epicId: string,
    newStatus: EpicStatus["status"],
    reason?: string,
  ): EpicStatus {
    const current = this.getEpicStatus(epicId);

    // Validate transition
    this.validateEpicTransition(current.status, newStatus);

    const updated: EpicStatus = {
      ...current,
      status: newStatus,
      metadata: {
        ...current.metadata,
        lastUpdated: new Date().toISOString(),
        ...(newStatus === "active" && !current.metadata?.started
          ? { started: new Date().toISOString() }
          : {}),
        ...(newStatus === "completed"
          ? { completed: new Date().toISOString() }
          : {}),
      },
    };

    this.storage.writeEpicStatus(updated);

    // Log transition
    const message = reason
      ? `Status transitioned: ${current.status} → ${newStatus} (${reason})`
      : `Status transitioned: ${current.status} → ${newStatus}`;
    this.storage.appendEpicLog(epicId, message);

    return updated;
  }

  /**
   * Record gaps detected for an epic
   */
  recordEpicGaps(epicId: string, gaps: string[]): void {
    this.updateEpicStatus(epicId, {
      currentGaps: gaps,
      lastEvaluation: new Date().toISOString(),
    });

    const message =
      gaps.length > 0
        ? `Gaps detected: ${gaps.length}\n${gaps.map((g) => `- ${g}`).join("\n")}`
        : "No gaps detected";
    this.storage.appendEpicLog(epicId, message);
  }

  /**
   * Increment epic attempt counter
   */
  incrementEpicAttempt(epicId: string): void {
    const current = this.getEpicStatus(epicId);
    this.updateEpicStatus(epicId, {
      attempts: current.attempts + 1,
    });
  }

  /* ────────────────────────────────────────────────────────────── */
  /*  Task Status Management                                        */
  /* ────────────────────────────────────────────────────────────── */

  /**
   * Get task status or create default if not exists
   */
  getTaskStatus(epicId: string, taskId: string): TaskStatus {
    const existing = this.storage.readTaskStatus(epicId, taskId);
    if (existing) return existing;

    // Create default status
    const defaultStatus: TaskStatus = {
      id: taskId,
      status: "pending",
      currentGaps: [],
      attempts: 0,
      metadata: {
        lastUpdated: new Date().toISOString(),
      },
    };

    return defaultStatus;
  }

  /**
   * Update task status
   */
  updateTaskStatus(
    epicId: string,
    taskId: string,
    updates: Partial<Omit<TaskStatus, "id">>,
  ): TaskStatus {
    const current = this.getTaskStatus(epicId, taskId);
    const updated: TaskStatus = {
      ...current,
      ...updates,
      id: taskId,
      metadata: {
        ...current.metadata,
        lastUpdated: new Date().toISOString(),
      },
    };

    this.storage.writeTaskStatus(epicId, updated);
    return updated;
  }

  /**
   * Transition task to a new status
   */
  transitionTask(
    epicId: string,
    taskId: string,
    newStatus: TaskStatus["status"],
    reason?: string,
  ): TaskStatus {
    const current = this.getTaskStatus(epicId, taskId);

    // Validate transition
    this.validateTaskTransition(current.status, newStatus);

    const updated: TaskStatus = {
      ...current,
      status: newStatus,
      metadata: {
        ...current.metadata,
        lastUpdated: new Date().toISOString(),
        ...(newStatus === "active" && !current.metadata?.started
          ? { started: new Date().toISOString() }
          : {}),
        ...(newStatus === "completed" || newStatus === "failed"
          ? { completed: new Date().toISOString() }
          : {}),
      },
    };

    this.storage.writeTaskStatus(epicId, updated);

    // Log transition
    const message = reason
      ? `Status transitioned: ${current.status} → ${newStatus} (${reason})`
      : `Status transitioned: ${current.status} → ${newStatus}`;
    this.storage.appendTaskLog(epicId, taskId, message);

    return updated;
  }

  /**
   * Record gaps detected for a task
   */
  recordTaskGaps(epicId: string, taskId: string, gaps: string[]): void {
    this.updateTaskStatus(epicId, taskId, {
      currentGaps: gaps,
      lastEvaluation: new Date().toISOString(),
    });

    const message =
      gaps.length > 0
        ? `Gaps detected: ${gaps.length}\n${gaps.map((g) => `- ${g}`).join("\n")}`
        : "No gaps detected";
    this.storage.appendTaskLog(epicId, taskId, message);
  }

  /**
   * Record task attempt
   */
  recordTaskAttempt(
    epicId: string,
    taskId: string,
    attempt: {
      number: number;
      success: boolean;
      error?: string;
    },
  ): void {
    const current = this.getTaskStatus(epicId, taskId);
    const started = current.lastAttempt?.started || new Date().toISOString();

    this.updateTaskStatus(epicId, taskId, {
      attempts: current.attempts + 1,
      lastAttempt: {
        number: attempt.number,
        started,
        completed: new Date().toISOString(),
        success: attempt.success,
        error: attempt.error,
      },
    });

    const message = attempt.success
      ? `Attempt ${attempt.number} succeeded`
      : `Attempt ${attempt.number} failed: ${attempt.error || "unknown error"}`;
    this.storage.appendTaskLog(epicId, taskId, message);
  }

  /**
   * Start task attempt
   */
  startTaskAttempt(
    epicId: string,
    taskId: string,
    attemptNumber: number,
  ): void {
    const current = this.getTaskStatus(epicId, taskId);

    this.updateTaskStatus(epicId, taskId, {
      lastAttempt: {
        number: attemptNumber,
        started: new Date().toISOString(),
      },
    });

    this.storage.appendTaskLog(
      epicId,
      taskId,
      `Starting attempt ${attemptNumber}`,
    );
  }

  /* ────────────────────────────────────────────────────────────── */
  /*  Status Queries                                                */
  /* ────────────────────────────────────────────────────────────── */

  /**
   * Check if epic is completed
   */
  isEpicCompleted(epicId: string): boolean {
    const status = this.getEpicStatus(epicId);
    return status.status === "completed";
  }

  /**
   * Check if task is completed
   */
  isTaskCompleted(epicId: string, taskId: string): boolean {
    const status = this.getTaskStatus(epicId, taskId);
    return status.status === "completed" || status.status === "skipped";
  }

  /**
   * Check if task can start (not blocked)
   */
  canTaskStart(epicId: string, taskId: string): boolean {
    const status = this.getTaskStatus(epicId, taskId);
    return status.status === "pending" || status.status === "blocked";
  }

  /**
   * Get all tasks with a specific status in an epic
   */
  getTasksByStatus(epicId: string, status: TaskStatus["status"]): string[] {
    const taskIds = this.storage.listTasks(epicId);
    return taskIds.filter((taskId) => {
      const taskStatus = this.getTaskStatus(epicId, taskId);
      return taskStatus.status === status;
    });
  }

  /* ────────────────────────────────────────────────────────────── */
  /*  Validation                                                    */
  /* ────────────────────────────────────────────────────────────── */

  /**
   * Validate epic status transition
   */
  private validateEpicTransition(
    from: EpicStatus["status"],
    to: EpicStatus["status"],
  ): void {
    const validTransitions: Record<
      EpicStatus["status"],
      EpicStatus["status"][]
    > = {
      planned: ["active", "completed"],
      active: ["completed", "blocked", "failed"],
      completed: [], // Terminal state
      blocked: ["active", "failed"],
      failed: ["active", "completed"],
    };

    if (!validTransitions[from].includes(to)) {
      throw new Error(`Invalid epic status transition: ${from} → ${to}`);
    }
  }

  /**
   * Validate task status transition
   */
  private validateTaskTransition(
    from: TaskStatus["status"],
    to: TaskStatus["status"],
  ): void {
    const validTransitions: Record<
      TaskStatus["status"],
      TaskStatus["status"][]
    > = {
      pending: ["active", "blocked", "skipped"],
      active: ["completed", "failed", "blocked"],
      completed: [], // Terminal state
      blocked: ["pending", "active"],
      failed: ["pending", "active", "skipped"],
      skipped: [], // Terminal state
    };

    if (!validTransitions[from].includes(to)) {
      throw new Error(`Invalid task status transition: ${from} → ${to}`);
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Factory Function                                                  */
/* ------------------------------------------------------------------ */

/**
 * Create a new status manager
 */
export function createStatusManager(storage: FilesystemStorage): StatusManager {
  return new StatusManager(storage);
}
