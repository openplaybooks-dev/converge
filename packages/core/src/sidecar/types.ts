/**
 * Sidecar Types
 *
 * Types for the `.sidecar()` modifier — hooks into other tasks' lifecycle events.
 */

import type { HookPayloads } from "../hooks/types.ts";

/* ------------------------------------------------------------------ */
/*  Sidecar Hook Events                                               */
/* ------------------------------------------------------------------ */

/**
 * Events that sidecar callbacks can bind to.
 * Subset of HookEvent relevant to task-level lifecycle.
 */
export type SidecarHookEvent =
  | "task:start"
  | "task:complete"
  | "task:fail"
  | "task:retry"
  | "gap:detected"
  | "gap:resolved"
  | "convergence:stalled";

/* ------------------------------------------------------------------ */
/*  Sidecar Hook Callback                                             */
/* ------------------------------------------------------------------ */

/**
 * Callback function for a sidecar hook.
 * Receives the hook payload (typed by event) and a sidecar context.
 */
export type SidecarHookFn<E extends SidecarHookEvent = SidecarHookEvent> = (
  payload: HookPayloads[E],
  ctx: SidecarContext,
) => void | Promise<void>;

/**
 * Context available to sidecar hook callbacks.
 */
export interface SidecarContext {
  /** Run a shell command. */
  shell(cmd: string): Promise<ShellResult>;

  /** Access AI functions. */
  ai: {
    fn(opts: { prompt: string; [key: string]: unknown }): Promise<unknown>;
  };

  /** Emit a reactive gap. */
  emitGap(gap: ReactiveGapInput): string;

  /** Resolve gaps by tag. */
  resolveGaps(tag: string): void;

  /** Logger. */
  log: {
    info(msg: string): void;
    warn(msg: string): void;
    error(msg: string): void;
  };
}

export interface ShellResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface ReactiveGapInput {
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  tags?: string[];
  output?: string;
}

/* ------------------------------------------------------------------ */
/*  Sidecar Hooks Map (user-facing, set via .sidecar())               */
/* ------------------------------------------------------------------ */

/**
 * The hooks object passed to `.sidecar()`.
 * Keys are event names, values are callbacks.
 *
 * @example
 * .sidecar({
 *   'task:complete': async (event, ctx) => {
 *     await ctx.shell('git add -A && git commit -m "checkpoint"');
 *   },
 * })
 */
export type SidecarHooks = {
  [E in SidecarHookEvent]?: SidecarHookFn<E>;
};
