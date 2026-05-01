/**
 * Resumability System
 *
 * Enables crash recovery and cross-machine resume with re-evaluation.
 * Trust the codebase, not stale status.
 */

import type { ProjectContext } from "../context/types.ts";
import type { Checkpoint, TaskStatus } from "../storage/types.ts";
import type { Gap } from "../task/gap/types.ts";
import { FilesystemStorage } from "../storage/filesystem.ts";
import { StatusManager } from "../storage/status.ts";
import { GapDetector } from "../task/gap/detector.ts";

/* ------------------------------------------------------------------ */
/*  Resume Point                                                      */
/* ------------------------------------------------------------------ */

export interface ResumePoint {
  /** Checkpoint ID */
  checkpointId: string;

  /** Iteration to resume from */
  iteration: number;

  /** Phase to resume at */
  phase: "evaluate" | "plan" | "execute" | "verify";

  /** Gaps at checkpoint (may be stale) */
  checkpointGaps: Gap[];

  /** Fresh gaps after re-evaluation */
  currentGaps: Gap[];

  /** Tasks completed at checkpoint */
  completedTasks: string[];

  /** Whether re-evaluation changed the gap landscape */
  gapsChanged: boolean;
}

/* ------------------------------------------------------------------ */
/*  Resumability Manager                                              */
/* ------------------------------------------------------------------ */

export class ResumabilityManager {
  private storage: FilesystemStorage;
  private statusManager: StatusManager;
  private detector: GapDetector;

  constructor(storage: FilesystemStorage, statusManager: StatusManager) {
    this.storage = storage;
    this.statusManager = statusManager;
    this.detector = new GapDetector();
  }

  /* ────────────────────────────────────────────────────────────── */
  /*  Resume Detection                                              */
  /* ────────────────────────────────────────────────────────────── */

  /**
   * Check if there's a checkpoint to resume from
   */
  canResume(): boolean {
    const checkpoint = this.storage.readLatestCheckpoint();
    return checkpoint !== null;
  }

  /**
   * Get the latest resume point
   */
  async getResumePoint(ctx: ProjectContext): Promise<ResumePoint | null> {
    const checkpoint = this.storage.readLatestCheckpoint();
    if (!checkpoint) {
      return null;
    }

    ctx.log.info(
      `Found checkpoint: ${checkpoint.id} (iteration ${checkpoint.iteration ?? 0})`,
    );

    ctx.log.warn("ResumabilityManager.getResumePoint() not yet implemented without epics");
    return null;
  }

  /* ────────────────────────────────────────────────────────────── */
  /*  State Reconciliation                                          */
  /* ────────────────────────────────────────────────────────────── */

  /**
   * Reconcile checkpoint state with current codebase state
   */
  async reconcileState(
    ctx: ProjectContext,
    resumePoint: ResumePoint,
  ): Promise<void> {
    ctx.log.info("Reconciling state from checkpoint...");
    ctx.log.warn("ResumabilityManager.reconcileState() not yet implemented without epics");
  }

  /* ────────────────────────────────────────────────────────────── */
  /*  Cross-Machine Resume                                          */
  /* ────────────────────────────────────────────────────────────── */

  /**
   * Check if checkpoint is from a different machine
   */
  isCrossMachineResume(checkpoint: Checkpoint): boolean {
    const currentMachine =
      process.env.HOSTNAME || process.env.COMPUTERNAME || "unknown";
    const checkpointMachine = checkpoint.metadata?.machine || "unknown";
    return currentMachine !== checkpointMachine;
  }

  /**
   * Prepare for cross-machine resume
   */
  async prepareCrossMachineResume(
    ctx: ProjectContext,
    checkpoint: Checkpoint,
  ): Promise<void> {
    ctx.log.info(
      `Cross-machine resume detected: ${checkpoint.metadata?.machine} → ${process.env.HOSTNAME || "unknown"}`,
    );

    // Verify git commit if available
    if (checkpoint.metadata?.commit) {
      try {
        const currentCommit = await ctx.git.getCurrentCommit();
        if (currentCommit !== checkpoint.metadata.commit) {
          ctx.log.warn(
            `Git commit mismatch: checkpoint=${checkpoint.metadata.commit.substring(0, 7)}, ` +
              `current=${currentCommit.substring(0, 7)}`,
          );
          ctx.log.warn(`Code may have changed since checkpoint was created`);
        }
      } catch (error: any) {
        ctx.log.warn(`Could not verify git commit: ${error.message}`);
      }
    }

    // Verify dependencies/environment
    ctx.log.info(
      "Cross-machine resume prepared, re-evaluation will detect any issues",
    );
  }

  /* ────────────────────────────────────────────────────────────── */
  /*  Manual Checkpoint Creation                                    */
  /* ────────────────────────────────────────────────────────────── */

  /**
   * Create a manual checkpoint (for CI/CD or manual intervention)
   */
  async createManualCheckpoint(
    ctx: ProjectContext,
    iteration: number,
    gaps: Gap[],
    message?: string,
  ): Promise<Checkpoint> {
    const checkpoint: Checkpoint = {
      version: 3,
      id: `manual-checkpoint-${Date.now()}`,
      timestamp: new Date().toISOString(),
      iteration,
      state: {},
      gaps: gaps as unknown as Checkpoint["gaps"],
      completed: {
        epics: [],
        tasks: [],
      },
      metadata: {
        created: new Date().toISOString(),
        machine: process.env.HOSTNAME || "unknown",
        commit: await ctx.git.getCurrentCommit().catch(() => undefined),
      },
    };

    this.storage.writeCheckpoint(checkpoint);
    ctx.log.info(
      `Manual checkpoint created: ${checkpoint.id}${message ? ` (${message})` : ""}`,
    );

    return checkpoint;
  }

  /* ────────────────────────────────────────────────────────────── */
  /*  Checkpoint History                                            */
  /* ────────────────────────────────────────────────────────────── */

  /**
   * List all available checkpoints
   */
  listCheckpoints(): string[] {
    return this.storage.listCheckpoints();
  }

  /**
   * Load a specific checkpoint
   */
  loadCheckpoint(checkpointFile: string): Checkpoint | null {
    // This would load from specific file
    // For now, just return latest
    return this.storage.readLatestCheckpoint();
  }

  /**
   * Clean old checkpoints (keep last N)
   */
  cleanOldCheckpoints(keepLast: number = 10): void {
    const checkpoints = this.storage.listCheckpoints();
    if (checkpoints.length <= keepLast) {
      return;
    }

    // Delete old checkpoints (would need rm method in storage)
    const toDelete = checkpoints.slice(0, checkpoints.length - keepLast);
    // this.storage.rmCheckpoint(file) for each
  }
}

/* ------------------------------------------------------------------ */
/*  Factory Function                                                  */
/* ------------------------------------------------------------------ */

/**
 * Create a new resumability manager
 */
export function createResumabilityManager(
  storage: FilesystemStorage,
  statusManager: StatusManager,
): ResumabilityManager {
  return new ResumabilityManager(storage, statusManager);
}