/**
 * RFC 0018 — Cost telemetry tests.
 */
import { describe, it, expect } from "vitest";
import {
  computeCostUsd,
  buildUsageEvent,
  rollupByTask,
  totalRunCost,
  type AiUsageEvent,
  type PricingTable,
} from "../../src/telemetry/cost.ts";

const PRICING: PricingTable = {
  "claude-sonnet-4-6": {
    inputPer1MTokens: 3.00,
    outputPer1MTokens: 15.00,
    cacheReadPer1MTokens: 0.30,
  },
  "MiniMax-M2.7": {
    inputPer1MTokens: 0.40,
    outputPer1MTokens: 1.20,
  },
};

describe("computeCostUsd", () => {
  it("computes input + output cost from per-1M rates", () => {
    // 1M in @ $3 + 1M out @ $15 = $18
    const c = computeCostUsd({
      model: "claude-sonnet-4-6",
      tokensIn: 1_000_000,
      tokensOut: 1_000_000,
      pricing: PRICING,
    });
    expect(c).toBe(18);
  });

  it("uses cacheReadPer1MTokens for input when cacheHit is true", () => {
    // 1M in @ $0.30 + 1M out @ $15 = $15.30
    const c = computeCostUsd({
      model: "claude-sonnet-4-6",
      tokensIn: 1_000_000,
      tokensOut: 1_000_000,
      cacheHit: true,
      pricing: PRICING,
    });
    expect(c).toBe(15.30);
  });

  it("falls back to full input rate when cache rate is absent even on a cache hit", () => {
    const c = computeCostUsd({
      model: "MiniMax-M2.7",
      tokensIn: 1_000_000,
      tokensOut: 0,
      cacheHit: true,
      pricing: PRICING,
    });
    expect(c).toBe(0.40);
  });

  it("returns 0 for unknown model (compile-time should catch this)", () => {
    expect(computeCostUsd({
      model: "ghost-9000",
      tokensIn: 100_000,
      tokensOut: 100_000,
      pricing: PRICING,
    })).toBe(0);
  });

  it("handles small token counts without floating-point drift", () => {
    // 4231 in + 1572 out @ MiniMax = (4231/1e6)*0.40 + (1572/1e6)*1.20
    //                              = 0.0016924 + 0.0018864 = 0.0035788
    const c = computeCostUsd({
      model: "MiniMax-M2.7",
      tokensIn: 4231,
      tokensOut: 1572,
      pricing: PRICING,
    });
    expect(c).toBeCloseTo(0.003579, 6);
  });
});

describe("buildUsageEvent", () => {
  it("returns a fully-shaped AI_USAGE event with cost computed", () => {
    const ev = buildUsageEvent({
      taskId: "001-home",
      provider: "claude",
      model: "MiniMax-M2.7",
      tokensIn: 1_000_000,
      tokensOut: 0,
      durationMs: 12450,
      pricing: PRICING,
    });
    expect(ev).toEqual({
      eventType: "AI_USAGE",
      taskId: "001-home",
      provider: "claude",
      model: "MiniMax-M2.7",
      endpoint: undefined,
      tokensIn: 1_000_000,
      tokensOut: 0,
      cacheHit: undefined,
      costUsd: 0.40,
      durationMs: 12450,
      ts: undefined,
    });
  });

  it("forwards optional endpoint + cacheHit + ts", () => {
    const ev = buildUsageEvent({
      taskId: "t",
      provider: "claude",
      model: "claude-sonnet-4-6",
      endpoint: "https://api.example.com",
      tokensIn: 1000,
      tokensOut: 100,
      durationMs: 50,
      cacheHit: true,
      ts: "2026-05-19T00:00:00Z",
      pricing: PRICING,
    });
    expect(ev.endpoint).toBe("https://api.example.com");
    expect(ev.cacheHit).toBe(true);
    expect(ev.ts).toBe("2026-05-19T00:00:00Z");
  });
});

describe("rollupByTask + totalRunCost", () => {
  const events: AiUsageEvent[] = [
    {
      eventType: "AI_USAGE", taskId: "a", provider: "claude", model: "MiniMax-M2.7",
      tokensIn: 1000, tokensOut: 100, costUsd: 0.001, durationMs: 1,
    },
    {
      eventType: "AI_USAGE", taskId: "a", provider: "claude", model: "MiniMax-M2.7",
      tokensIn: 2000, tokensOut: 200, costUsd: 0.002, durationMs: 2,
    },
    {
      eventType: "AI_USAGE", taskId: "b", provider: "claude", model: "claude-sonnet-4-6",
      tokensIn: 1000, tokensOut: 100, costUsd: 0.10, durationMs: 3,
    },
  ];

  it("rolls up by task, sorted by cost desc", () => {
    const r = rollupByTask(events);
    expect(r).toHaveLength(2);
    expect(r[0].taskId).toBe("b");
    expect(r[0].totalCostUsd).toBe(0.10);
    expect(r[0].calls).toBe(1);
    expect(r[1].taskId).toBe("a");
    expect(r[1].totalCostUsd).toBe(0.003);
    expect(r[1].totalTokensIn).toBe(3000);
    expect(r[1].calls).toBe(2);
  });

  it("totalRunCost sums every event", () => {
    expect(totalRunCost(events)).toBe(0.103);
  });

  it("returns empty rollup for empty input", () => {
    expect(rollupByTask([])).toEqual([]);
    expect(totalRunCost([])).toBe(0);
  });
});
