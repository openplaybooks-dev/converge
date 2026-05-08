/**
 * Post-migration verification tests.
 *
 * The old tree-based checkpoint cursor + V1/V2 migration system has been
 * replaced by fingerprint-based caching in RunStateManager (single-target
 * model). These tests confirm the old imports are no longer available.
 */

import { describe, it, expect } from "vitest";
import { RunStateManager } from "../../../src/manifest/run-state-manager.js";

describe("Single-target model — checkpoint migration removed", () => {
  it("RunStateManager.loadPrevRunState exists (replaces old resume)", () => {
    expect(typeof RunStateManager.loadPriorRunState).toBe("function");
  });

  it("migration module no longer exists", () => {
    expect(() => {
      require("../../../src/checkpoint/migration.ts");
    }).toThrow();
  });

  it("resumability module no longer exists", () => {
    expect(() => {
      require("../../../src/checkpoint/resumability.ts");
    }).toThrow();
  });
});
