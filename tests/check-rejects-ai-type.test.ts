/**
 * Check Type Enforcement — Checks, Not Vibes
 *
 * Verifies that the framework structurally prevents LLM-based verification.
 * A task with type: "ai" in its checks must fail at check execution time with
 * a hard error, NOT just a deprecation warning. This encodes the "Checks,
 * Not Vibes" mental model: checks must be deterministic shell commands, never
 * LLM self-judgment.
 *
 * Currently FAILS because find-gaps.ts line 536 gates a fully functional AI
 * check branch that dispatches LLM calls — the deprecation warning is
 * non-blocking. This test proves the gap exists.
 */
import { describe, it, expect } from "vitest";
import { resolve, join } from "node:path";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

import { runCheck } from "../packages/core/src/task/unit/find-gaps";
import { Unit } from "../packages/core/src/task/unit/unit";
import type { TaskDefinition } from "../packages/core/src/config/task-definition";
import type { UnitConfig } from "../packages/core/src/task/unit/types";

const REPO_ROOT = resolve(__dirname, "..");

/** Minimal TaskDefinition for test Unit construction */
function makeTaskDef(overrides: Partial<TaskDefinition> = {}): TaskDefinition {
  return {
    id: "test-check-rejection",
    title: "Test AI Check Rejection",
    inputs: [],
    outputs: [],
    ...overrides,
  };
}

/** Minimal UnitConfig */
function makeUnitConfig(overrides: Partial<UnitConfig> = {}): UnitConfig {
  return {
    maxIterations: 1,
    outputs: [],
    ...overrides,
  };
}

/**
 * Create a minimal Unit rooted in the real project so that getProjectRoot()
 * resolves correctly.
 */
function makeUnit(taskDefOverrides?: Partial<TaskDefinition>): Unit {
  const taskDef = makeTaskDef(taskDefOverrides);
  const unitConfig = makeUnitConfig();
  return new Unit({
    parent: null,
    path: join(REPO_ROOT, ".converge", "journal", "self-improvement-loop"),
    taskDef,
    config: unitConfig,
  });
}

describe("check type enforcement — Checks, Not Vibes", () => {
  it("rejects type: ai check with a hard error at check execution time", async () => {
    // The CORRECT behavior: any check with type: "ai" must throw immediately
    // at check execution time with an error that references the "Checks, Not
    // Vibes" principle. This structurally prevents LLM-based verification
    // instead of merely warning about it.
    const unit = makeUnit({ id: "test-ai-reject" });

    await expect(
      runCheck(unit, {
        id: "should-be-rejected",
        type: "ai",
        description:
          "This AI check must be rejected — LLM cannot verify itself",
        check: "Is the code correct?",
      }),
    ).rejects.toThrow(/Checks, Not Vibes/);
  });

  it("allows type: cmd checks (shell-based verification is the only valid path)", async () => {
    // Shell-based checks should continue to work normally — they are the
    // deterministic verification mechanism that "Checks, Not Vibes" mandates.
    const unit = makeUnit({ id: "test-cmd-allowed" });

    // Use a temp dir so FactsLogger doesn't pollute real journal
    const tmpDir = join(tmpdir(), "converge-test-checks-" + Date.now());
    mkdirSync(tmpDir, { recursive: true });

    try {
      // Override path to a temp location with a .converge ancestor so
      // getProjectRoot resolves
      const isolatedUnit = new Unit({
        parent: null,
        path: join(tmpDir, ".converge", "journal", "test-playbook"),
        taskDef: makeTaskDef({ id: "test-cmd-allowed-isolated" }),
        config: makeUnitConfig(),
      });

      const result = await runCheck(isolatedUnit, {
        id: "valid-shell-check",
        type: "cmd",
        cmd: "echo ok",
        description: "A valid shell-based check",
      });

      // The check should pass (echo exits 0)
      expect(result.passed).toBe(true);
      expect(result.gaps).toEqual([]);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
