/**
 * RFC 0003 — Three-tier error classification.
 *
 * Today the runtime collapses every executor failure into a single
 * "failed" state. After observing the baby-app `idle-timed out` failure
 * — classified as transient/remote, repair correctly skipped, but then
 * the task got marked permanently failed and the run aborted — we split
 * failures into three classes with distinct recovery contracts.
 *
 * | Class           | Examples                                                    | Recovery                                |
 * | --------------- | ----------------------------------------------------------- | --------------------------------------- |
 * | `transient`     | HTTP 5xx, 429, idle timeout, ECONNRESET, socket hang up     | Exponential backoff; defer (not fail)   |
 * | `deterministic` | Check fail, missing input, wrong-shape output               | Pass to AI-repair agent                 |
 * | `authoring`     | Cycle detected, var mismatch, bad spawn syntax, malformed   | Fail the run immediately with location  |
 *
 * This module ships the pure-function pieces only: classification,
 * backoff math, `AuthoringError`, and the `EX_AUTHORING` exit code. The
 * `deferred` task state and downstream-of-deferred DAG semantics are a
 * separate change that touches the orchestrator and runstate — they
 * land in follow-up work.
 */

export type ErrorClass = "transient" | "deterministic" | "authoring";

export interface ClassifiedError {
  class: ErrorClass;
  reason: string;
  /** Base backoff in ms before the first transient retry. Multiplied by 2^(attempt-1) up to `capBackoffMs`. */
  retryAfterMs?: number;
  /** Authoring-only: best-effort pointer to where the error came from. */
  sourcePath?: string;
  sourceLine?: number;
}

/**
 * Exit code reserved for authoring errors (playbook is wrong, not the
 * world). Picked from the BSD `sysexits.h` `EX_DATAERR=65` neighbourhood
 * — `64` is `EX_USAGE`, which is the closest semantic match: "the
 * command was used incorrectly". CI scripts can branch on this code to
 * distinguish "your playbook is broken" from "the run was flaky".
 */
export const EX_AUTHORING = 64;

/**
 * Thrown when an error is classified as `authoring`. The runner's
 * top-level catch surfaces this with a clear "your playbook is wrong"
 * message and exits with `EX_AUTHORING`.
 */
export class AuthoringError extends Error {
  override readonly name = "AuthoringError";
  readonly sourcePath?: string;
  readonly sourceLine?: number;
  constructor(reason: string, sourcePath?: string, sourceLine?: number) {
    super(reason);
    this.sourcePath = sourcePath;
    this.sourceLine = sourceLine;
  }
}

/* ------------------------------------------------------------------ */
/*  Classification                                                    */
/* ------------------------------------------------------------------ */

/**
 * Authoring patterns: things that a future retry or AI repair will
 * NEVER fix — the playbook source must change. Order matters: more
 * specific patterns first.
 */
const AUTHORING_PATTERNS: Array<{ rx: RegExp; reason: string }> = [
  { rx: /Unknown flag for spawn (?:template|task)/i, reason: "Spawn syntax error" },
  { rx: /references undefined variable/i, reason: "Template var mismatch" },
  { rx: /Cycle detected|cyclic dependency/i, reason: "Dependency cycle" },
  { rx: /Missing required field|Invalid frontmatter|Malformed (?:TASK|frontmatter)/i, reason: "Malformed TASK.md" },
  { rx: /Duplicate node id/i, reason: "Duplicate task id" },
  { rx: /spawn (?:template|task) requires/i, reason: "Spawn missing required flag" },
];

/**
 * Transient patterns: failures caused by remote service slowness,
 * rate-limiting, or network blips. Retry with backoff — but DO NOT
 * invoke AI repair (rewriting the script will not make the API answer
 * faster).
 */
const TRANSIENT_PATTERNS: Array<{ rx: RegExp; reason: string; baseMs: number }> = [
  { rx: /idle[- ]?timed?\s*out|idle.timeout/i, reason: "Idle timeout", baseMs: 1000 },
  { rx: /\b429\b|rate[ -]?limit|RESOURCE_EXHAUSTED|\bquota\b/i, reason: "Rate limit", baseMs: 5000 },
  { rx: /HTTP\s*5\d\d|\b50[234]\b|overloaded|service unavailable/i, reason: "Upstream error", baseMs: 2000 },
  { rx: /\bECONNRESET\b|\bECONNREFUSED\b|\bETIMEDOUT\b|\bENOTFOUND\b|socket hang up/i, reason: "Network error", baseMs: 2000 },
  { rx: /credits?\s+(?:are\s+)?depleted|billing.*(exhausted|expired)/i, reason: "Credits depleted", baseMs: 60_000 },
];

export function classifyError(err: unknown): ClassifiedError {
  const haystack = errorHaystack(err);
  for (const pat of AUTHORING_PATTERNS) {
    if (pat.rx.test(haystack)) {
      const loc = extractSourceLocation(haystack);
      return { class: "authoring", reason: pat.reason, ...loc };
    }
  }
  for (const pat of TRANSIENT_PATTERNS) {
    if (pat.rx.test(haystack)) {
      return { class: "transient", reason: pat.reason, retryAfterMs: pat.baseMs };
    }
  }
  // Default: deterministic — the task's logic produced a wrong-shape
  // result; AI repair will see FEEDBACK.md and have a meaningful shot.
  return {
    class: "deterministic",
    reason: oneLine(errorMessage(err)) || "Unknown error",
  };
}

function errorMessage(err: unknown): string {
  if (err == null) return "";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object") {
    const m = (err as Record<string, unknown>).message;
    if (typeof m === "string") return m;
  }
  return "";
}

function errorHaystack(err: unknown): string {
  if (err == null) return "";
  if (typeof err === "string") return err;
  if (err instanceof Error) {
    return `${err.name}\n${err.message}\n${err.stack ?? ""}`;
  }
  if (typeof err === "object") {
    const e = err as Record<string, unknown>;
    const msg = typeof e.message === "string" ? e.message : "";
    const name = typeof e.name === "string" ? e.name : "";
    const stack = typeof e.stack === "string" ? e.stack : "";
    return `${name}\n${msg}\n${stack}`;
  }
  return String(err);
}

function oneLine(s: string): string {
  const first = s.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
  return first.trim().slice(0, 240);
}

/** Best-effort: pull `path:lineNo` out of a stack-like string. */
function extractSourceLocation(haystack: string): { sourcePath?: string; sourceLine?: number } {
  // Match e.g. "at fn (file:///abs/path/to/x.ts:42:10)" or "  at /abs/p.ts:42"
  const m = haystack.match(/(?:file:\/\/)?((?:[A-Za-z]:)?[^\s():]+\.(?:ts|js|md|yml|yaml)):(\d+)(?::\d+)?/);
  if (!m) return {};
  return { sourcePath: m[1], sourceLine: Number(m[2]) };
}

/* ------------------------------------------------------------------ */
/*  Retry policy                                                      */
/* ------------------------------------------------------------------ */

export interface BackoffOptions {
  /** Base delay in ms (1st retry). Doubled per attempt. */
  baseMs: number;
  /** Hard ceiling per retry. Default: 5 minutes. */
  capMs?: number;
}

/**
 * Standard exponential-backoff schedule.
 *   attempt=1 → baseMs
 *   attempt=2 → baseMs * 2
 *   attempt=3 → baseMs * 4
 *   ...capped at `capMs`.
 *
 * `attempt` is 1-based and assumed > 0. Values <= 0 are coerced to 1.
 */
export function computeBackoffMs(attempt: number, opts: BackoffOptions): number {
  const a = Math.max(1, Math.floor(attempt));
  const cap = opts.capMs ?? 300_000;
  const raw = opts.baseMs * Math.pow(2, a - 1);
  if (!Number.isFinite(raw) || raw < 0) return cap;
  return Math.min(raw, cap);
}
