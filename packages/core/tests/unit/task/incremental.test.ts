/**
 * Unit tests for computeIncrementalContext — RED phase.
 *
 * computeIncrementalContext does not exist yet; tests will fail (RED).
 */
import { describe, it, expect } from "vitest";
import { computeIncrementalContext } from "../../../src/task/incremental.js";

describe("computeIncrementalContext", () => {
  // Case 1: no prior run → not incremental
  it("returns is_incremental: false when no prior run results exist", () => {
    const result = computeIncrementalContext({
      materialization: "incremental",
      priorRunResults: null,
    });

    expect(result).toEqual({
      is_incremental: false,
      this_state: null,
    });
  });

  // Case 2: prior run results exist → incremental
  it("returns is_incremental: true when prior run results exist", () => {
    const priorOutputs = { "output.txt": "cached-content" };

    const result = computeIncrementalContext({
      materialization: "incremental",
      priorRunResults: priorOutputs,
    });

    expect(result).toEqual({
      is_incremental: true,
      this_state: priorOutputs,
    });
  });

  // Case 3: --full-refresh overrides incremental
  it("returns is_incremental: false when fullRefresh is true, even with prior results", () => {
    const priorOutputs = { "output.txt": "cached-content" };

    const result = computeIncrementalContext({
      materialization: "incremental",
      priorRunResults: priorOutputs,
      fullRefresh: true,
    });

    expect(result).toEqual({
      is_incremental: false,
      this_state: null,
    });
  });
});
