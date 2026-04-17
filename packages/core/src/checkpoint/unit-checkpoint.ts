/**
 * Universal Unit Checkpoint Manager
 *
 * Provides a consistent checkpoint interface for ANY unit of work:
 * - Project (top-level)
 * - Epic (group of tasks)
 * - Task (unit of work)
 * - Subtask (child unit of work)
 *
 * The folder structure is the source of truth for hierarchy.
 * Each unit has its own checkpoint.json tracking its execution state.
 */

import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { getJournalStructure } from '../journal/structure.ts';

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
  outcome?: 'success' | 'failed' | 'interrupted';
  /** Wall-clock duration in ms */
  durationMs?: number;
}

export interface UnitProgress {
  /** Total number of children (from folder structure) */
  totalChildren: number;
  /** Number of completed children */
  completedChildren: number;
  /** Number of failed children */
  failedChildren: number;
  /** Child unit IDs (simple IDs, not full paths) */
  childIds: string[];
  /** Last time progress was updated */
  lastProgressUpdate: string;
}

export interface UnitCheckpoint {
  /** Unit type */
  type: 'project' | 'epic' | 'task';
  /** Unit identifier (epicId, taskId, etc.) */
  id: string;
  /** Parent unit ID (for nested units) */
  parentId?: string;
  /** Current attempt number (for tasks) */
  currentAttempt?: number;
  /** Aggregate status */
  status: 'pending' | 'running' | 'complete' | 'failed' | 'seeded' | 'interrupted' | 'partial';
  /** Remaining gap IDs when task was marked partial (converge mode) */
  remainingGapIds?: string[];
  /** Per-attempt history (for tasks) */
  attempts?: AttemptRecord[];
  /** Progress tracking (for units with children) */
  progress?: UnitProgress;
  /** ISO timestamp of last update */
  lastUpdated: string;
  /** Creation timestamp */
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  Universal Checkpoint Manager                                      */
/* ------------------------------------------------------------------ */

export class UnitCheckpointManager {
  private filePath: string;

  /**
   * Create a checkpoint manager for ANY unit of work.
   *
   * Examples:
   * - Project: new UnitCheckpointManager(projectDir, 'project')
   * - Epic: new UnitCheckpointManager(projectDir, 'epic', '02-prepare-designs')
   * - Task: new UnitCheckpointManager(projectDir, 'task', '02-prepare-designs', '002-generate-screen-prompts')
   * - Subtask: new UnitCheckpointManager(projectDir, 'task', '02-prepare-designs', '002-generate-screen-prompts/002-001-prompt-home-lesson-tree')
   */
  constructor(
    private projectDir: string,
    private unitType: 'project' | 'epic' | 'task',
    private epicId?: string,
    private taskId?: string,
  ) {
    this.filePath = this.getCheckpointPath();
  }

  private getCheckpointPath(): string {
    const journalRoot = path.join(this.projectDir, '.converge', 'journal');

    switch (this.unitType) {
      case 'project':
        return path.join(journalRoot, 'project', 'checkpoint.json');

      case 'epic':
        if (!this.epicId) throw new Error('Epic ID required for epic checkpoint');
        return path.join(journalRoot, 'epics', this.epicId, 'checkpoint.json');

      case 'task': {
        if (!this.epicId || !this.taskId) {
          throw new Error('Epic ID and Task ID required for task checkpoint');
        }
        // Delegate to getJournalStructure which mirrors the source epic layout exactly.
        const structure = getJournalStructure(this.projectDir, this.epicId, this.taskId);
        return path.join(structure.task!, 'checkpoint.json');
      }
    }
  }

  /**
   * Load checkpoint from disk
   */
  async load(): Promise<UnitCheckpoint | null> {
    if (!existsSync(this.filePath)) {
      return null;
    }

    try {
      const content = await readFile(this.filePath, 'utf-8');
      return JSON.parse(content) as UnitCheckpoint;
    } catch (error) {
      console.warn(`⚠️  Failed to load checkpoint: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Save checkpoint to disk
   */
  async save(checkpoint: UnitCheckpoint): Promise<void> {
    // Ensure directory exists
    const dir = path.dirname(this.filePath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    checkpoint.lastUpdated = new Date().toISOString();

    await writeFile(
      this.filePath,
      JSON.stringify(checkpoint, null, 2),
      'utf-8'
    );
  }

  /**
   * Create default checkpoint
   */
  createDefault(): UnitCheckpoint {
    const now = new Date().toISOString();
    const id = this.taskId || this.epicId || 'project';

    return {
      type: this.unitType,
      id,
      status: 'pending',
      lastUpdated: now,
      createdAt: now,
    };
  }

  /**
   * Start an attempt (for tasks only)
   */
  async startAttempt(attemptNumber: number): Promise<void> {
    if (this.unitType !== 'task') {
      throw new Error('startAttempt is only for tasks');
    }

    let checkpoint = await this.load();
    if (!checkpoint) {
      checkpoint = this.createDefault();
      checkpoint.attempts = [];
    }

    if (!checkpoint.attempts) checkpoint.attempts = [];

    const attemptRecord: AttemptRecord = {
      attempt: attemptNumber,
      startedAt: new Date().toISOString(),
    };

    checkpoint.attempts.push(attemptRecord);
    checkpoint.currentAttempt = attemptNumber;
    checkpoint.status = 'running';

    await this.save(checkpoint);
  }

  /**
   * Complete an attempt (for tasks only)
   */
  async completeAttempt(
    attemptNumber: number,
    outcome: 'success' | 'failed',
    startedAt: string,
  ): Promise<void> {
    if (this.unitType !== 'task') {
      throw new Error('completeAttempt is only for tasks');
    }

    let checkpoint = await this.load();
    if (!checkpoint) {
      // Checkpoint was lost (filesystem race, directory rebuild, etc.)
      // Create a recovery checkpoint so the outcome is still recorded.
      console.warn(`⚠️  Checkpoint missing at ${this.filePath} — creating recovery checkpoint`);
      checkpoint = this.createDefault();
      checkpoint.attempts = [];
    }
    if (!checkpoint.attempts) {
      checkpoint.attempts = [];
    }

    // Find existing attempt record, or create one if missing
    let attemptRecord = checkpoint.attempts.find(a => a.attempt === attemptNumber);
    if (!attemptRecord) {
      attemptRecord = { attempt: attemptNumber, startedAt };
      checkpoint.attempts.push(attemptRecord);
    }

    const now = new Date().toISOString();
    attemptRecord.completedAt = now;
    attemptRecord.outcome = outcome;
    attemptRecord.durationMs = new Date(now).getTime() - new Date(startedAt).getTime();

    checkpoint.status = outcome === 'success' ? 'complete' : 'failed';

    await this.save(checkpoint);
  }

  /**
   * Update progress (for units with children)
   * Only saves if progress values have actually changed
   */
  async updateProgress(progress: UnitProgress): Promise<void> {
    let checkpoint = await this.load();
    if (!checkpoint) {
      checkpoint = this.createDefault();
      checkpoint.progress = progress;
      await this.save(checkpoint);
      return;
    }

    // Check if progress has actually changed (excluding lastProgressUpdate timestamp)
    const oldProgress = checkpoint.progress;
    const hasChanged =
      !oldProgress ||
      oldProgress.totalChildren !== progress.totalChildren ||
      oldProgress.completedChildren !== progress.completedChildren ||
      oldProgress.failedChildren !== progress.failedChildren ||
      JSON.stringify((oldProgress.childIds || []).sort()) !== JSON.stringify((progress.childIds || []).sort());

    if (!hasChanged) {
      // No substantive change - skip update to avoid timestamp churn
      return;
    }

    checkpoint.progress = progress;

    // Auto-complete if all children done
    if (progress.completedChildren + progress.failedChildren === progress.totalChildren) {
      if (progress.failedChildren > 0) {
        checkpoint.status = 'failed';
      } else {
        checkpoint.status = 'complete';
      }
      // Remove seeded status if present
      delete (checkpoint as any).seeded;
    }

    await this.save(checkpoint);
  }

  /**
   * Mark as seeded (for WBS parent tasks)
   */
  async markSeeded(): Promise<void> {
    let checkpoint = await this.load();
    if (!checkpoint) {
      checkpoint = this.createDefault();
    }

    checkpoint.status = 'seeded';

    await this.save(checkpoint);
  }

  /**
   * Mark as complete
   */
  async markComplete(): Promise<void> {
    let checkpoint = await this.load();
    if (!checkpoint) {
      checkpoint = this.createDefault();
    }

    checkpoint.status = 'complete';

    await this.save(checkpoint);
  }

  /**
   * Mark as failed
   */
  async markFailed(): Promise<void> {
    let checkpoint = await this.load();
    if (!checkpoint) {
      checkpoint = this.createDefault();
    }

    checkpoint.status = 'failed';

    await this.save(checkpoint);
  }

  /**
   * Mark as partial (converge mode: stalled but made progress).
   * Records remaining gap IDs so the next run starts from where this one left off.
   */
  async markPartial(remainingGapIds: string[]): Promise<void> {
    let checkpoint = await this.load();
    if (!checkpoint) {
      checkpoint = this.createDefault();
    }

    checkpoint.status = 'partial';
    checkpoint.remainingGapIds = remainingGapIds;

    await this.save(checkpoint);
  }

  /**
   * Mark as interrupted (signal received mid-execution).
   * On next converge run, the task will be picked up and the pre-flight check
   * will determine if it actually completed (outputs exist → mark complete)
   * or needs to re-run (outputs missing → re-execute).
   */
  async markInterrupted(): Promise<void> {
    let checkpoint = await this.load();
    if (!checkpoint) {
      checkpoint = this.createDefault();
    }

    // Record the interruption on the current attempt record
    if (checkpoint.attempts && checkpoint.currentAttempt) {
      const attempt = checkpoint.attempts.find(a => a.attempt === checkpoint.currentAttempt);
      if (attempt && !attempt.completedAt) {
        attempt.completedAt = new Date().toISOString();
        attempt.outcome = 'interrupted';
      }
    }

    checkpoint.status = 'interrupted';

    await this.save(checkpoint);
  }

  /**
   * Get checkpoint path (for debugging/logging)
   */
  getPath(): string {
    return this.filePath;
  }
}
