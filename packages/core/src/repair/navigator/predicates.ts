/**
 * Unified Predicate Registry
 *
 * All named predicates in one place — both walker-level (from default-graph.ts)
 * and plan-level (from plan.ts). Condition nodes reference predicates by string
 * key so the entire tree is JSON-serializable.
 */

import { GapKind } from "../../gap/types.ts";
import type { Snapshot } from "./types.ts";

/* ------------------------------------------------------------------ */
/*  Registry                                                           */
/* ------------------------------------------------------------------ */

const PREDICATES: Record<string, (s: Snapshot) => boolean> = {
  // Walker-level
  noGaps: (s) => s.gaps.length === 0,
  hasPlan: (s) => s.gaps.some((g) => g.metadata?.gapKind === GapKind.plan),
  hasWbs: (s) => s.gaps.some((g) => g.metadata?.gapKind === GapKind.wbs),
  hasBlocker: (s) =>
    s.gaps.some((g) => g.metadata?.gapKind === GapKind.blocker),
  isFirst: (s) => s.iteration === 1,
  hasSystemic: (s) =>
    s.gaps.some((g) => g.metadata?.gapKind === GapKind.systemic),
  hasWbsScript: (s) =>
    s.gaps.some((g) => g.metadata?.gapKind === GapKind.wbsScript),
  hasUserQ: (s) =>
    s.gaps.some((g) => g.metadata?.gapKind === GapKind.userQuestion),
  hasOutput: (s) => s.gaps.some((g) => g.metadata?.gapKind === GapKind.output),
  hasCheckFail: (s) =>
    s.gaps.some((g) => g.metadata?.gapKind === GapKind.checkFailed),
  hasCorrupted: (s) =>
    s.gaps.some((g) => g.metadata?.gapKind === GapKind.corrupted),
  hasRepairableGap: (s) =>
    s.gaps.some((g) => {
      const kind = g.metadata?.gapKind as string | undefined;
      return (
        kind === GapKind.output ||
        kind === GapKind.checkFailed ||
        kind === GapKind.corrupted ||
        kind === GapKind.insufficientEvidence ||
        kind === GapKind.contradictoryFinding ||
        kind === GapKind.untestedHypothesis
      );
    }),
  hasInsufficientEvidence: (s) =>
    s.gaps.some(
      (g) => g.metadata?.gapKind === GapKind.insufficientEvidence,
    ),
  hasContradiction: (s) =>
    s.gaps.some(
      (g) => g.metadata?.gapKind === GapKind.contradictoryFinding,
    ),
  hasUntestedHypothesis: (s) =>
    s.gaps.some(
      (g) => g.metadata?.gapKind === GapKind.untestedHypothesis,
    ),
  hasKnowledgeGap: (s) =>
    s.gaps.some((g) => {
      const kind = g.metadata?.gapKind as string | undefined;
      return (
        kind === GapKind.insufficientEvidence ||
        kind === GapKind.contradictoryFinding ||
        kind === GapKind.untestedHypothesis
      );
    }),

  // Compound predicates for navigator applicability
  hasBlockerAndIsFirst: (s) =>
    s.gaps.some((g) => g.metadata?.gapKind === GapKind.blocker) &&
    s.iteration === 1,
  hasBlockerAndNotFirst: (s) =>
    s.gaps.some((g) => g.metadata?.gapKind === GapKind.blocker) &&
    s.iteration > 1,

  // Unit dispatch predicates (split run-executor into resumable nodes)
  hasExecutorFn: (s) => !!s.unit.executorFn,
  hasLoopFn: (s) => !!s.unit.loopFn,
  hasSkill: (s) => {
    const skill = s.unit.skill;
    if (!skill) return false;
    return Array.isArray(skill)
      ? skill.length > 0
      : typeof skill === "string" && skill.length > 0;
  },

  // Plan-level (use snap.lastActionSucceeded etc.)
  "last-succeeded": (s) => s.lastActionSucceeded === true,
  "last-failed": (s) => s.lastActionSucceeded === false,
  "gap-is-blocker": (s) =>
    s.gaps.some((g) => g.metadata?.gapKind === "blocker"),
  "gap-is-check-failed": (s) =>
    s.gaps.some((g) => g.metadata?.gapKind === "check-failed"),
  "gap-is-output": (s) => s.gaps.some((g) => g.metadata?.gapKind === "output"),
  "backoff-scheduled": (s) =>
    typeof s.lastActionRetryMode === "object" &&
    (s.lastActionRetryMode as any)?.type === "backoff",
};

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export function evalPredicate(name: string, snap: Snapshot): boolean {
  const fn = PREDICATES[name];
  if (!fn) return false;
  return fn(snap);
}

export function listPredicates(): string[] {
  return Object.keys(PREDICATES);
}
