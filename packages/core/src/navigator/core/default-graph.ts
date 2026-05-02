/**
 * Navigator Graph — Phased Node Builders & Goal Conditions
 *
 * Just-in-time injection: nodes are added in phases rather than pre-seeded.
 *
 *   Phase 1 — Pre-flight (always): check-wbs-seeded, check-outputs-exist,
 *             detect-gaps, signal-done
 *   Phase 2 — Response (only when gaps found): nodes matching the gap kinds
 *   Phase 3 — Post-action (after a response node runs): verify, check-stall,
 *             advance-attempt
 *
 * Goal conditions are the exit criteria: when all are satisfied, convergence
 * is done.
 */

import type { GraphNode, GoalCondition } from "./types.ts";
import type { Unit } from "../../task/unit/unit.ts";
import type { Gap } from "../../task/gap/types.ts";
import { GapKind } from "../../task/gap/types.ts";

/* ------------------------------------------------------------------ */
/*  Builder helper                                                     */
/* ------------------------------------------------------------------ */

function buffered(
  id: string,
  handler: string,
  priority: number,
  applicable?: string,
  extra?: Record<string, unknown>,
): GraphNode {
  return {
    id,
    handler,
    status: "buffered",
    origin: "initial",
    data: {
      priority,
      ...(applicable ? { applicable } : {}),
      ...(extra ?? {}),
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Goal conditions — exit criteria                                    */
/* ------------------------------------------------------------------ */

export const GOAL_CONDITIONS: GoalCondition[] = [
  { name: "noGaps", check: (s) => s.gaps.length === 0 },
];

/* ------------------------------------------------------------------ */
/*  Phase 1 — Pre-flight (always seeded)                               */
/* ------------------------------------------------------------------ */

export function buildPreflightNodes(_unit: Unit): GraphNode[] {
  return [
    buffered("check-wbs-seeded", "check-wbs-seeded", 100),
    buffered("check-outputs-exist", "check-outputs-exist", 99),
    buffered("detect-gaps", "detect-gaps", 98),
    buffered("signal-done", "signal-done", 97, "noGapsAndExecuted"),
  ];
}

/* ------------------------------------------------------------------ */
/*  Phase 2 — Response (injected when gaps are found)                  */
/* ------------------------------------------------------------------ */

export function buildResponseNodes(
  unit: Unit,
  gaps: readonly Gap[],
  iteration: number,
): GraphNode[] {
  const nodes: GraphNode[] = [];

  const hasPlan = gaps.some((g) => g.metadata?.gapKind === GapKind.plan);
  const hasWbs = gaps.some((g) => g.metadata?.gapKind === GapKind.wbs);
  const hasBlocker = gaps.some((g) => g.metadata?.gapKind === GapKind.blocker);
  const hasSystemic = gaps.some(
    (g) => g.metadata?.gapKind === GapKind.systemic,
  );
  const hasWbsScript = gaps.some(
    (g) => g.metadata?.gapKind === GapKind.wbsScript,
  );
  const hasUserQ = gaps.some(
    (g) => g.metadata?.gapKind === GapKind.userQuestion,
  );
  const hasRepairable = gaps.some((g) => {
    const kind = g.metadata?.gapKind as string | undefined;
    return (
      kind === GapKind.output ||
      kind === GapKind.checkFailed ||
      kind === GapKind.corrupted ||
      kind === GapKind.insufficientEvidence ||
      kind === GapKind.contradictoryFinding ||
      kind === GapKind.untestedHypothesis
    );
  });

  if (hasPlan && unit.planConfig) {
    nodes.push(buffered("resolve-plan", "resolve-plan", 90));
  }

  if (hasWbs && unit.seedFn) {
    nodes.push(buffered("resolve-wbs", "resolve-wbs", 85));
  }

  if (hasBlocker) {
    if (iteration === 1) {
      nodes.push(buffered("resolve-blockers", "resolve-blockers", 80));
    } else {
      nodes.push(buffered("bail-blockers", "bail-blockers", 79));
    }
  }

  if (hasSystemic && unit.seedFn) {
    nodes.push(
      buffered(
        "strategy-wbs-generator-repair",
        "strategy-wbs-generator-repair",
        75,
      ),
    );
  }

  if (hasWbsScript && unit.seedFn) {
    nodes.push(
      buffered("strategy-wbs-script-repair", "strategy-wbs-script-repair", 70),
    );
  }

  if (iteration === 1) {
    nodes.push(buffered("run-executor", "run-executor", 65));
  }

  if (hasUserQ) {
    nodes.push(
      buffered(
        "strategy-user-question-resume",
        "strategy-user-question-resume",
        60,
      ),
    );
  }

  if (hasRepairable && ((unit.outputs?.length ?? 0) > 0 || unit.checks)) {
    nodes.push(buffered("repair-loop", "repair-loop", 55));
  }

  return nodes;
}

/* ------------------------------------------------------------------ */
/*  Phase 3 — Post-action (injected after a response node completes)   */
/* ------------------------------------------------------------------ */

export function buildPostActionNodes(): GraphNode[] {
  return [
    buffered("verify", "verify", 50),
    buffered("check-stall", "check-stall", 45),
    buffered("advance-attempt", "advance-attempt", 40),
  ];
}

/* ------------------------------------------------------------------ */
/*  Backward compatibility                                             */
/* ------------------------------------------------------------------ */

/** @deprecated Use buildPreflightNodes, buildResponseNodes, buildPostActionNodes */
export function buildInitialNodes(unit: Unit): GraphNode[] {
  return buildPreflightNodes(unit);
}
