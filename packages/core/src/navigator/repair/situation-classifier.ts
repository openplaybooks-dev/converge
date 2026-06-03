/**
 * Situation classifier — RFC 0048.
 *
 * The runner classifies the current attempt into one of 8 fixed situations,
 * then the packet builder formats the right prompt shape for it. The
 * classification is closed and ordered: precedence resolves ambiguity.
 *
 * Precedence (highest to lowest):
 *   definition-repair > human-review-revision > blocked-input >
 *   interrupted-resume > producer-rerun > retry-check-failed >
 *   retry-missing-output > first-run
 */

import type {
  AttemptStatus,
  TaskAttemptContext,
} from "../../task/lifecycle/attempt-context.ts";

export type Situation =
  | "first-run"
  | "retry-missing-output"
  | "retry-check-failed"
  | "blocked-input"
  | "producer-rerun"
  | "interrupted-resume"
  | "human-review-revision"
  | "definition-repair";

export interface SituationFacts {
  attempt: TaskAttemptContext;
  /** True if at least one prior attempt exists for this task. */
  hasPriorAttempt: boolean;
  /** Status of the most recent prior attempt, if any. */
  priorStatus?: AttemptStatus;
  /** True when a human-review verdict is awaiting action. */
  hasHumanReview: boolean;
  /** True when a producer's output changed since this task last ran. */
  producerChanged: boolean;
  /** True when the task definition itself is broken / needs repair. */
  isDefinitionIssue: boolean;
}

/* ------------------------------------------------------------------ */
/*  Helpers — derived facts about the current attempt                  */
/* ------------------------------------------------------------------ */

export function isBlocked(attempt: TaskAttemptContext): boolean {
  if (attempt.status === "blocked") return true;
  return attempt.inputs.some((i) => i.count === 0);
}

export function hasFailedChecks(attempt: TaskAttemptContext): boolean {
  return attempt.checks.some((c) => c.passed === false);
}

export function hasMissingOutputs(attempt: TaskAttemptContext): boolean {
  return attempt.outputs.some((o) => !o.exists);
}

export function wasInterrupted(
  priorStatus: AttemptStatus | undefined,
  attempt: TaskAttemptContext,
): boolean {
  if (attempt.status === "interrupted") return true;
  if (priorStatus === "interrupted") return true;
  return false;
}

/* ------------------------------------------------------------------ */
/*  Classifier                                                         */
/* ------------------------------------------------------------------ */

/**
 * Pick one fixed situation from the current facts. Precedence is enforced
 * strictly: a higher-priority situation suppresses lower ones even when
 * multiple signals are present.
 */
export function classifySituation(facts: SituationFacts): Situation {
  const {
    attempt,
    hasPriorAttempt,
    priorStatus,
    hasHumanReview,
    producerChanged,
    isDefinitionIssue,
  } = facts;

  // 1. Definition repair beats everything — if the task is broken, no
  //    other signal matters.
  if (isDefinitionIssue) return "definition-repair";

  // 2. Human review feedback takes precedence over plain retries.
  if (hasHumanReview) return "human-review-revision";

  // 3. Blocked input — we cannot proceed without inputs, so do not
  //    pretend this is a retry.
  if (isBlocked(attempt)) return "blocked-input";

  // 4. Interrupted resume — continue from where we left off.
  if (hasPriorAttempt && wasInterrupted(priorStatus, attempt)) {
    return "interrupted-resume";
  }

  // 5. Producer rerun — upstream changed, downstream must re-evaluate.
  if (hasPriorAttempt && producerChanged) return "producer-rerun";

  // 6. Retry with check failure — fix the check first.
  if (hasPriorAttempt && hasFailedChecks(attempt)) {
    return "retry-check-failed";
  }

  // 7. Retry with missing output — produce the missing artifact.
  if (hasPriorAttempt && hasMissingOutputs(attempt)) {
    return "retry-missing-output";
  }

  // 8. Default: first execution.
  return "first-run";
}
