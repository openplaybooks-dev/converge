/**
 * RFC 0011 — Dashboard aggregate tests.
 */
import { describe, it, expect } from "vitest";
import {
  clusterFailures,
  percentiles,
  rollupCost,
} from "../../src/dashboard/aggregates.ts";

describe("clusterFailures", () => {
  it("groups by errorClass + normalised reason", () => {
    const c = clusterFailures([
      { taskId: "a", errorClass: "transient", reason: "HTTP 429 rate limited" },
      { taskId: "b", errorClass: "transient", reason: "HTTP 429 rate limited" },
      { taskId: "c", errorClass: "transient", reason: "HTTP 502 bad gateway" },
    ]);
    expect(c).toHaveLength(2);
    expect(c[0].count).toBe(2);
    expect(c[0].taskIds).toEqual(["a", "b"]);
  });

  it("collapses reasons that differ only in numbers", () => {
    const c = clusterFailures([
      {
        taskId: "a",
        errorClass: "transient",
        reason: "idle-timed out after 600000ms",
      },
      {
        taskId: "b",
        errorClass: "transient",
        reason: "idle-timed out after 300000ms",
      },
    ]);
    expect(c).toHaveLength(1);
    expect(c[0].count).toBe(2);
  });

  it("returns sorted by count desc", () => {
    const c = clusterFailures([
      { taskId: "a", errorClass: "deterministic", reason: "less common" },
      { taskId: "b", errorClass: "transient", reason: "common" },
      { taskId: "c", errorClass: "transient", reason: "common" },
      { taskId: "d", errorClass: "transient", reason: "common" },
    ]);
    expect(c[0].count).toBe(3);
    expect(c[1].count).toBe(1);
  });

  it("dedupes taskIds within a cluster", () => {
    const c = clusterFailures([
      { taskId: "a", errorClass: "transient", reason: "x" },
      { taskId: "a", errorClass: "transient", reason: "x" },
    ]);
    expect(c[0].taskIds).toEqual(["a"]);
    expect(c[0].count).toBe(2);
  });
});

describe("percentiles", () => {
  it("computes p50/p95/p99 for a known dataset", () => {
    const samples = Array.from({ length: 100 }, (_, i) => i + 1); // 1..100
    expect(percentiles(samples)).toEqual({ p50: 50, p95: 95, p99: 99 });
  });

  it("returns zeros for an empty list", () => {
    expect(percentiles([])).toEqual({ p50: 0, p95: 0, p99: 0 });
  });

  it("doesn't crash on a single-element list", () => {
    expect(percentiles([42])).toEqual({ p50: 42, p95: 42, p99: 42 });
  });

  it("doesn't mutate the input", () => {
    const input = [3, 1, 2];
    percentiles(input);
    expect(input).toEqual([3, 1, 2]);
  });
});

describe("rollupCost", () => {
  it("sums total + groups by model, sorted by usd desc", () => {
    const r = rollupCost([
      { model: "claude-opus-4-7", usd: 0.3, seconds: 25, calls: 1 },
      { model: "claude-opus-4-7", usd: 0.3, seconds: 25, calls: 1 },
      { model: "MiniMax-M2.7", usd: 0.02, seconds: 45, calls: 1 },
    ]);
    expect(r.totalUsd).toBe(0.62);
    expect(r.totalCalls).toBe(3);
    expect(r.totalSeconds).toBe(95);
    expect(r.byModel[0].model).toBe("claude-opus-4-7");
    expect(r.byModel[0].calls).toBe(2);
    expect(r.byModel[0].usd).toBe(0.6);
  });

  it("returns zeros for empty input", () => {
    expect(rollupCost([])).toEqual({
      totalUsd: 0,
      totalCalls: 0,
      totalSeconds: 0,
      byModel: [],
    });
  });
});
