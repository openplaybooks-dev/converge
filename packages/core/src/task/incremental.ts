import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import type { IncrementConfig } from "../config/task-definition.ts";

export interface IncrementalContextParams {
  materialization?: string;
  priorRunResults?: Record<string, unknown> | null;
}

export interface IncrementalContext {
  is_incremental: boolean;
  this_state: Record<string, unknown> | null;
}

export function computeIncrementalContext(
  params: IncrementalContextParams,
): IncrementalContext {
  if (params.materialization !== "incremental") {
    return { is_incremental: false, this_state: null };
  }
  if (!params.priorRunResults) {
    return { is_incremental: false, this_state: null };
  }
  return { is_incremental: true, this_state: params.priorRunResults };
}

// ── Queue Materialization ──────────────────────────────────────────

export interface QueueContext {
  /** Whether this task uses queue-based incremental execution. */
  isQueue: boolean;
  /** Path to the state file (absolute). */
  stateFilePath: string | null;
  /** The current state from the state file, or null if not a queue task. */
  state: Record<string, unknown> | null;
  /** Whether the queue has pending items to process. */
  hasPending: boolean;
  /** Current batch number (0-indexed). */
  batchNumber: number;
  /** The convergence check command, or null. */
  convergeCheck: string | null;
  /** Safety limit on batches. */
  maxBatches: number;
  /** Whether we've exceeded max batches. */
  maxBatchesExceeded: boolean;
}

/**
 * Compute queue context for a task with materialization "queue".
 * Reads the state file to determine if more batches need processing.
 */
export function computeQueueContext(
  materialization: string | undefined,
  incrementConfig: IncrementConfig | undefined,
  projectDir: string,
): QueueContext {
  if (materialization !== "queue" || !incrementConfig?.stateFile) {
    return {
      isQueue: false,
      stateFilePath: null,
      state: null,
      hasPending: false,
      batchNumber: 0,
      convergeCheck: null,
      maxBatches: 100,
      maxBatchesExceeded: false,
    };
  }

  const stateFilePath = join(projectDir, incrementConfig.stateFile);

  if (!existsSync(stateFilePath)) {
    return {
      isQueue: true,
      stateFilePath,
      state: null,
      hasPending: false,
      batchNumber: 0,
      convergeCheck: incrementConfig.convergeCheck || null,
      maxBatches: incrementConfig.maxBatches || 100,
      maxBatchesExceeded: false,
    };
  }

  let state: Record<string, unknown> = {};
  try {
    state = JSON.parse(readFileSync(stateFilePath, "utf-8"));
  } catch (parseErr) {
    // Corruption-resilience: a corrupt queue state file (truncated
    // write, manual edit, disk fault) used to silently return "nothing
    // pending" with no operator-visible signal — meaning incremental
    // processing would appear to be making no progress for unclear
    // reasons. Keep the recovery behavior but surface a warning.
    const m = parseErr instanceof Error ? parseErr.message : String(parseErr);
    console.warn(
      `[queue-state] corrupt state file at ${stateFilePath} (${m}). ` +
        `Treating as empty; incremental processing will pause until ` +
        `the file is repaired or removed.`,
    );
    return {
      isQueue: true,
      stateFilePath,
      state: null,
      hasPending: false,
      batchNumber: 0,
      convergeCheck: incrementConfig.convergeCheck || null,
      maxBatches: incrementConfig.maxBatches || 100,
      maxBatchesExceeded: false,
    };
  }

  const pending = Array.isArray(state.pending) ? state.pending : [];
  const hasPending = pending.length > 0;
  const stats = (state.stats || {}) as Record<string, unknown>;
  const batchNumber = (typeof stats.epochs_completed === "number")
    ? (stats.epochs_completed as number)
    : 0;
  const maxBatches = incrementConfig.maxBatches || 100;

  return {
    isQueue: true,
    stateFilePath,
    state,
    hasPending,
    batchNumber,
    convergeCheck: incrementConfig.convergeCheck || null,
    maxBatches,
    maxBatchesExceeded: batchNumber >= maxBatches,
  };
}

/**
 * Run the convergence check for a queue task.
 * Returns true if the task has converged (no more work needed).
 */
export function checkQueueConvergence(
  convergeCheck: string | null,
  stateFilePath: string | null,
): boolean {
  if (!convergeCheck) {
    // No explicit check — check if the state file has no pending items
    if (stateFilePath && existsSync(stateFilePath)) {
      try {
        const state = JSON.parse(readFileSync(stateFilePath, "utf-8"));
        const pending = Array.isArray(state.pending) ? state.pending : [];
        return pending.length === 0;
      } catch (parseErr) {
        // Same hazard as loadQueueState above: a corrupt state file used
        // to silently return `true` (converged → stop), halting the
        // incremental loop with no diagnostic. Warn so operators see the
        // halt rather than wonder why progress stopped.
        const m = parseErr instanceof Error ? parseErr.message : String(parseErr);
        console.warn(
          `[queue-state] corrupt state file at ${stateFilePath} (${m}). ` +
            `Convergence check defaulting to 'done' — the incremental loop ` +
            `will stop. Repair or remove the file to resume.`,
        );
        return true; // Can't read state → assume done
      }
    }
    return true; // No state file → nothing to do
  }

  try {
    execSync(convergeCheck, { stdio: "pipe", timeout: 30000 });
    return true; // Exit 0 = converged
  } catch {
    return false; // Exit non-zero = more work remains
  }
}
