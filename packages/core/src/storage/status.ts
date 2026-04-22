/**
 * Runtime Status Management
 *
 * Manages runtime state (status files) separately from authored config.
 * Provides higher-level APIs for status transitions and state queries.
 */

import { FilesystemStorage } from "./filesystem.ts";
import type { PlaybookStatus, TaskStatus } from "./types.ts";

/* ------------------------------------------------------------------ */
/*  Status Manager                                                    */
/* ------------------------------------------------------------------ */

export class StatusManager {
  constructor(private storage: FilesystemStorage) {}

  /* ────────────────────────────────────────────────────────────── */
  /*  Playbook Status Management                                    */
  /* ────────────────────────────────────────────────────────────── */

  /**
   * Get playbook status or create default if not exists
   */
  getPlaybookStatus(playbookId: string): PlaybookStatus {
    const existing = this.storage.readPlaybookStatus(playbookId);
    if (existing) return existing;

    // Create default status
    const defaultStatus: PlaybookStatus = {
      id: playbookId,
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
   * Update playbook status
   */
  updatePlaybookStatus(
    playbookId: string,
    updates: Partial<Omit<PlaybookStatus, "id">>,
  ): PlaybookStatus {
    const current = this.getPlaybookStatus(playbookId);
    const updated: PlaybookStatus = {
      ...current,
      ...updates,
      id: playbookId,
      metadata: {
        ...current.metadata,
        lastUpdated: new Date().toISOString(),
      },
    };

    this.storage.writePlaybookStatus(updated);
    return updated;
  }

  /**
   * Transition playbook to a new status
   */
  transitionPlaybook(
    playbookId: string,
    newStatus: PlaybookStatus["status"],
    reason?: string,
  ): PlaybookStatus {
    const current = this.getPlaybookStatus(playbookId);

    // Validate transition
    this.validatePlaybookTransition(current.status, newStatus);

    const updated: PlaybookStatus = {
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

    this.storage.writePlaybookStatus(updated);

    // Log transition
    const message = reason
      ? `Status transitioned: ${current.status} → ${newStatus} (${reason})`
      : `Status transitioned: ${current.status} → ${newStatus}`;
    this.storage.appendPlaybookLog(playbookId, message);

    return updated;
  }

  /**
   * Record gaps detected for a playbook
   */
  recordPlaybookGaps(playbookId: string, gaps: string[]): void {
    this.updatePlaybookStatus(playbookId, {
      currentGaps: gaps,
    });

    const message =
      gaps.length > 0
        ? `Gaps detected: ${gaps.length}\n${gaps.map((g) => `- ${g}`).join("\n")}`
        : "No gaps detected";
    this.storage.appendPlaybookLog(playbookId, message);
  }

  /**
   * Increment playbook attempt counter
   */
  incrementPlaybookAttempt(playbookId: string): void {
    const current = this.getPlaybookStatus(playbookId);
    this.updatePlaybookStatus(playbookId, {
      attempts: current.attempts + 1,
    });
  }

  /* ────────────────────────────────────────────────────────────── */
  /*  Task Status Management                                        */
  /* ────────────────────────────────────────────────────────────── */

  /**
   * Get task status or create default if not exists
   */
  getTaskStatus(playbookId: string, taskId: string): TaskStatus {
    const existing = this.storage.readTaskStatus(playbookId, taskId);
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
    playbookId: string,
    taskId: string,
    updates: Partial<Omit<TaskStatus, "id">>,
  ): TaskStatus {
    const current = this.getTaskStatus(playbookId, taskId);
    const updated: TaskStatus = {
      ...current,
      ...updates,
      id: taskId,
      metadata: {
        ...current.metadata,
        lastUpdated: new Date().toISOString(),
      },
    };

    this.storage.writeTaskStatus(playbookId, updated);
    return updated;
  }

  /**
   * Transition task to a new status
   */
  transitionTask(
    playbookId: string,
    taskId: string,
    newStatus: TaskStatus["status"],
    reason?: string,
  ): TaskStatus {
    const current = this.getTaskStatus(playbookId, taskId);

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

    this.storage.writeTaskStatus(playbookId, updated);

    // Log transition
    const message = reason
      ? `Status transitioned: ${current.status} → ${newStatus} (${reason})`
      : `Status transitioned: ${current.status} → ${newStatus}`;
    this.storage.appendTaskLog(playbookId, taskId, message);

    return updated;
  }

  /**
   * Record gaps detected for a task
   */
  recordTaskGaps(playbookId: string, taskId: string, gaps: string[]): void {
    this.updateTaskStatus(playbookId, taskId, {
      currentGaps: gaps,
      lastEvaluation: new Date().toISOString(),
    });

    const message =
      gaps.length > 0
        ? `Gaps detected: ${gaps.length}\n${gaps.map((g) => `- ${g}`).join("\n")}`
        : "No gaps detected";
    this.storage.appendTaskLog(playbookId, taskId, message);
  }

  /**
   * Record task attempt
   */
  recordTaskAttempt(
    playbookId: string,
    taskId: string,
    attempt: {
      number: number;
      success: boolean;
      error?: string;
    },
  ): void {
    const current = this.getTaskStatus(playbookId, taskId);
    const started = current.lastAttempt?.started || new Date().toISOString();

    this.updateTaskStatus(playbookId, taskId, {
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
    this.storage.appendTaskLog(playbookId, taskId, message);
  }

  /**
   * Start task attempt
   */
  startTaskAttempt(
    playbookId: string,
    taskId: string,
    attemptNumber: number,
  ): void {
    const current = this.getTaskStatus(playbookId, taskId);

    this.updateTaskStatus(playbookId, taskId, {
      lastAttempt: {
        number: attemptNumber,
        started: new Date().toISOString(),
      },
    });

    this.storage.appendTaskLog(
      playbookId,
      taskId,
      `Starting attempt ${attemptNumber}`,
    );
  }

  /* ────────────────────────────────────────────────────────────── */
  /*  Status Queries                                                */
  /* ────────────────────────────────────────────────────────────── */

  /**
   * Check if playbook is completed
   */
  isPlaybookCompleted(playbookId: string): boolean {
    const status = this.getPlaybookStatus(playbookId);
    return status.status === "completed";
  }

  /**
   * Check if task is completed
   */
  isTaskCompleted(playbookId: string, taskId: string): boolean {
    const status = this.getTaskStatus(playbookId, taskId);
    return status.status === "completed" || status.status === "skipped";
  }

  /**
   * Check if task can start (not blocked)
   */
  canTaskStart(playbookId: string, taskId: string): boolean {
    const status = this.getTaskStatus(playbookId, taskId);
    return status.status === "pending" || status.status === "blocked";
  }

  /**
   * Get all tasks with a specific status in a playbook
   */
  getTasksByStatus(playbookId: string, status: TaskStatus["status"]): string[] {
    const taskIds = this.storage.listTasks(playbookId);
    return taskIds.filter((taskId) => {
      const taskStatus = this.getTaskStatus(playbookId, taskId);
      return taskStatus.status === status;
    });
  }

  /* ────────────────────────────────────────────────────────────── */
  /*  Validation                                                    */
  /* ────────────────────────────────────────────────────────────── */

  /**
   * Validate playbook status transition
   */
  private validatePlaybookTransition(
    from: PlaybookStatus["status"],
    to: PlaybookStatus["status"],
  ): void {
    const validTransitions: Record<
      PlaybookStatus["status"],
      PlaybookStatus["status"][]
    > = {
      planned: ["active", "completed"],
      active: ["completed", "blocked", "failed"],
      completed: [], // Terminal state
      blocked: ["active", "failed"],
      failed: ["active", "completed"],
    };

    if (!validTransitions[from].includes(to)) {
      throw new Error(`Invalid playbook status transition: ${from} → ${to}`);
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
