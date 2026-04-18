/**
 * Task Checkpoint Manager
 *
 * Writes a per-task `checkpoint.json` at the task's journal directory,
 * mirroring the epic structure (root tasks directly under epic, WBS subtasks
 * under parent/tasks/child):
 *   .converge/journal/tasks/{epicId}/{taskId}/checkpoint.json       (root task)
 *   .converge/journal/tasks/{epicId}/{parent}/tasks/{child}/checkpoint.json  (WBS subtask)
 *
 * Tracks the current attempt, cumulative attempt history, and task status
 * so each task is independently resumable without reading the global checkpoint.
 *
 * Global checkpoint (.converge/journal/.checkpoint.json) tracks which tasks
 * are locked/complete across the whole project.
 * Task checkpoint tracks what happened *within* a single task across attempts.
 */

import { writeFile, readFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { getJournalStructure } from "../journal/structure.ts";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface AttemptRecord {
  /** Attempt number (1-based) */
  attempt: number;
  /** ISO timestamp when this attempt started */
  startedAt: string;
  /** ISO timestamp when this attempt ended (undefined if still running) */
  completedAt?: string;
  /** Outcome of this attempt */
  outcome?: "success" | "failed";
  /** Wall-clock duration in ms */
  durationMs?: number;
}

export interface TaskCheckpoint {
  /** Task identifier */
  taskId: string;
  /** Epic identifier */
  epicId: string;
  /** Current attempt number (the attempt that is running or last ran) */
  currentAttempt: number;
  /** Aggregate task status */
  status: "pending" | "running" | "complete" | "failed";
  /** Per-attempt history — append-only */
  attempts: AttemptRecord[];
  /** ISO timestamp of last update */
  lastUpdated: string;
  /**
   * Progress tracking for parent tasks (tasks with children).
   * Source of truth is the folder structure, not WBS seeding.
   */
  progress?: {
    /** Total number of children (from folder structure) */
    totalChildren: number;
    /** Number of completed children */
    completedChildren: number;
    /** Number of failed children */
    failedChildren: number;
    /** Child task IDs (simple IDs, not journalTaskIds) */
    childTaskIds: string[];
    /** Last time progress was updated */
    lastProgressUpdate: string;
  };
}

/* ------------------------------------------------------------------ */
/*  Path helper                                                        */
/* ------------------------------------------------------------------ */

export function getTaskCheckpointPath(
  projectDir: string,
  epicId: string,
  taskId: string,
): string {
  const structure = getJournalStructure(projectDir, epicId, taskId);
  return path.join(structure.task!, "checkpoint.json");
}

/* ------------------------------------------------------------------ */
/*  Manager                                                            */
/* ------------------------------------------------------------------ */

export class TaskCheckpointManager {
  private filePath: string;

  constructor(
    private projectDir: string,
    private epicId: string,
    private taskId: string,
  ) {
    this.filePath = getTaskCheckpointPath(projectDir, epicId, taskId);
  }

  /** Load checkpoint from disk (returns null if not yet created). */
  async load(): Promise<TaskCheckpoint | null> {
    if (!existsSync(this.filePath)) return null;
    try {
      return JSON.parse(
        await readFile(this.filePath, "utf-8"),
      ) as TaskCheckpoint;
    } catch {
      return null;
    }
  }

  /** Persist checkpoint to disk. */
  async save(checkpoint: TaskCheckpoint): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    checkpoint.lastUpdated = new Date().toISOString();
    await writeFile(this.filePath, JSON.stringify(checkpoint, null, 2));
  }

  /**
   * Mark the start of an attempt.
   * Creates or updates the checkpoint with status=running and appends an
   * AttemptRecord with only startedAt set (completedAt filled on finish).
   */
  async startAttempt(attemptNumber: number): Promise<void> {
    const existing = await this.load();
    const now = new Date().toISOString();

    const checkpoint: TaskCheckpoint = existing ?? {
      taskId: this.taskId,
      epicId: this.epicId,
      currentAttempt: 0,
      status: "pending",
      attempts: [],
      lastUpdated: now,
    };

    checkpoint.currentAttempt = attemptNumber;
    checkpoint.status = "running";

    // Append a new attempt record (avoid duplicates on re-entry)
    const alreadyRecorded = checkpoint.attempts.some(
      (a) => a.attempt === attemptNumber,
    );
    if (!alreadyRecorded) {
      checkpoint.attempts.push({ attempt: attemptNumber, startedAt: now });
    }

    await this.save(checkpoint);
  }

  /**
   * Mark the end of an attempt with its outcome.
   * Updates the matching AttemptRecord and sets the aggregate task status.
   */
  async completeAttempt(
    attemptNumber: number,
    outcome: "success" | "failed",
    startedAt: string,
  ): Promise<void> {
    const existing = await this.load();
    const now = new Date().toISOString();

    const checkpoint: TaskCheckpoint = existing ?? {
      taskId: this.taskId,
      epicId: this.epicId,
      currentAttempt: attemptNumber,
      status: "pending",
      attempts: [],
      lastUpdated: now,
    };

    // Find and update the attempt record, or append if missing
    const record = checkpoint.attempts.find((a) => a.attempt === attemptNumber);
    const durationMs = Date.now() - new Date(startedAt).getTime();

    if (record) {
      record.completedAt = now;
      record.outcome = outcome;
      record.durationMs = durationMs;
    } else {
      checkpoint.attempts.push({
        attempt: attemptNumber,
        startedAt,
        completedAt: now,
        outcome,
        durationMs,
      });
    }

    checkpoint.status = outcome === "success" ? "complete" : "failed";
    await this.save(checkpoint);
  }
}
