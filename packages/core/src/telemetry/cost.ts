/**
 * RFC 0018 — Cost & token telemetry per task (part 1).
 *
 * Schema + cost computation. Part 2 wires this into the provider
 * adapters (`packages/core/src/ai/agentfn.ts`); part 3 adds the
 * `converge metrics` reporting CLI.
 */

/** Per-model pricing — USD per 1 million tokens. */
export interface ModelPricing {
  inputPer1MTokens: number;
  outputPer1MTokens: number;
  /** Optional discounted rate for prompt-cache reads. */
  cacheReadPer1MTokens?: number;
}

/** Pricing table keyed by model id. */
export type PricingTable = Record<string, ModelPricing>;

/** Per-AI-call usage capture. */
export interface AiUsageEvent {
  eventType: "AI_USAGE";
  taskId: string;
  provider: string;
  model: string;
  endpoint?: string;
  tokensIn: number;
  tokensOut: number;
  /** True when the response served from prompt cache (use cacheReadPer1MTokens for input cost). */
  cacheHit?: boolean;
  costUsd: number;
  durationMs: number;
  /** ISO timestamp; optional so tests can omit. */
  ts?: string;
}

/** Per-task roll-up. */
export interface TaskCostRollup {
  taskId: string;
  totalCostUsd: number;
  totalTokensIn: number;
  totalTokensOut: number;
  calls: number;
}

/* ------------------------------------------------------------------ */
/*  Cost computation                                                  */
/* ------------------------------------------------------------------ */

/**
 * Compute USD cost for a single call. Returns 0 when the model is not
 * in the pricing table — callers should validate pricing coverage at
 * compile time rather than relying on this fallback.
 */
export function computeCostUsd(args: {
  model: string;
  tokensIn: number;
  tokensOut: number;
  cacheHit?: boolean;
  pricing: PricingTable;
}): number {
  const p = args.pricing[args.model];
  if (!p) return 0;
  const inputRate =
    args.cacheHit && p.cacheReadPer1MTokens != null
      ? p.cacheReadPer1MTokens
      : p.inputPer1MTokens;
  const inputCost = (args.tokensIn / 1_000_000) * inputRate;
  const outputCost = (args.tokensOut / 1_000_000) * p.outputPer1MTokens;
  return round6(inputCost + outputCost);
}

/**
 * Convenience builder: take per-call usage + pricing and produce a
 * fully-shaped AI_USAGE event with cost filled in.
 */
export function buildUsageEvent(args: {
  taskId: string;
  provider: string;
  model: string;
  endpoint?: string;
  tokensIn: number;
  tokensOut: number;
  durationMs: number;
  cacheHit?: boolean;
  pricing: PricingTable;
  ts?: string;
}): AiUsageEvent {
  const costUsd = computeCostUsd(args);
  return {
    eventType: "AI_USAGE",
    taskId: args.taskId,
    provider: args.provider,
    model: args.model,
    endpoint: args.endpoint,
    tokensIn: args.tokensIn,
    tokensOut: args.tokensOut,
    cacheHit: args.cacheHit,
    costUsd,
    durationMs: args.durationMs,
    ts: args.ts,
  };
}

/* ------------------------------------------------------------------ */
/*  Roll-ups                                                          */
/* ------------------------------------------------------------------ */

/** Sum events into per-task rollups, returned sorted by cost desc. */
export function rollupByTask(events: AiUsageEvent[]): TaskCostRollup[] {
  const byTask = new Map<string, TaskCostRollup>();
  for (const ev of events) {
    let r = byTask.get(ev.taskId);
    if (!r) {
      r = {
        taskId: ev.taskId,
        totalCostUsd: 0,
        totalTokensIn: 0,
        totalTokensOut: 0,
        calls: 0,
      };
      byTask.set(ev.taskId, r);
    }
    r.totalCostUsd += ev.costUsd;
    r.totalTokensIn += ev.tokensIn;
    r.totalTokensOut += ev.tokensOut;
    r.calls += 1;
  }
  return [...byTask.values()]
    .map((r) => ({ ...r, totalCostUsd: round6(r.totalCostUsd) }))
    .sort((a, b) => b.totalCostUsd - a.totalCostUsd);
}

/** Single-number run total. */
export function totalRunCost(events: AiUsageEvent[]): number {
  return round6(events.reduce((s, ev) => s + ev.costUsd, 0));
}

function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}
