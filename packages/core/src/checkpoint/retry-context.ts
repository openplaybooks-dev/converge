/**
 * RFC 0009 — Structured retry context (part 1: schema + aggregator).
 *
 * Agents reason better about structured input than prose. Alongside the
 * human-readable FEEDBACK.md, ship a `retry-context.json` so the repair
 * agent gets the prior attempts' outcomes machine-readably.
 *
 * Part 1 ships the schema + pure aggregator that takes a list of
 * already-parsed journal events for a task and folds them into the
 * structured shape. Part 2 wires it into the journal reader + executor
 * pre-attempt hook.
 */

export const RETRY_CONTEXT_SCHEMA_VERSION = 1;

export type AttemptOutcome =
  | "check_fail"
  | "output_missing"
  | "transient"
  | "authoring"
  | "deterministic"
  | "success";

export interface FailedCheck {
  id: string;
  command: string;
  actualStdout?: string;
  actualExitCode?: number;
  interpretation?: string;
}

export interface ToolCallRecord {
  name: string;
  target?: string;
  result: "success" | "failure";
}

export interface AttemptRecord {
  attempt: number;
  outcome: AttemptOutcome;
  durationMs: number;
  filesProduced: string[];
  filesModified: string[];
  failedChecks: FailedCheck[];
  passedChecks: string[];
  toolCalls: ToolCallRecord[];
}

export interface RetryContext {
  schemaVersion: typeof RETRY_CONTEXT_SCHEMA_VERSION;
  attempt: number;
  maxAttempts: number;
  priorAttempts: AttemptRecord[];
}

/**
 * Minimal event shape the aggregator consumes. Matches RFC 0004's
 * `JournalEvent` for transition without coupling: the aggregator only
 * looks at `taskId`, `eventType`, and `payload`.
 */
export interface RetryEvent {
  ts: number;
  taskId: string;
  eventType: string;
  payload?: Record<string, unknown> | undefined;
}

/**
 * Fold task events into a RetryContext. Pure: no I/O. Caller passes in
 * the chronologically-ordered events for one taskId, plus the upcoming
 * attempt number and maxAttempts.
 *
 * Recognised event types (subset — unknown types are ignored):
 *   - TASK_ATTEMPT_START   payload: { attempt }
 *   - TASK_ATTEMPT_END     payload: { attempt, outcome, durationMs }
 *   - FILE_PRODUCED        payload: { attempt, path }
 *   - FILE_MODIFIED        payload: { attempt, path }
 *   - CHECK_PASS           payload: { attempt, id }
 *   - CHECK_FAIL           payload: { attempt, id, command, stdout, exitCode, interpretation }
 *   - TOOL_CALL            payload: { attempt, name, target, result }
 */
export function buildRetryContext(args: {
  events: RetryEvent[];
  attempt: number;
  maxAttempts: number;
}): RetryContext {
  const byAttempt = new Map<number, AttemptRecord>();
  const get = (n: number): AttemptRecord => {
    let rec = byAttempt.get(n);
    if (!rec) {
      rec = {
        attempt: n,
        outcome: "deterministic",
        durationMs: 0,
        filesProduced: [],
        filesModified: [],
        failedChecks: [],
        passedChecks: [],
        toolCalls: [],
      };
      byAttempt.set(n, rec);
    }
    return rec;
  };

  for (const ev of args.events) {
    const p = (ev.payload ?? {}) as Record<string, unknown>;
    const attempt = typeof p.attempt === "number" ? p.attempt : undefined;
    if (attempt == null) continue;
    if (attempt >= args.attempt) continue; // only PRIOR attempts go in retry-context

    const rec = get(attempt);
    switch (ev.eventType) {
      case "TASK_ATTEMPT_START":
        // no-op for now; outcome/durationMs come from end event
        break;
      case "TASK_ATTEMPT_END": {
        const outcome = p.outcome;
        if (isAttemptOutcome(outcome)) rec.outcome = outcome;
        if (typeof p.durationMs === "number") rec.durationMs = p.durationMs;
        break;
      }
      case "FILE_PRODUCED":
        if (typeof p.path === "string") rec.filesProduced.push(p.path);
        break;
      case "FILE_MODIFIED":
        if (typeof p.path === "string") rec.filesModified.push(p.path);
        break;
      case "CHECK_PASS":
        if (typeof p.id === "string") rec.passedChecks.push(p.id);
        break;
      case "CHECK_FAIL":
        if (typeof p.id === "string" && typeof p.command === "string") {
          const fc: FailedCheck = { id: p.id, command: p.command };
          if (typeof p.stdout === "string") fc.actualStdout = p.stdout;
          if (typeof p.exitCode === "number") fc.actualExitCode = p.exitCode;
          if (typeof p.interpretation === "string") fc.interpretation = p.interpretation;
          rec.failedChecks.push(fc);
        }
        break;
      case "TOOL_CALL":
        if (typeof p.name === "string") {
          rec.toolCalls.push({
            name: p.name,
            target: typeof p.target === "string" ? p.target : undefined,
            result: p.result === "failure" ? "failure" : "success",
          });
        }
        break;
    }
  }

  const priorAttempts = [...byAttempt.values()].sort((a, b) => a.attempt - b.attempt);
  return {
    schemaVersion: RETRY_CONTEXT_SCHEMA_VERSION,
    attempt: args.attempt,
    maxAttempts: args.maxAttempts,
    priorAttempts,
  };
}

function isAttemptOutcome(v: unknown): v is AttemptOutcome {
  return v === "check_fail" || v === "output_missing" || v === "transient" ||
    v === "authoring" || v === "deterministic" || v === "success";
}
