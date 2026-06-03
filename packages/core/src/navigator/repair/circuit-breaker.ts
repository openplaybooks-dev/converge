/**
 * Repair circuit breaker — caps the number of times the framework will
 * attempt to repair the same gap on the same task before giving up.
 *
 * Without this, the self-repair flow can loop:
 *   1. TASK.md has a definition gap (parse error)
 *   2. AI rewrites the frontmatter — emits more malformed YAML
 *   3. mtime changes → gap re-detected → retry
 *   4. AI rewrites again — still malformed
 *   ... forever, burning budget.
 *
 * State is persisted to `<task-journal>/repair-attempts.json`. A trip
 * surfaces as a `circuit-breaker-tripped` event in the journal and as a
 * `doctor` finding. Reset is manual (`converge doctor --reset` or
 * delete the file) — by design, we don't auto-reset because the AI
 * just demonstrated it can't fix this gap, and silent re-tries are
 * what got us here.
 *
 * Identity = `(taskId, gapKind)`. Two different gap kinds on the same
 * task get independent counters; this prevents one runaway strategy
 * from blocking other repair on the same task.
 */

import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { atomicWriteFileSync } from "../../checkpoint/atomic-write.ts";
import { withFileLock } from "../../task/goal/file-lock.ts";

/** Default cap — after N failed repair attempts on the same gap, trip. */
export const DEFAULT_REPAIR_ATTEMPT_CAP = 3;

export interface CircuitState {
  /** Keyed by `${taskId}::${gapKind}`. */
  counters: Record<
    string,
    {
      attempts: number;
      firstAttemptAt: string;
      lastAttemptAt: string;
      lastError?: string;
      tripped: boolean;
      trippedAt?: string;
    }
  >;
}

function statePath(projectDir: string, playbookName: string): string {
  return join(
    projectDir,
    ".converge",
    "journal",
    playbookName,
    "repair-attempts.json",
  );
}

function readState(path: string): CircuitState {
  if (!existsSync(path)) return { counters: {} };
  try {
    const raw = readFileSync(path, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.counters) {
      return parsed as CircuitState;
    }
    return { counters: {} };
  } catch {
    // Corrupted state file — treat as no prior attempts. The next
    // write will replace it atomically.
    return { counters: {} };
  }
}

function counterKey(taskId: string, gapKind: string): string {
  return `${taskId}::${gapKind}`;
}

export interface RecordAttemptInput {
  projectDir: string;
  playbookName: string;
  taskId: string;
  gapKind: string;
  /** Whether this attempt succeeded. Successful attempts clear the counter. */
  success: boolean;
  /** Optional error context preserved for the doctor's diagnostic output. */
  errorMessage?: string;
  /** Override the default attempt cap. */
  cap?: number;
}

export interface AttemptResult {
  /** Updated attempt count after this record. */
  attempts: number;
  /** True iff the circuit is now tripped (don't retry). */
  tripped: boolean;
  /** True iff this call caused the circuit to trip (vs. was already tripped). */
  justTripped: boolean;
}

/**
 * Record a repair attempt. Returns the new state for this counter.
 * Idempotent semantics:
 *   - Success clears the counter (the gap is closed).
 *   - Failure increments. If count >= cap, the circuit trips.
 *   - If already tripped, further calls are no-ops (still tripped).
 *
 * Uses a file lock so two concurrent repair workers can't both
 * increment past the cap simultaneously.
 */
export function recordRepairAttempt(input: RecordAttemptInput): AttemptResult {
  const path = statePath(input.projectDir, input.playbookName);
  const cap = input.cap ?? DEFAULT_REPAIR_ATTEMPT_CAP;
  mkdirSync(dirname(path), { recursive: true });

  return withFileLock(path, () => {
    const state = readState(path);
    const key = counterKey(input.taskId, input.gapKind);
    const now = new Date().toISOString();

    if (input.success) {
      // Clear: the gap is closed. We delete the counter entirely so
      // doctor reports a clean workspace.
      const wasTripped = state.counters[key]?.tripped === true;
      delete state.counters[key];
      atomicWriteFileSync(path, JSON.stringify(state, null, 2));
      return { attempts: 0, tripped: false, justTripped: false };
      void wasTripped;
    }

    const prev = state.counters[key];
    const attempts = (prev?.attempts ?? 0) + 1;
    const wasTripped = prev?.tripped === true;
    const tripped = wasTripped || attempts >= cap;
    state.counters[key] = {
      attempts,
      firstAttemptAt: prev?.firstAttemptAt ?? now,
      lastAttemptAt: now,
      lastError: input.errorMessage ?? prev?.lastError,
      tripped,
      trippedAt: tripped ? (prev?.trippedAt ?? now) : undefined,
    };
    atomicWriteFileSync(path, JSON.stringify(state, null, 2));
    return {
      attempts,
      tripped,
      justTripped: tripped && !wasTripped,
    };
  });
}

/**
 * Check the current state for a counter without modifying it. Used by
 * the navigator BEFORE invoking a strategy: if the circuit is tripped,
 * skip the repair attempt entirely.
 */
export function isCircuitTripped(
  projectDir: string,
  playbookName: string,
  taskId: string,
  gapKind: string,
): boolean {
  const path = statePath(projectDir, playbookName);
  if (!existsSync(path)) return false;
  const state = readState(path);
  return state.counters[counterKey(taskId, gapKind)]?.tripped === true;
}

/**
 * List all currently-tripped circuits, for doctor reporting.
 */
export function listTrippedCircuits(
  projectDir: string,
  playbookName: string,
): Array<{
  taskId: string;
  gapKind: string;
  attempts: number;
  firstAttemptAt: string;
  lastAttemptAt: string;
  trippedAt: string;
  lastError?: string;
}> {
  const path = statePath(projectDir, playbookName);
  if (!existsSync(path)) return [];
  const state = readState(path);
  const out: ReturnType<typeof listTrippedCircuits> = [];
  for (const [key, counter] of Object.entries(state.counters)) {
    if (!counter.tripped) continue;
    const [taskId, gapKind] = key.split("::");
    out.push({
      taskId,
      gapKind,
      attempts: counter.attempts,
      firstAttemptAt: counter.firstAttemptAt,
      lastAttemptAt: counter.lastAttemptAt,
      trippedAt: counter.trippedAt ?? counter.lastAttemptAt,
      lastError: counter.lastError,
    });
  }
  return out;
}

/**
 * Manually reset a circuit (called by `converge doctor --reset-circuit`
 * or after the operator has fixed the underlying problem).
 */
export function resetCircuit(
  projectDir: string,
  playbookName: string,
  taskId: string,
  gapKind: string,
): boolean {
  const path = statePath(projectDir, playbookName);
  if (!existsSync(path)) return false;
  return withFileLock(path, () => {
    const state = readState(path);
    const key = counterKey(taskId, gapKind);
    if (!(key in state.counters)) return false;
    delete state.counters[key];
    atomicWriteFileSync(path, JSON.stringify(state, null, 2));
    return true;
  });
}
