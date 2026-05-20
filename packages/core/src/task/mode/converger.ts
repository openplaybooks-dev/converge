/**
 * RFC 0022 — Converger wave loop.
 *
 * `runConvergerWave` is the structural fix for RFC 0020's 9000-attempt
 * re-lease bug. It makes the halt question explicit:
 *
 *   1. $CONVERGE_TASK_DIR/halt.marker exists  → halt, success.
 *   2. all halt_when checks pass              → halt, success.
 *   3. wave_check exits 0                     → halt, success.
 *   4. wave_check exits 2                     → halt, failure (give up).
 *   5. wave_check exits 1 (or anything else)  → continue, next wave.
 *   --- structural backstop ---
 *   6. waveNumber > max_waves                 → halt, failure
 *                                               (errorCode: converger-max-waves).
 *
 * The check executor is injected so the runtime owns *how* checks run
 * (process group, timeout, stdout capture — all in lifecycle/after.ts);
 * this module owns the *decision*. That separation keeps the wave loop
 * unit-testable without spawning subprocesses.
 *
 * The wave body itself (the AI agent / script that does the work) is
 * **not** run here — it runs in the executor, which calls
 * `runConvergerWave` afterwards to decide whether to re-lease.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { ConvergerConfig, ModeCheck } from "./schema.ts";
import type { ModeErrorCode } from "./validator.ts";

export interface WaveOutcome {
  /** True iff the wave loop should stop (regardless of success). */
  halt: boolean;
  /** When `halt: true`, whether the task finished successfully. */
  success?: boolean;
  /** Why we made this decision — telemetry / journal evidence. */
  reason?:
    | "halt-marker"
    | "halt-when"
    | "wave-check-pass"
    | "wave-check-give-up";
  /** Structured error code when `halt: true, success: false` due to
   *  a contract violation (max_waves exceeded, no halt signal). */
  errorCode?: ModeErrorCode;
}

export interface WaveContext {
  /** Absolute path to $CONVERGE_TASK_DIR. */
  execDir: string;
  /** 1-based wave counter. The first wave is `waveNumber: 1`. */
  waveNumber: number;
  /** Parsed converger config from frontmatter. */
  config: ConvergerConfig;
}

export interface WaveExecutor {
  /**
   * Run a single check. Returns the exit code (0 = ok, 1 = continue,
   * 2 = give-up, others = treated as continue for forward-compat).
   *
   * Wired in the executor to lifecycle/after.ts's runCheck, which
   * already handles process group + timeout + stdout capture. Here it's
   * just a function so the wave loop is pure logic.
   */
  runCheck: (check: ModeCheck) => Promise<number>;
}

const HALT_MARKER = "halt.marker";

/**
 * Decide whether to halt or continue after a wave body has run.
 *
 * Halt-signal priority is fixed by the RFC. Earlier wins so the body
 * can short-circuit (write halt.marker) without arranging for downstream
 * checks to also pass — the marker is the body's "I know I'm done"
 * signal.
 */
export async function runConvergerWave(
  ctx: WaveContext,
  exec: WaveExecutor,
): Promise<WaveOutcome> {
  // Structural backstop first. Even when a halt signal would fire,
  // exceeding the wave budget is the higher-priority symptom: the
  // repair loop needs to know the budget was hit so it can reconsider
  // strategy, not loop more.
  if (ctx.waveNumber > ctx.config.max_waves) {
    return {
      halt: true,
      success: false,
      errorCode: "converger-max-waves",
    };
  }

  // 1. halt.marker — the body's explicit "I'm done" signal. Highest
  //    priority among halt signals because the body knows things the
  //    framework doesn't (e.g., "the tool I ran reported zero errors").
  if (existsSync(join(ctx.execDir, HALT_MARKER))) {
    return { halt: true, success: true, reason: "halt-marker" };
  }

  // 2. halt_when — every check must pass to halt. Short-circuits on the
  //    first failure so a long check list doesn't run unnecessarily.
  if (ctx.config.halt_when && ctx.config.halt_when.length > 0) {
    let allPass = true;
    for (const check of ctx.config.halt_when) {
      const code = await exec.runCheck(check);
      if (code !== 0) {
        allPass = false;
        break;
      }
    }
    if (allPass) {
      return { halt: true, success: true, reason: "halt-when" };
    }
  }

  // 3-5. wave_check — single check, exit-code protocol.
  if (ctx.config.wave_check) {
    const code = await exec.runCheck(ctx.config.wave_check);
    if (code === 0) {
      return { halt: true, success: true, reason: "wave-check-pass" };
    }
    if (code === 2) {
      return { halt: true, success: false, reason: "wave-check-give-up" };
    }
    // Any other code (including 1 and unknowns) → continue. Forward-compat
    // for future exit-code semantics: better to keep looping (bounded by
    // max_waves) than to halt on an unexpected number.
    return { halt: false };
  }

  // No halt_when pass AND no wave_check. If we also had no halt_when at
  // all, the config violates the schema's parse-time invariant (caught
  // by parseTaskModeFrontmatter). The runtime defends here in case a
  // caller bypassed parsing.
  const hasAnyHaltMechanism =
    (ctx.config.halt_when?.length ?? 0) > 0 ||
    ctx.config.wave_check !== undefined;
  if (!hasAnyHaltMechanism) {
    return {
      halt: true,
      success: false,
      errorCode: "converger-no-halt-signal",
    };
  }

  // halt_when present but didn't all pass; no wave_check fallback.
  // Continue to the next wave (max_waves will eventually cap it).
  return { halt: false };
}
