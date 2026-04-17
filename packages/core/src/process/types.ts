/**
 * Process Management Types
 *
 * Internal types for managing background processes (dev servers, etc.).
 * These are NOT exposed to task authors — they interact via ctx.bg(id).
 */

/* ------------------------------------------------------------------ */
/*  Background Config (user-facing, set via .background())            */
/* ------------------------------------------------------------------ */

/**
 * Configuration for `.background()` modifier on taskDef().
 *
 * @example
 * taskDef()
 *   .id('dev-server')
 *   .background({
 *     readyWhen: /✓ Ready in/,
 *     healthCheck: 'http://localhost:3000',
 *   })
 *   .execute(async (ctx) => {
 *     await ctx.shell('npx next dev --turbopack');
 *   })
 *   .build()
 */
export interface BackgroundConfig {
  /** Pattern in stdout that signals the process is ready. Gates downstream deps. */
  readyWhen: RegExp | string;

  /** Max time (ms) to wait for readyWhen before failing. Default: 30000. */
  readyTimeout?: number;

  /** URL or config for periodic health checks. */
  healthCheck?: string | HealthCheckConfig;

  /** Restart the process if it crashes unexpectedly. Default: false. */
  restartOnCrash?: boolean;

  /** Max restart attempts before marking as crashed. Default: 3. */
  maxRestarts?: number;
}

export interface HealthCheckConfig {
  url: string;
  /** Check interval in ms. Default: 5000. */
  interval?: number;
  /** Consecutive failures before marking degraded. Default: 3. */
  failureThreshold?: number;
}

/* ------------------------------------------------------------------ */
/*  BgHandle (user-facing, returned by ctx.bg(id))                    */
/* ------------------------------------------------------------------ */

/**
 * Handle returned by `ctx.bg(id)` for interacting with a background task.
 */
export interface BgHandle {
  /** Current process status. */
  status: BgStatus;

  /** Wait for the process to reach 'ready' state. */
  waitForReady(timeout?: number): Promise<void>;

  /** Wait for the process to settle after file changes (HMR, recompile). */
  waitForIdle(timeout?: number): Promise<void>;

  /** Get error lines emitted since a given timestamp. */
  errorsSince(time: number): string[];

  /** Async iterable of stdout+stderr lines. */
  output: AsyncIterable<string>;

  /** Gracefully stop the process. */
  stop(): Promise<void>;
}

export type BgStatus = 'starting' | 'ready' | 'degraded' | 'stopped' | 'crashed';

/* ------------------------------------------------------------------ */
/*  ManagedProcess (internal)                                         */
/* ------------------------------------------------------------------ */

/**
 * Internal representation of a managed background process.
 */
export interface ManagedProcess {
  id: string;
  pid: number | null;
  status: BgStatus;
  startedAt: number;
  readyAt: number | null;
  config: BackgroundConfig;

  /** Ring buffer of recent output lines. */
  outputBuffer: OutputLine[];

  /** Error lines with timestamps. */
  errors: ErrorLine[];

  /** Restart count since last clean start. */
  restartCount: number;
}

export interface OutputLine {
  timestamp: number;
  stream: 'stdout' | 'stderr';
  text: string;
}

export interface ErrorLine {
  timestamp: number;
  text: string;
}

/* ------------------------------------------------------------------ */
/*  Process State File (filesystem)                                   */
/* ------------------------------------------------------------------ */

/**
 * Written to .converge/runtime/bg/<task-id>/status.json
 */
export interface BgStatusFile {
  status: BgStatus;
  pid: number | null;
  startedAt: string;
  readyAt: string | null;
  restartCount: number;
  lastError: string | null;
}
