/**
 * RFC 0017 — Successor contract resolver (part 1).
 *
 * Maps a failure event against a TASK.md's `on_fail:` clauses (top
 * down, first match) and returns the action the orchestrator should
 * take. Part 2 wires this into the failure-handling flow alongside
 * RFC 0003's classifier; part 3 adds frontmatter schema validation.
 */
import type { ErrorClass } from "./error-class.ts";

export interface SpawnAction {
  kind: "spawn";
  templatePath: string;
  inheritVars: string[];
  inheritOutputs: boolean;
}

export interface RetryAction {
  kind: "retry";
  strategy: "backoff" | "immediate";
  max: number;
}

export interface AbortAction {
  kind: "abort";
}

export type SuccessorAction = SpawnAction | RetryAction | AbortAction;

export interface OnFailClause {
  /**
   * Match expression. Supported forms:
   *   - `check_fail:<id>`        — matches a specific failed check
   *   - `error_class:<class>`    — matches a classified error
   *   - `output_missing:<path>`  — matches a missing declared output
   *   - `default`                — fallthrough, must come last
   */
  if?: string;
  default?: boolean;
  spawn?: string;
  inherit_vars?: string[];
  inherit_outputs?: boolean;
  retry?: { strategy: "backoff" | "immediate"; max: number };
  abort_run?: boolean;
}

export interface FailureEvent {
  /** Failed check id, when the failure is a check_fail. */
  failedCheck?: string;
  /** RFC 0003 classification. */
  errorClass?: ErrorClass;
  /** Missing declared-output path, when the failure is an output gap. */
  missingOutput?: string;
}

/**
 * Resolve the first matching `on_fail:` clause to an action. Returns
 * `null` if no clause matches (caller falls through to the existing
 * generic-repair path).
 */
export function resolveSuccessor(
  clauses: OnFailClause[],
  event: FailureEvent,
): SuccessorAction | null {
  for (const clause of clauses) {
    if (!clauseMatches(clause, event)) continue;
    if (clause.abort_run) return { kind: "abort" };
    if (clause.retry) {
      return {
        kind: "retry",
        strategy: clause.retry.strategy,
        max: clause.retry.max,
      };
    }
    if (clause.spawn) {
      return {
        kind: "spawn",
        templatePath: clause.spawn,
        inheritVars: clause.inherit_vars ?? [],
        inheritOutputs: clause.inherit_outputs === true,
      };
    }
    // Clause matched but specifies no action — treat as no-op, keep
    // walking. Authoring error; should be caught at validation time.
  }
  return null;
}

function clauseMatches(clause: OnFailClause, event: FailureEvent): boolean {
  if (clause.default) return true;
  const expr = clause.if;
  if (!expr) return false;
  const idx = expr.indexOf(":");
  if (idx < 0) return false;
  const kind = expr.slice(0, idx);
  const arg = expr.slice(idx + 1);
  switch (kind) {
    case "check_fail":    return event.failedCheck === arg;
    case "error_class":   return event.errorClass === arg;
    case "output_missing": return event.missingOutput === arg;
    default:              return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Compile-time validation                                           */
/* ------------------------------------------------------------------ */

/**
 * Validate an `on_fail:` block at compile time. Catches:
 *   - `default:` clause not at the end.
 *   - Unknown `if:` match kinds.
 *   - Self-spawning cycles (clause spawns the same task's template).
 *   - Clauses with neither action nor pass-through.
 * Returns an array of human-readable error messages; empty when valid.
 */
export function validateOnFail(args: {
  clauses: OnFailClause[];
  /** Path to the task itself, used to detect self-spawn cycles. */
  ownTaskPath?: string;
}): string[] {
  const errors: string[] = [];
  for (let i = 0; i < args.clauses.length; i++) {
    const c = args.clauses[i];
    if (c.default && i !== args.clauses.length - 1) {
      errors.push(`on_fail[${i}]: 'default:' clause must be last`);
    }
    if (!c.default && !c.if) {
      errors.push(`on_fail[${i}]: missing 'if:' or 'default:'`);
    }
    if (c.if) {
      const idx = c.if.indexOf(":");
      const kind = idx < 0 ? c.if : c.if.slice(0, idx);
      if (!["check_fail", "error_class", "output_missing"].includes(kind)) {
        errors.push(`on_fail[${i}]: unknown match kind '${kind}'`);
      }
    }
    if (!c.spawn && !c.retry && !c.abort_run) {
      errors.push(`on_fail[${i}]: must specify spawn / retry / abort_run`);
    }
    if (c.spawn && args.ownTaskPath && c.spawn === args.ownTaskPath) {
      errors.push(`on_fail[${i}]: spawn template points at this same task (cycle)`);
    }
  }
  return errors;
}
