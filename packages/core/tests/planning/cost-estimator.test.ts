/**
 * RFC 0006 — Cost estimator tests.
 */
import { describe, it, expect } from "vitest";
import {
  estimateCost,
  formatEstimateSummary,
  DEFAULT_COST_CONFIG,
  type CostConfig,
  type EstimatorTask,
} from "../../src/planning/cost-estimator.ts";

const CFG: CostConfig = {
  defaults: { perCallUsd: 0.05, perCallSeconds: 30 },
  byModel: {
    "claude-opus-4-7": { perCallUsd: 0.30, perCallSeconds: 25 },
    "MiniMax-M2.7": { perCallUsd: 0.02, perCallSeconds: 45 },
  },
  budget: { softLimitUsd: 50, hardLimitUsd: 200 },
};

describe("estimateCost", () => {
  it("returns zeros for an empty task list", () => {
    const est = estimateCost([], CFG);
    expect(est).toEqual({
      totalCalls: 0,
      totalUsd: 0,
      totalSeconds: 0,
      byModel: [],
      budgetWarnings: [],
    });
  });

  it("uses per-model rates when the model is configured", () => {
    const tasks: EstimatorTask[] = [
      { id: "a", aiCalls: 4, model: "claude-opus-4-7" },
      { id: "b", aiCalls: 43, model: "MiniMax-M2.7" },
    ];
    const est = estimateCost(tasks, CFG);
    expect(est.totalCalls).toBe(47);
    expect(est.totalUsd).toBe(2.06); // 4*0.30 + 43*0.02
    expect(est.byModel.map((b) => b.model)).toEqual(["claude-opus-4-7", "MiniMax-M2.7"]);
  });

  it("falls back to defaults when the model is unknown", () => {
    const est = estimateCost([{ id: "a", aiCalls: 10, model: "ghost-9000" }], CFG);
    expect(est.totalUsd).toBe(0.5); // 10 * defaults.perCallUsd
    expect(est.byModel[0].model).toBe("__default__");
  });

  it("ignores tasks with non-positive aiCalls", () => {
    const est = estimateCost([
      { id: "a", aiCalls: 0 },
      { id: "b", aiCalls: -3 },
      { id: "c", aiCalls: Number.NaN },
      { id: "d", aiCalls: 5 },
    ], CFG);
    expect(est.totalCalls).toBe(5);
  });

  it("floors fractional aiCalls", () => {
    const est = estimateCost([{ id: "a", aiCalls: 2.9 }], CFG);
    expect(est.totalCalls).toBe(2);
  });

  it("emits a soft-budget warning between limits", () => {
    const est = estimateCost(
      [{ id: "a", aiCalls: 200, model: "claude-opus-4-7" }],
      { ...CFG, budget: { softLimitUsd: 50, hardLimitUsd: 200 } },
    );
    // 200 * 0.30 = $60 → between $50 soft and $200 hard
    expect(est.budgetWarnings).toEqual([{ kind: "soft", limitUsd: 50, estUsd: 60 }]);
  });

  it("emits a hard-budget warning when over hardLimit", () => {
    const est = estimateCost(
      [{ id: "a", aiCalls: 1000, model: "claude-opus-4-7" }],
      { ...CFG, budget: { softLimitUsd: 50, hardLimitUsd: 200 } },
    );
    // 1000 * 0.30 = $300 > $200 hard
    expect(est.budgetWarnings).toEqual([{ kind: "hard", limitUsd: 200, estUsd: 300 }]);
  });

  it("emits no budget warning when no budget is configured", () => {
    const est = estimateCost(
      [{ id: "a", aiCalls: 1000, model: "claude-opus-4-7" }],
      { defaults: CFG.defaults, byModel: CFG.byModel },
    );
    expect(est.budgetWarnings).toEqual([]);
  });

  it("returns sorted byModel — highest USD first", () => {
    const est = estimateCost([
      { id: "a", aiCalls: 50, model: "MiniMax-M2.7" }, // $1.00
      { id: "b", aiCalls: 5, model: "claude-opus-4-7" }, // $1.50
    ], CFG);
    expect(est.byModel.map((b) => b.model)).toEqual(["claude-opus-4-7", "MiniMax-M2.7"]);
  });

  it("uses DEFAULT_COST_CONFIG when none is provided", () => {
    const est = estimateCost([{ id: "a", aiCalls: 10 }]);
    expect(est.totalUsd).toBe(0.5);
  });
});

describe("formatEstimateSummary", () => {
  it("renders a multi-line block including totals + budget warning", () => {
    const est = estimateCost(
      [{ id: "a", aiCalls: 1000, model: "claude-opus-4-7" }],
      CFG,
    );
    const out = formatEstimateSummary(est, 50);
    expect(out).toContain("DAG: 50 nodes");
    expect(out).toContain("Estimated cost: $300.00");
    expect(out).toContain("HARD budget exceeded");
  });
});
