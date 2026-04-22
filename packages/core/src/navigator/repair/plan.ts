/**
 * Repair Plan — Serializable Plan Graph
 *
 * RepairPlan is now a Graph (flat nodes + edges).
 * This file keeps the Zod schema for AI plan generation validation,
 * the confidence check, and re-exports predicate functions from the
 * unified registry.
 */

import { z } from "zod";
import type { Gap } from "../../task/gap/types.ts";
import type { GraphNode } from "../core/types.ts";

/* ------------------------------------------------------------------ */
/*  Runtime context (kept for backward compat with callers)            */
/* ------------------------------------------------------------------ */

export interface PlanContext {
  lastActionSucceeded: boolean;
  lastActionName: string | null;
  lastActionRetryMode?: import("./types.ts").RetryMode;
  gap: Gap;
  attemptsCount: number;
}

/* ------------------------------------------------------------------ */
/*  Zod schema (validates Graph shape)                                 */
/* ------------------------------------------------------------------ */

const GraphNodeSchema = z.object({
  id: z.string(),
  handler: z.string(),
  status: z
    .enum(["buffered", "executing", "done", "failed", "skipped"])
    .default("buffered"),
  origin: z.enum(["initial", "planned", "reactive"]).default("planned"),
  data: z.record(z.unknown()).optional(),
});

const GraphSchema = z.object({
  nodes: z.array(GraphNodeSchema),
});

export const RepairPlanSchema = z.object({
  plan: GraphSchema,
  reasoning: z.string(),
});
export type RepairPlan = z.infer<typeof RepairPlanSchema>;

/* ------------------------------------------------------------------ */
/*  Predicate re-exports (unified registry)                            */
/* ------------------------------------------------------------------ */

export { evalPredicate, listPredicates } from "../core/predicates.ts";

/* ------------------------------------------------------------------ */
/*  Confidence check                                                    */
/* ------------------------------------------------------------------ */

/**
 * Returns true when there is enough evidence to generate a multi-step plan.
 * If false, the pipeline falls back to single-strategy selection (unchanged).
 */
export function isConfidentToPlan(
  history: Array<{ strategy: string; succeeded: boolean }>,
  gap: Gap,
): boolean {
  if (history.length > 0) return true; // evidence from prior attempts
  const gapKind = gap.metadata?.gapKind as string | undefined;
  // Well-known sequences for these gap types
  return (
    gapKind === "input" || gapKind === "blocker" || gapKind === "check-failed"
  );
}
