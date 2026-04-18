/**
 * Hooks System - Comprehensive Lifecycle Event Types
 *
 * Provides typed hooks for every stage of the converge lifecycle:
 * project → epic → task, plus gap/convergence/discovery events.
 *
 * Each event carries a typed payload — TypeScript gives full
 * autocomplete on hook callbacks with no casting required.
 */

import type {
  ProjectContext,
  EpicContext,
  TaskContext,
} from "../context/types.ts";
import type { Gap } from "../gap/types.ts";
import type { TaskResult } from "../functions/types.ts";
import type { ConvergenceResult } from "../orchestrator/convergence.ts";
import type { ProjectOrchestrationResult } from "../orchestrator/project-orchestrator.ts";

/* ------------------------------------------------------------------ */
/*  Hook Event Names                                                   */
/* ------------------------------------------------------------------ */

/**
 * All lifecycle hook event names.
 * Use these as keys in `converge.ts` hooks config or `registry.register()`.
 */
export type HookEvent =
  // ── Project lifecycle ──────────────────────────────────────────────
  | "project:start" // Before first epic runs
  | "project:complete" // All epics converged
  | "project:fail" // Project terminated with error

  // ── Epic lifecycle ─────────────────────────────────────────────────
  | "epic:start" // Before convergence loop for an epic
  | "epic:complete" // Epic converged (all gaps resolved)
  | "epic:fail" // Epic stalled or errored
  | "epic:skip" // Epic skipped (already completed)

  // ── Task lifecycle ─────────────────────────────────────────────────
  | "task:start" // Before task function executes
  | "task:complete" // Task function returned success
  | "task:fail" // Task function returned failure or threw
  | "task:retry" // Task is about to be retried
  | "task:skip" // Task skipped (condition not met)

  // ── Gap lifecycle ──────────────────────────────────────────────────
  | "gap:detected" // New gaps found in evaluation phase
  | "gap:resolved" // A gap was resolved by a task

  // ── Convergence ────────────────────────────────────────────────────
  | "convergence:achieved" // Epic reached zero gaps
  | "convergence:stalled" // No progress for N iterations

  // ── Checkpoint / resume ────────────────────────────────────────────
  | "checkpoint:created" // Checkpoint saved to disk
  | "checkpoint:restored" // Resumed from a checkpoint

  // ── Discovery ─────────────────────────────────────────────────────
  | "discovery:found" // Initial scan found task/epic files
  | "discovery:changed" // Watch mode: files added/removed/modified

  // ── Background process lifecycle ──────────────────────────────────
  | "background:started" // Background task reached ready state
  | "background:degraded" // Health check failing
  | "background:recovered" // Health check recovered
  | "background:crashed" // Process exited unexpectedly
  | "background:stopped" // Graceful shutdown

  // ── Sidecar lifecycle ────���────────────────────────────────���───────
  | "sidecar:started" // Sidecar registered and init complete
  | "sidecar:stopped" // Sidecar shut down after epic

  // ── Schedule lifecycle ────────────────────────────────────────────
  | "schedule:started" // Scheduled task timer started
  | "schedule:tick" // Scheduled task completed one execution
  | "schedule:stopped" // Scheduled task timer stopped

  // ── Lifecycle phases ────────────────────────────────────��─────────
  | "task:lifecycle-before" // Before phase completed (inputs snapshotted, context built)
  | "task:lifecycle-after" // After phase completed (checks run, diff captured)
  | "task:correction-attempt"; // Inner correction loop attempt completed

/* ------------------------------------------------------------------ */
/*  Typed Payloads Per Event                                          */
/* ------------------------------------------------------------------ */

/**
 * Strongly-typed payload for each hook event.
 * `HookFn<E>` receives exactly `HookPayloads[E]` as its argument.
 */
export interface HookPayloads {
  // Project
  "project:start": { ctx: ProjectContext };
  "project:complete": {
    ctx: ProjectContext;
    result: ProjectOrchestrationResult;
  };
  "project:fail": { ctx: ProjectContext; error: Error };

  // Epic
  "epic:start": { ctx: EpicContext };
  "epic:complete": { ctx: EpicContext; result: ConvergenceResult };
  "epic:fail": { ctx: EpicContext; error: Error };
  "epic:skip": { ctx: EpicContext; reason: string };

  // Task
  "task:start": { ctx: TaskContext };
  "task:complete": { ctx: TaskContext; result: TaskResult };
  "task:fail": { ctx: TaskContext; error: Error };
  "task:retry": { ctx: TaskContext; attempt: number; maxAttempts: number };
  "task:skip": { ctx: TaskContext; reason: string };

  // Gap
  "gap:detected": { gaps: Gap[]; epicId?: string; iteration?: number };
  "gap:resolved": { gapId: string; taskId: string; epicId?: string };

  // Convergence
  "convergence:achieved": {
    epicId: string;
    iterations: number;
    gapsResolved: number;
  };
  "convergence:stalled": {
    epicId: string;
    reason: string;
    stallCount: number;
    gaps: Gap[];
  };

  // Checkpoint
  "checkpoint:created": {
    checkpointId: string;
    iteration: number;
    epicId: string;
  };
  "checkpoint:restored": { checkpointId: string; iteration: number };

  // Discovery
  "discovery:found": {
    files: string[];
    type: "task" | "epic" | "check" | "plan" | "skill" | "agent";
  };
  "discovery:changed": {
    added: string[];
    removed: string[];
    modified: string[];
  };

  // Background process
  "background:started": { taskId: string; pid: number | null };
  "background:degraded": { taskId: string; reason: string };
  "background:recovered": { taskId: string };
  "background:crashed": {
    taskId: string;
    code: number | null;
    signal: string | null;
  };
  "background:stopped": { taskId: string };

  // Sidecar
  "sidecar:started": { taskId: string; hooks: string[] };
  "sidecar:stopped": { taskId: string };

  // Schedule
  "schedule:started": { taskId: string; intervalMs: number };
  "schedule:tick": { taskId: string; runCount: number; durationMs: number };
  "schedule:stopped": { taskId: string; totalRuns: number };

  // Lifecycle phases
  "task:lifecycle-before": {
    epicId: string;
    taskId: string;
    inputsSnapshotted: number;
    failedDependencies: string[];
    success: boolean;
  };
  "task:lifecycle-after": {
    epicId: string;
    taskId: string;
    checksTotal: number;
    checksPassed: number;
    filesCreated: string[];
    allChecksPassed: boolean;
  };
  "task:correction-attempt": {
    epicId: string;
    taskId: string;
    attemptNumber: number;
    errorClass: string;
    resolved: boolean;
    durationMs: number;
  };
}

/* ------------------------------------------------------------------ */
/*  Hook Function Type                                                 */
/* ------------------------------------------------------------------ */

/**
 * A typed hook callback for event `E`.
 *
 * @example
 * const onTaskFail: HookFn<'task:fail'> = async ({ ctx, error }) => {
 *   await notify(ctx.taskId, error.message);
 * };
 */
export type HookFn<E extends HookEvent = HookEvent> = (
  payload: HookPayloads[E],
) => void | Promise<void>;

/**
 * Generic hook function (untyped payload — for internal use)
 */
export type AnyHookFn = (
  payload: HookPayloads[HookEvent],
) => void | Promise<void>;

/* ------------------------------------------------------------------ */
/*  Hook Registration                                                  */
/* ------------------------------------------------------------------ */

/**
 * A registered hook entry in the registry.
 */
export interface HookRegistration {
  event: HookEvent;
  fn: AnyHookFn;
  /** Execution priority — lower runs first. Default: 100 */
  priority: number;
  /** Whether this came from a plugin (runs after user hooks) */
  source: "user" | "plugin";
}

/* ------------------------------------------------------------------ */
/*  Hooks Config Shape (for converge.ts)                               */
/* ------------------------------------------------------------------ */

/**
 * Optional hook map used in `defineConverge({ hooks: ... })`.
 * Each key is an event name, each value is a typed callback.
 */
export type ConvergeHooks = {
  [E in HookEvent]?: HookFn<E>;
};

/* ------------------------------------------------------------------ */
/*  Legacy Plugin Hook (backward compatibility)                        */
/* ------------------------------------------------------------------ */

/**
 * Legacy hook function signature used by `PluginAPIV2.addHook()`.
 * Kept for backward compatibility — wrapped internally into new style.
 * @deprecated Use `HookFn<E>` for new code.
 */
export type LegacyHookFn = (
  ctx: unknown,
  ...args: unknown[]
) => void | Promise<void>;
