import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Unit } from "../../src/task/unit/unit.ts";
import { findGaps } from "../../src/task/unit/find-gaps.ts";
import type { TaskDefinition } from "../../src/config/task-definition.ts";
import { GapKind } from "../../src/task/gap/types.ts";

describe("navigator-graph auto-completion", () => {
  let projectDir: string;

  beforeAll(() => {
    projectDir = mkdtempSync(join(tmpdir(), "converge-auto-complete-"));
  });

  afterAll(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  function makeUnit(overrides?: Partial<TaskDefinition>): Unit {
    const taskDef: TaskDefinition = {
      id: "test-task",
      ...overrides,
    };
    return Unit.fromDefinition(
      taskDef,
      null!,
      join(projectDir, ".converge", "playbooks", "test-playbook", "tasks", "test-task"),
    );
  }

  // 1. Outputs present + checks pass → skipped (no gaps)
  it("returns no gaps when outputs exist and checks pass", async () => {
    writeFileSync(join(projectDir, "result.txt"), "done");
    const unit = makeUnit({
      outputs: ["result.txt"],
      checks: [{ id: "verify", cmd: "test -f result.txt" }],
    });

    const gaps = await findGaps(unit);
    const actionable = gaps.filter(
      (g) => g.metadata?.gapKind === GapKind.output ||
        g.metadata?.gapKind === GapKind.checkFailed ||
        g.metadata?.gapKind === GapKind.corrupted,
    );
    expect(actionable).toHaveLength(0);
  });

  // 2. Missing output → runs (output gap found)
  it("returns output gap when output file is missing", async () => {
    const unit = makeUnit({
      outputs: ["missing.txt"],
    });

    const gaps = await findGaps(unit);
    const outputGaps = gaps.filter(
      (g) => g.metadata?.gapKind === GapKind.output,
    );
    expect(outputGaps).toHaveLength(1);
    expect(outputGaps[0]!.description).toContain("missing.txt");
  });

  // 3. Failing check → runs (check gap found)
  it("returns check gap when check fails", async () => {
    writeFileSync(join(projectDir, "output.txt"), "data");
    const unit = makeUnit({
      outputs: ["output.txt"],
      checks: [{ id: "should-fail", cmd: "test -f nonexistent.txt" }],
    });

    const gaps = await findGaps(unit);
    const checkGaps = gaps.filter(
      (g) => g.metadata?.gapKind === GapKind.checkFailed,
    );
    expect(checkGaps).toHaveLength(1);
  });

  // 4. Both outputs AND checks must hold
  it("requires both outputs and checks to pass (AND relationship)", async () => {
    // Case A: output exists but check fails → gap found
    writeFileSync(join(projectDir, "data.txt"), "ok");
    const unitA = makeUnit({
      outputs: ["data.txt"],
      checks: [{ id: "fail", cmd: "exit 1" }],
    });
    const gapsA = await findGaps(unitA);
    expect(gapsA.some((g) => g.metadata?.gapKind === GapKind.checkFailed)).toBe(true);

    // Case B: check passes but output missing → gap found
    const unitB = makeUnit({
      outputs: ["gone.txt"],
      checks: [{ id: "pass", cmd: "true" }],
    });
    const gapsB = await findGaps(unitB);
    expect(gapsB.some((g) => g.metadata?.gapKind === GapKind.output)).toBe(true);

    // Case C: both hold → no gaps
    writeFileSync(join(projectDir, "all-good.txt"), "done");
    const unitC = makeUnit({
      outputs: ["all-good.txt"],
      checks: [{ id: "pass", cmd: "test -f all-good.txt" }],
    });
    const gapsC = await findGaps(unitC);
    const actionable = gapsC.filter(
      (g) =>
        g.metadata?.gapKind === GapKind.output ||
        g.metadata?.gapKind === GapKind.checkFailed ||
        g.metadata?.gapKind === GapKind.corrupted,
    );
    expect(actionable).toHaveLength(0);
  });

  // 5. Corrupted output → runs (corrupted gap found)
  it("returns corrupted gap for invalid output file", async () => {
    writeFileSync(join(projectDir, "empty.png"), "");
    const unit = makeUnit({
      outputs: ["empty.png"],
    });

    const gaps = await findGaps(unit);
    const corruptedGaps = gaps.filter(
      (g) => g.metadata?.gapKind === GapKind.corrupted,
    );
    expect(corruptedGaps).toHaveLength(1);
    expect(corruptedGaps[0]!.description).toContain("empty.png");
  });

  // 6. No outputs, no checks → runs (nothing to auto-complete)
  it("returns no gaps when no outputs or checks are declared", async () => {
    const unit = makeUnit({
      outputs: [],
    });

    const gaps = await findGaps(unit);
    const actionable = gaps.filter(
      (g) =>
        g.metadata?.gapKind === GapKind.output ||
        g.metadata?.gapKind === GapKind.checkFailed ||
        g.metadata?.gapKind === GapKind.corrupted,
    );
    expect(actionable).toHaveLength(0);
  });
});
