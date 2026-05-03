/**
 * Gap Weight System — Weighted scoring for convergence.
 *
 * Not all gaps are equal. A missing feature deliverable is ~100x more
 * impactful than a TypeScript error. The weight system ensures the
 * convergence loop prioritizes what actually matters.
 *
 * Weight scale (logarithmic intent):
 *   1000  — missing deliverable (output file not produced)
 *    500  — structural gap (plan/Seed not seeded)
 *    200  — blocked dependency (input missing, chain broken)
 *    100  — custom check failed (task-specific validation)
 *     50  — corrupted output (exists but invalid)
 *     10  — backlog:high (tsc errors, critical lint)
 *      5  — backlog:medium (eslint warnings, unused imports)
 *      1  — backlog:low (TODOs, FIXMEs)
 */

import type { Gap } from "../task/gap/types.ts";

/* ------------------------------------------------------------------ */
/*  Weight Map                                                         */
/* ------------------------------------------------------------------ */

/** Gap kind → base weight. Derived from gap.metadata.gapKind. */
const KIND_WEIGHTS: Record<string, number> = {
  output: 1000,
  plan: 500,
  seed: 500,
  blocker: 200,
  "check-failed": 100,
  corrupted: 50,
  "insufficient-evidence": 300,
  "contradictory-finding": 400,
  "untested-hypothesis": 150,
  backlog: 10, // default for backlog items; refined by severity
};

/** Severity multiplier applied on top of base weight. */
const SEVERITY_MULTIPLIER: Record<string, number> = {
  critical: 4,
  high: 2,
  medium: 1,
  low: 0.5,
};

/** Backlog severity → weight (overrides base when gapKind === 'backlog'). */
const BACKLOG_SEVERITY_WEIGHTS: Record<string, number> = {
  high: 10,
  medium: 5,
  low: 1,
};

/* ------------------------------------------------------------------ */
/*  Scoring Functions                                                   */
/* ------------------------------------------------------------------ */

/**
 * Compute the weight of a single gap.
 */
export function gapWeight(gap: Gap): number {
  const kind = (gap.metadata?.gapKind as string) ?? gap.type;

  // Backlog gaps use their own severity table
  if (kind === "backlog") {
    const sev =
      (gap.metadata?.backlogSeverity as string) ?? gap.severity ?? "medium";
    return BACKLOG_SEVERITY_WEIGHTS[sev] ?? BACKLOG_SEVERITY_WEIGHTS.medium;
  }

  const base = KIND_WEIGHTS[kind] ?? 50;
  const mult = SEVERITY_MULTIPLIER[gap.severity ?? "medium"] ?? 1;
  return Math.round(base * mult);
}

/**
 * Compute the total weighted score for a set of gaps.
 * Lower is better. Zero means converged.
 */
export function totalScore(gaps: Gap[]): number {
  return gaps.reduce((sum, g) => sum + gapWeight(g), 0);
}

/**
 * Score breakdown by gap kind — useful for trend display.
 */
export function scoreByKind(gaps: Gap[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const g of gaps) {
    const kind = (g.metadata?.gapKind as string) ?? g.type;
    result[kind] = (result[kind] ?? 0) + gapWeight(g);
  }
  return result;
}

/**
 * Score breakdown by severity.
 */
export function scoreBySeverity(gaps: Gap[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const g of gaps) {
    const sev = g.severity ?? "medium";
    result[sev] = (result[sev] ?? 0) + gapWeight(g);
  }
  return result;
}

/**
 * Sort gaps by weight descending (highest-impact first).
 * Returns a new array; does not mutate.
 */
export function sortByWeight(gaps: Gap[]): Gap[] {
  return [...gaps].sort((a, b) => gapWeight(b) - gapWeight(a));
}
