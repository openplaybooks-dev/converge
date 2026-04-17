/**
 * Schedule Types
 *
 * Types for the `.schedule()` modifier — re-runs .execute() on a timer.
 */

/* ------------------------------------------------------------------ */
/*  Schedule Config (user-facing, set via .schedule())                */
/* ------------------------------------------------------------------ */

/**
 * Options for `.schedule()` modifier.
 *
 * @example
 * .schedule('15s')
 * .schedule('15s', { runImmediately: false })
 */
export interface ScheduleConfig {
  /** Interval in milliseconds (parsed from duration string). */
  intervalMs: number;

  /** Original duration string (e.g., '15s', '1m'). */
  intervalStr: string;

  /** Run the function once immediately at start. Default: true. */
  runImmediately: boolean;

  /** Skip invocation if previous run is still in progress. Default: true. */
  skipIfBusy: boolean;
}

/**
 * Options that can be passed as the second argument to `.schedule()`.
 */
export interface ScheduleOpts {
  runImmediately?: boolean;
  skipIfBusy?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Schedule Runner State (internal)                                  */
/* ------------------------------------------------------------------ */

export interface ScheduleRunnerState {
  taskId: string;
  config: ScheduleConfig;
  running: boolean;
  lastRunAt: number | null;
  runCount: number;
  timer: ReturnType<typeof setInterval> | null;
  abortController: AbortController | null;
}
