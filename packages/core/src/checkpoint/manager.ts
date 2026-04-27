/**
 * Checkpoint Manager
 *
 * Saves and loads converge execution state to enable resumable autonomous runs.
 * Prevents re-execution of completed work.
 */

import { readFile, mkdir } from "fs/promises";
import { atomicWriteFile, atomicWriteFileSync } from "./atomic-write.ts";
import { existsSync } from "fs";
import path from "path";
import { FilesystemTaskStatus } from "./filesystem-status.ts";
import { UnitCheckpointManager } from "./unit-checkpoint.ts";

/**
 * Task metadata for tracking completion details
 */
export interface TaskMetadata {
  /** How the task was completed */
  completedBy?:
    | "user"
    | "repair-strategy"
    | "wbs-completion"
    | "normal-execution";
  /** When the task was completed */
  completedAt?: string;
  /** Skip output revalidation in reconciliation */
  skipRevalidation?: boolean;
  /** Check IDs that were repaired */
  repairedChecks?: string[];
  /** Reason for completion or repair */
  reason?: string;
}

/**
 * Execution checkpoint V1 (legacy) - saved after each iteration
 */
export interface CheckpointV1 {
  /** Checkpoint version for migration */
  version: 1;
  /** When this checkpoint was created */
  timestamp: string;
  /** Current iteration number */
  iteration: number;
  /** Total gaps resolved */
  totalGapsResolved: number;
  /** Total errors encountered */
  totalErrors: number;
  /** Completed task IDs (successfully finished) */
  completedTasks: string[];
  /** Failed task IDs (failed but locked to unblock downstream) */
  failedTasks?: string[];
  /**
   * Seeded WBS parent task IDs.
   * Locked (won't re-run) but NOT yet complete — completion happens
   * automatically once all spawned subtasks finish.
   */
  seededTasks?: string[];
  /** Locked task IDs (prevent re-run — superset of completed + failed + seeded) */
  lockedTasks: string[];
  /** Last successful iteration timestamp */
  lastSuccessfulIteration?: string;
  /** Per-task attempt counts (persisted across resumes for correct attempt numbering) */
  taskAttempts?: Record<string, number>;
  /** Per-task metadata (completion details, repair info, etc.) */
  taskMetadata?: Record<string, TaskMetadata>;
}

/**
 * Execution checkpoint V2 (current) - minimal metadata only
 * Task status derived from filesystem (journal structure)
 */
export interface CheckpointV2 {
  /** Checkpoint version */
  version: 2;
  /** When this checkpoint was created */
  timestamp: string;
  /** Current iteration number */
  iteration: number;
  /** Total gaps resolved */
  totalGapsResolved: number;
  /** Total errors encountered */
  totalErrors: number;
  /** Last successful iteration timestamp */
  lastSuccessfulIteration?: string;
  /** Optional cached summary (rebuilt on demand) */
  _cache?: {
    completedCount: number;
    failedCount: number;
    lastScan: string;
  };
  /* Legacy V1 fields (optional, for compat when code accesses without version check) */
  completedTasks?: string[];
  failedTasks?: string[];
  seededTasks?: string[];
  lockedTasks?: string[];
  taskAttempts?: Record<string, number>;
  taskMetadata?: Record<string, TaskMetadata>;
}

/**
 * Execution checkpoint - union type
 */
export type Checkpoint = CheckpointV1 | CheckpointV2;

/**
 * Checkpoint Manager - handles saving/loading execution state
 */
export class CheckpointManager {
  private checkpointFile: string;
  private fsStatus: FilesystemTaskStatus;
  private projectDir: string;

  constructor(projectDir: string) {
    this.projectDir = projectDir;
    this.checkpointFile = path.join(
      projectDir,
      ".converge/journal/.checkpoint.json",
    );
    this.fsStatus = new FilesystemTaskStatus(projectDir);
  }

  /**
   * Invalidate the filesystem status cache.
   * Call after any external writes to checkpoint files.
   */
  invalidate(): void {
    this.fsStatus.invalidate();
  }

  /**
   * Get a status map for O(1) lookups (keys: both taskId and epicId/taskId).
   * Triggers a single filesystem scan if cache is stale.
   */
  getStatusMap(): Map<string, string> {
    return this.fsStatus.getStatusMap();
  }

  /**
   * Save current state as a checkpoint
   */
  async save(checkpoint: Checkpoint): Promise<void> {
    // Ensure journal directory exists
    const journalDir = path.dirname(this.checkpointFile);
    if (!existsSync(journalDir)) {
      await mkdir(journalDir, { recursive: true });
    }

    // Write checkpoint atomically — readers never see a partial JSON.
    await atomicWriteFile(
      this.checkpointFile,
      JSON.stringify(checkpoint, null, 2),
    );
  }

  /**
   * Load checkpoint from disk (returns null if doesn't exist)
   * Automatically migrates V1 to V2 if needed
   */
  async load(): Promise<Checkpoint | null> {
    if (!existsSync(this.checkpointFile)) {
      return null;
    }

    try {
      const content = await readFile(this.checkpointFile, "utf-8");
      const checkpoint = JSON.parse(content) as Checkpoint;

      // Auto-migrate V1 to V2
      if (checkpoint.version === 1) {
        console.log("🔄 Migrating checkpoint from V1 to V2...");
        const v2 = await this.migrateV1ToV2(checkpoint);
        await this.save(v2);
        console.log("✅ Checkpoint migrated to V2");
        return v2;
      }

      // Validate checkpoint version (defensive check for unknown formats on disk)
      if ((checkpoint as any).version !== 2) {
        console.warn(
          `⚠️  Unknown checkpoint version: ${(checkpoint as any).version}`,
        );
        return null;
      }

      return checkpoint;
    } catch (error) {
      console.warn(
        `⚠️  Failed to load checkpoint: ${(error as Error).message}`,
      );
      return null;
    }
  }

  /**
   * Migrate V1 checkpoint to V2 format.
   * Converts task arrays to per-task checkpoints.
   */
  private async migrateV1ToV2(v1: CheckpointV1): Promise<CheckpointV2> {
    // Migrate task state to per-task checkpoints
    const tasks = [
      ...(v1.completedTasks || []),
      ...(v1.failedTasks || []),
      ...(v1.seededTasks || []),
    ];

    for (const taskId of tasks) {
      const parts = taskId.split("/");
      if (parts.length < 2) continue;

      const epicId = parts[0];
      const taskPath = parts.slice(1).join("/");

      // Determine status
      let status: "complete" | "failed" | "seeded" = "complete";
      if (v1.failedTasks?.includes(taskId)) status = "failed";
      if (v1.seededTasks?.includes(taskId)) status = "seeded";

      // Create/update per-task checkpoint
      const manager = new UnitCheckpointManager(
        this.projectDir,
        "task",
        epicId,
        taskPath,
      );
      let taskCheckpoint = await manager.load();

      if (!taskCheckpoint) {
        taskCheckpoint = manager.createDefault();
      }

      taskCheckpoint.status = status;
      taskCheckpoint.currentAttempt = v1.taskAttempts?.[taskId] || 1;

      await manager.save(taskCheckpoint);
    }

    // Build cache summary
    const completedCount = v1.completedTasks?.length || 0;
    const failedCount = v1.failedTasks?.length || 0;

    // Create V2 checkpoint (minimal structure)
    const v2: CheckpointV2 = {
      version: 2,
      timestamp: v1.timestamp,
      iteration: v1.iteration,
      totalGapsResolved: v1.totalGapsResolved,
      totalErrors: v1.totalErrors,
      lastSuccessfulIteration: v1.lastSuccessfulIteration,
      _cache: {
        completedCount,
        failedCount,
        lastScan: new Date().toISOString(),
      },
    };

    return v2;
  }

  /**
   * Mark a task as completed (successfully finished)
   * Updates per-task checkpoint only (V2)
   */
  async markTaskCompleted(
    taskId: string,
    metadataOrEpicId?: TaskMetadata | string,
    epicIdArg?: string,
  ): Promise<void> {
    // Support both (taskId, metadata?, epicId?) and (taskId, epicId?) signatures
    let metadata: TaskMetadata | undefined;
    let explicitEpicId: string | undefined;
    if (typeof metadataOrEpicId === "string") {
      explicitEpicId = metadataOrEpicId;
    } else {
      metadata = metadataOrEpicId;
      explicitEpicId = epicIdArg;
    }

    const checkpoint = (await this.load()) || this.createDefault();

    // Parse task ID to get epic and task path
    const { epicId, taskPath } = this.parseTaskId(taskId, explicitEpicId);

    // Update per-task checkpoint
    const manager = new UnitCheckpointManager(
      this.projectDir,
      "task",
      epicId,
      taskPath,
    );
    let taskCheckpoint = await manager.load();

    if (!taskCheckpoint) {
      taskCheckpoint = manager.createDefault();
    }

    taskCheckpoint.status = "complete";
    await manager.save(taskCheckpoint);

    // Update global checkpoint metadata
    checkpoint.timestamp = new Date().toISOString();

    // Update cache if V2
    if (checkpoint.version === 2 && checkpoint._cache) {
      checkpoint._cache.completedCount += 1;
      checkpoint._cache.lastScan = new Date().toISOString();
    }

    await this.save(checkpoint);
    this.fsStatus.invalidate();
  }

  /**
   * Mark a WBS parent task as seeded.
   * Updates per-task checkpoint only (V2)
   */
  async markTaskSeeded(taskId: string, explicitEpicId?: string): Promise<void> {
    const checkpoint = (await this.load()) || this.createDefault();

    // Parse task ID
    const { epicId, taskPath } = this.parseTaskId(taskId, explicitEpicId);

    // Update per-task checkpoint
    const manager = new UnitCheckpointManager(
      this.projectDir,
      "task",
      epicId,
      taskPath,
    );
    await manager.markSeeded();

    checkpoint.timestamp = new Date().toISOString();
    await this.save(checkpoint);
    this.fsStatus.invalidate();
  }

  /**
   * Mark a task as failed (but locked to unblock downstream tasks)
   * Updates per-task checkpoint only (V2)
   */
  async markTaskFailed(taskId: string, explicitEpicId?: string): Promise<void> {
    const checkpoint = (await this.load()) || this.createDefault();

    // Parse task ID
    const { epicId, taskPath } = this.parseTaskId(taskId, explicitEpicId);

    // Update per-task checkpoint
    const manager = new UnitCheckpointManager(
      this.projectDir,
      "task",
      epicId,
      taskPath,
    );
    await manager.markFailed();

    checkpoint.timestamp = new Date().toISOString();

    // Update cache if V2
    if (checkpoint.version === 2 && checkpoint._cache) {
      checkpoint._cache.failedCount += 1;
      checkpoint._cache.lastScan = new Date().toISOString();
    }

    await this.save(checkpoint);
    this.fsStatus.invalidate();
  }

  /**
   * Mark a task as partial (converge mode: stalled but made progress).
   * Records remaining gap IDs for the next run to resume from.
   */
  async markTaskPartial(
    taskId: string,
    remainingGapIds: string[],
    explicitEpicId?: string,
  ): Promise<void> {
    const checkpoint = (await this.load()) || this.createDefault();

    const { epicId, taskPath } = this.parseTaskId(taskId, explicitEpicId);

    const manager = new UnitCheckpointManager(
      this.projectDir,
      "task",
      epicId,
      taskPath,
    );
    await manager.markPartial(remainingGapIds);

    checkpoint.timestamp = new Date().toISOString();
    await this.save(checkpoint);
    this.fsStatus.invalidate();
  }

  /**
   * Remove a task from completed status (when outputs are missing or validation fails).
   * This reverts the task to a runnable state.
   */
  async removeFromCompleted(
    taskId: string,
    explicitEpicId?: string,
  ): Promise<void> {
    const checkpoint = await this.load();
    if (!checkpoint) return;

    // Parse task ID
    const { epicId, taskPath } = this.parseTaskId(taskId, explicitEpicId);

    // Update per-task checkpoint to pending
    const manager = new UnitCheckpointManager(
      this.projectDir,
      "task",
      epicId,
      taskPath,
    );
    let taskCheckpoint = await manager.load();

    if (taskCheckpoint) {
      taskCheckpoint.status = "pending";
      await manager.save(taskCheckpoint);
    }

    checkpoint.timestamp = new Date().toISOString();
    await this.save(checkpoint);
    this.fsStatus.invalidate();
  }

  /**
   * Check if a task is locked (completed, failed, or seeded - shouldn't be re-run)
   * Uses filesystem-based status in V2
   */
  async isTaskLocked(
    taskId: string,
    explicitEpicId?: string,
  ): Promise<boolean> {
    const { epicId } = this.parseTaskId(taskId, explicitEpicId);
    return this.fsStatus.isTaskLocked(epicId, taskId);
  }

  /**
   * Get list of completed tasks (successfully finished)
   * Uses filesystem-based status in V2
   */
  async getCompletedTasks(): Promise<string[]> {
    const completed = await this.fsStatus.getCompletedTaskIds();
    return Array.from(completed);
  }

  /**
   * Get list of failed tasks (failed but locked)
   * Uses filesystem-based status in V2
   */
  async getFailedTasks(): Promise<string[]> {
    const failed = await this.fsStatus.getFailedTaskIds();
    return Array.from(failed);
  }

  /**
   * Get list of locked tasks (completed, failed, or seeded)
   * Uses filesystem-based status in V2
   */
  async getLockedTasks(): Promise<string[]> {
    const locked = await this.fsStatus.getLockedTaskIds();
    return Array.from(locked);
  }

  /**
   * Check if a task failed
   * Uses filesystem-based status in V2
   */
  async isTaskFailed(
    taskId: string,
    explicitEpicId?: string,
  ): Promise<boolean> {
    const { epicId } = this.parseTaskId(taskId, explicitEpicId);
    const status = await this.fsStatus.getTaskStatus(epicId, taskId);
    return status.status === "failed";
  }

  /**
   * Check if a task is seeded (WBS parent that spawned children).
   * Uses filesystem-based status in V2.
   */
  async isTaskSeeded(
    taskId: string,
    explicitEpicId?: string,
  ): Promise<boolean> {
    const { epicId } = this.parseTaskId(taskId, explicitEpicId);
    const status = await this.fsStatus.getTaskStatus(epicId, taskId);
    return status.status === "seeded";
  }

  /**
   * Get the current attempt count for a task (0 if never attempted)
   * Reads from per-task checkpoint in V2
   */
  async getTaskAttemptCount(
    taskId: string,
    explicitEpicId?: string,
  ): Promise<number> {
    const { epicId } = this.parseTaskId(taskId, explicitEpicId);
    const status = await this.fsStatus.getTaskStatus(epicId, taskId);
    return status.attempts;
  }

  /**
   * Increment attempt count for a task, save checkpoint, and return the new attempt number.
   * This is the attempt number that should be used for journal folder naming.
   * Uses per-task checkpoint in V2
   */
  async incrementTaskAttempt(
    taskId: string,
    explicitEpicId?: string,
  ): Promise<number> {
    const { epicId } = this.parseTaskId(taskId, explicitEpicId);

    // Get current attempt from per-task checkpoint
    const status = await this.fsStatus.getTaskStatus(epicId, taskId);
    const next = status.attempts + 1;

    // Update global checkpoint timestamp
    const checkpoint = (await this.load()) || this.createDefault();
    checkpoint.timestamp = new Date().toISOString();
    await this.save(checkpoint);

    return next;
  }

  /**
   * Remove a task from the failed list (used for checkpoint reconciliation)
   * Uses per-task checkpoint in V2
   */
  async removeFromFailed(
    taskId: string,
    explicitEpicId?: string,
  ): Promise<void> {
    const { epicId, taskPath } = this.parseTaskId(taskId, explicitEpicId);

    // Update per-task checkpoint to pending
    const manager = new UnitCheckpointManager(
      this.projectDir,
      "task",
      epicId,
      taskPath,
    );
    const taskCheckpoint = await manager.load();

    if (taskCheckpoint && taskCheckpoint.status === "failed") {
      taskCheckpoint.status = "pending";
      await manager.save(taskCheckpoint);
      this.fsStatus.invalidate();
    }
  }

  /**
   * Reconcile checkpoint with actual output state.
   * Used when output validation detects task was marked failed but all outputs exist.
   * Uses per-task checkpoint in V2
   *
   * @param taskId - The task ID to reconcile
   * @param reason - Human-readable reason for reconciliation (for logging)
   */
  async reconcileTask(
    taskId: string,
    reason: string,
    explicitEpicId?: string,
  ): Promise<void> {
    const { epicId, taskPath } = this.parseTaskId(taskId, explicitEpicId);

    // Find ALL checkpoint files for this task — duplicates may exist across
    // journal roots (e.g. journal/default/ and journal/create-web/) due to
    // inconsistent CONVERGE_PLAYBOOK context during original execution.
    // Update every copy that is still marked 'failed'.
    const allPaths = this.fsStatus.getAllCheckpointPaths(epicId, taskId);
    let updated = 0;
    if (allPaths.length > 0) {
      const { readFileSync } = await import("fs");
      for (const ckptPath of allPaths) {
        try {
          const checkpoint = JSON.parse(
            readFileSync(ckptPath, "utf-8"),
          ) as import("./unit-checkpoint.ts").UnitCheckpoint;
          if (checkpoint.status === "failed") {
            checkpoint.status = "complete";
            checkpoint.lastUpdated = new Date().toISOString();
            atomicWriteFileSync(
              ckptPath,
              JSON.stringify(checkpoint, null, 2),
            );
            updated++;
          }
        } catch {
          /* skip unreadable files */
        }
      }
    }
    if (updated === 0) {
      // No files found or none were failed — try computed path as fallback
      const manager = new UnitCheckpointManager(
        this.projectDir,
        "task",
        epicId,
        taskPath,
      );
      const existing = await manager.load();
      if (existing && existing.status === "failed") {
        existing.status = "complete";
        existing.lastUpdated = new Date().toISOString();
        await manager.save(existing);
        updated++;
      }
    }
    if (updated > 0) {
      this.fsStatus.invalidate();
      console.warn(
        `   ✓ Changed ${taskId} from failed to complete (${updated} file(s))`,
      );
    }
  }

  /**
   * Clear checkpoint (start fresh)
   */
  async clear(): Promise<void> {
    if (existsSync(this.checkpointFile)) {
      const { unlink } = await import("fs/promises");
      await unlink(this.checkpointFile);
    }
  }

  /**
   * Parse a taskId into epicId and taskPath.
   * When explicitEpicId is provided, uses it instead of guessing from the taskId.
   * This fixes the bug where bare task IDs (no '/') were incorrectly treated
   * as both epicId and taskPath, creating orphaned checkpoint directories.
   */
  private parseTaskId(
    taskId: string,
    explicitEpicId?: string,
  ): { epicId: string; taskPath: string } {
    if (explicitEpicId) {
      // Caller provided the correct epicId — strip it from taskId if present as prefix
      if (taskId.startsWith(explicitEpicId + "/")) {
        return {
          epicId: explicitEpicId,
          taskPath: taskId.slice(explicitEpicId.length + 1),
        };
      }
      // taskId doesn't start with epicId — it's an epic-level task (taskPath = taskId itself)
      return { epicId: explicitEpicId, taskPath: taskId };
    }

    // Legacy: parse from taskId (works correctly only when taskId contains '/')
    const parts = taskId.split("/");
    if (parts.length >= 2) {
      return { epicId: parts[0], taskPath: parts.slice(1).join("/") };
    }
    // Bare taskId with no epicId — assume it's an epic-level task where taskId IS the epicId
    return { epicId: parts[0], taskPath: parts[0] };
  }

  /**
   * Create default checkpoint (V2)
   */
  private createDefault(): CheckpointV2 {
    return {
      version: 2,
      timestamp: new Date().toISOString(),
      iteration: 0,
      totalGapsResolved: 0,
      totalErrors: 0,
      _cache: {
        completedCount: 0,
        failedCount: 0,
        lastScan: new Date().toISOString(),
      },
    };
  }
}
