/**
 * Repair circuit breaker — prevents the self-repair flow from looping
 * indefinitely on a gap the AI can't actually fix.
 *
 * Behaviour:
 *   - First N-1 failures increment the counter without tripping.
 *   - Nth failure trips the circuit.
 *   - Once tripped, the circuit stays tripped until explicit reset.
 *   - Success at any point clears the counter (gap closed).
 *   - Concurrent increments are serialised by the file lock so the
 *     cap can't be silently exceeded.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  recordRepairAttempt,
  isCircuitTripped,
  listTrippedCircuits,
  resetCircuit,
  DEFAULT_REPAIR_ATTEMPT_CAP,
} from "../../src/navigator/repair/circuit-breaker.ts";

describe("circuit-breaker", () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), "converge-circuit-"));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it("does not trip before reaching the cap", () => {
    for (let i = 1; i < DEFAULT_REPAIR_ATTEMPT_CAP; i++) {
      const r = recordRepairAttempt({
        projectDir,
        playbookName: "test",
        taskId: "t1",
        gapKind: "definition",
        success: false,
      });
      expect(r.attempts).toBe(i);
      expect(r.tripped).toBe(false);
    }
  });

  it("trips on the Nth failure (default cap = 3)", () => {
    let result;
    for (let i = 0; i < 3; i++) {
      result = recordRepairAttempt({
        projectDir,
        playbookName: "test",
        taskId: "t1",
        gapKind: "definition",
        success: false,
      });
    }
    expect(result!.attempts).toBe(3);
    expect(result!.tripped).toBe(true);
    expect(result!.justTripped).toBe(true);
  });

  it("stays tripped on subsequent failures (justTripped only once)", () => {
    for (let i = 0; i < 3; i++) {
      recordRepairAttempt({
        projectDir,
        playbookName: "test",
        taskId: "t1",
        gapKind: "definition",
        success: false,
      });
    }
    const next = recordRepairAttempt({
      projectDir,
      playbookName: "test",
      taskId: "t1",
      gapKind: "definition",
      success: false,
    });
    expect(next.tripped).toBe(true);
    expect(next.justTripped).toBe(false);
  });

  it("clears the counter on success", () => {
    recordRepairAttempt({
      projectDir,
      playbookName: "test",
      taskId: "t1",
      gapKind: "definition",
      success: false,
    });
    recordRepairAttempt({
      projectDir,
      playbookName: "test",
      taskId: "t1",
      gapKind: "definition",
      success: true,
    });
    // After success, the counter is reset.
    const next = recordRepairAttempt({
      projectDir,
      playbookName: "test",
      taskId: "t1",
      gapKind: "definition",
      success: false,
    });
    expect(next.attempts).toBe(1);
    expect(next.tripped).toBe(false);
  });

  it("isCircuitTripped reflects state without modifying it", () => {
    for (let i = 0; i < 3; i++) {
      recordRepairAttempt({
        projectDir,
        playbookName: "test",
        taskId: "t1",
        gapKind: "definition",
        success: false,
      });
    }
    expect(isCircuitTripped(projectDir, "test", "t1", "definition")).toBe(true);
    // Different gap kind on same task — independent counter.
    expect(isCircuitTripped(projectDir, "test", "t1", "output")).toBe(false);
    // Different task — independent counter.
    expect(isCircuitTripped(projectDir, "test", "t2", "definition")).toBe(
      false,
    );
  });

  it("listTrippedCircuits returns all tripped circuits with metadata", () => {
    for (let i = 0; i < 3; i++) {
      recordRepairAttempt({
        projectDir,
        playbookName: "test",
        taskId: "t1",
        gapKind: "definition",
        success: false,
        errorMessage: "still malformed",
      });
    }
    const tripped = listTrippedCircuits(projectDir, "test");
    expect(tripped).toHaveLength(1);
    expect(tripped[0]).toMatchObject({
      taskId: "t1",
      gapKind: "definition",
      attempts: 3,
      lastError: "still malformed",
    });
    expect(tripped[0].trippedAt).toBeDefined();
  });

  it("resetCircuit unlocks a tripped circuit", () => {
    for (let i = 0; i < 3; i++) {
      recordRepairAttempt({
        projectDir,
        playbookName: "test",
        taskId: "t1",
        gapKind: "definition",
        success: false,
      });
    }
    expect(isCircuitTripped(projectDir, "test", "t1", "definition")).toBe(true);

    const reset = resetCircuit(projectDir, "test", "t1", "definition");
    expect(reset).toBe(true);
    expect(isCircuitTripped(projectDir, "test", "t1", "definition")).toBe(
      false,
    );

    // After reset, a new failure starts the counter fresh.
    const next = recordRepairAttempt({
      projectDir,
      playbookName: "test",
      taskId: "t1",
      gapKind: "definition",
      success: false,
    });
    expect(next.attempts).toBe(1);
    expect(next.tripped).toBe(false);
  });

  it("custom cap overrides default", () => {
    const r1 = recordRepairAttempt({
      projectDir,
      playbookName: "test",
      taskId: "t1",
      gapKind: "definition",
      success: false,
      cap: 1,
    });
    expect(r1.tripped).toBe(true);
  });
});
