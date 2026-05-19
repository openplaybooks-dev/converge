/**
 * RFC 0006 — Pre-flight cost estimation (part 1).
 *
 * Ships the pure-function estimator. Part 2 wires this into the
 * `converge plan --estimate` and `converge run` budget-gate paths, and
 * adds project.yml schema validation.
 */

export interface ModelCost {
  perCallUsd: number;
  perCallSeconds: number;
}

export interface CostBudget {
  softLimitUsd: number;
  hardLimitUsd: number;
}

export interface CostConfig {
  defaults: ModelCost;
  byModel: Record<string, ModelCost>;
  budget?: CostBudget;
}

export const DEFAULT_COST_CONFIG: CostConfig = {
  defaults: { perCallUsd: 0.05, perCallSeconds: 30 },
  byModel: {},
};

/** A task as the estimator sees it: AI calls + the model that handles them. */
export interface EstimatorTask {
  id: string;
  /** Total AI calls this task will make. 0 for non-AI tasks. */
  aiCalls: number;
  /** Which model handles those calls; falls back to `defaults` if absent or unknown. */
  model?: string;
}

export interface CostEstimate {
  totalCalls: number;
  totalUsd: number;
  totalSeconds: number;
  /** Per-model breakdown — only models with > 0 calls appear. */
  byModel: Array<{ model: string; calls: number; usd: number; seconds: number }>;
  /** Budget violations relative to the supplied config; empty when none. */
  budgetWarnings: Array<{ kind: "soft" | "hard"; limitUsd: number; estUsd: number }>;
}

/**
 * Compute a flat-call cost estimate for a DAG. Pure: no I/O, no side
 * effects. Caller is responsible for assembling `tasks[]` from the
 * compiled manifest + per-task frontmatter hints.
 */
export function estimateCost(
  tasks: EstimatorTask[],
  config: CostConfig = DEFAULT_COST_CONFIG,
): CostEstimate {
  const byModelMap = new Map<string, { calls: number; usd: number; seconds: number }>();
  let totalCalls = 0;
  let totalUsd = 0;
  let totalSeconds = 0;

  for (const t of tasks) {
    if (!Number.isFinite(t.aiCalls) || t.aiCalls <= 0) continue;
    const modelKey = t.model && config.byModel[t.model] ? t.model : "__default__";
    const rate = config.byModel[modelKey] ?? config.defaults;
    const calls = Math.floor(t.aiCalls);
    const usd = calls * rate.perCallUsd;
    const seconds = calls * rate.perCallSeconds;
    totalCalls += calls;
    totalUsd += usd;
    totalSeconds += seconds;
    const bucket = byModelMap.get(modelKey) ?? { calls: 0, usd: 0, seconds: 0 };
    bucket.calls += calls;
    bucket.usd += usd;
    bucket.seconds += seconds;
    byModelMap.set(modelKey, bucket);
  }

  const byModel = [...byModelMap.entries()]
    .map(([model, v]) => ({ model, ...v }))
    .sort((a, b) => b.usd - a.usd);

  const budgetWarnings: CostEstimate["budgetWarnings"] = [];
  if (config.budget) {
    if (totalUsd > config.budget.hardLimitUsd) {
      budgetWarnings.push({ kind: "hard", limitUsd: config.budget.hardLimitUsd, estUsd: totalUsd });
    } else if (totalUsd > config.budget.softLimitUsd) {
      budgetWarnings.push({ kind: "soft", limitUsd: config.budget.softLimitUsd, estUsd: totalUsd });
    }
  }

  return {
    totalCalls,
    totalUsd: round2(totalUsd),
    totalSeconds,
    byModel: byModel.map((b) => ({ ...b, usd: round2(b.usd) })),
    budgetWarnings,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Render a one-screen summary suitable for `converge plan --estimate`.
 * Kept here so part 2's CLI integration doesn't need to re-derive the
 * formatting.
 */
export function formatEstimateSummary(est: CostEstimate, dagSize: number): string {
  const lines: string[] = [];
  lines.push(`DAG: ${dagSize} nodes, ${est.totalCalls > 0 ? est.byModel.reduce((s, b) => s + b.calls, 0) : 0} AI calls`);
  lines.push(`Estimated cost: $${est.totalUsd.toFixed(2)}`);
  const hours = Math.floor(est.totalSeconds / 3600);
  const minutes = Math.floor((est.totalSeconds % 3600) / 60);
  lines.push(`Estimated time: ${hours}h ${minutes}m`);
  if (est.byModel.length > 0) {
    lines.push("By model:");
    for (const b of est.byModel) {
      lines.push(`  ${b.model.padEnd(20)} ${String(b.calls).padStart(4)} calls  $${b.usd.toFixed(2)}`);
    }
  }
  for (const w of est.budgetWarnings) {
    lines.push(`${w.kind === "hard" ? "❌ HARD" : "⚠ SOFT"} budget exceeded: $${w.estUsd.toFixed(2)} > $${w.limitUsd.toFixed(2)}`);
  }
  return lines.join("\n");
}
