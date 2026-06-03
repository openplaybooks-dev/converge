/**
 * RFC 0022 — dispatcher routing tests.
 *
 * `runExecutor` is the entry point that inspects the unit's declared
 * `mode:` field and schedules the appropriate handler node. These tests
 * assert the dispatch table — what gets scheduled, in what order, for
 * each mode. They don't run the handlers; they only check that the
 * right node landed on the graph.
 */
import { describe, it, expect } from "vitest";
import { runExecutor } from "../../src/navigator/core/actions/execution/run-executor.ts";
import type { Snapshot } from "../../src/navigator/core/types.ts";
import { NavigatorGraph } from "../../src/navigator/core/graph.ts";

function fakeUnit(overrides: Record<string, unknown> = {}): any {
  return {
    id: "t",
    title: "t",
    outputs: [],
    skill: undefined,
    vars: {},
    ...overrides,
  };
}

function fakeSnapshot(unit: any): Snapshot {
  return {
    unit,
    gaps: [],
    iteration: 1,
    previousGaps: [],
    stallCount: 0,
    executionCount: 0,
    projectDir: "/tmp",
    epicId: "default",
  };
}

describe("runExecutor mode dispatch", () => {
  it("schedules run-spawner for mode: spawner", async () => {
    const graph = new NavigatorGraph();
    const unit = fakeUnit({ mode: "spawner", spawn: {} });
    await runExecutor(fakeSnapshot(unit), graph);
    const buffered = graph.getBufferedNodes();
    expect(buffered.some((n) => n.handler === "run-spawner")).toBe(true);
  });

  it("schedules run-converger for mode: converger", async () => {
    const graph = new NavigatorGraph();
    const unit = fakeUnit({
      mode: "converger",
      modeConverge: { max_waves: 3 },
    });
    await runExecutor(fakeSnapshot(unit), graph);
    const buffered = graph.getBufferedNodes();
    expect(buffered.some((n) => n.handler === "run-converger")).toBe(true);
  });

  it("schedules run-gateway for mode: gateway", async () => {
    const graph = new NavigatorGraph();
    const unit = fakeUnit({ mode: "gateway" });
    await runExecutor(fakeSnapshot(unit), graph);
    const buffered = graph.getBufferedNodes();
    expect(buffered.some((n) => n.handler === "run-gateway")).toBe(true);
  });

  it("falls through to legacy paths for mode: task without a skill", async () => {
    const graph = new NavigatorGraph();
    const unit = fakeUnit({ mode: "task" });
    await runExecutor(fakeSnapshot(unit), graph);
    // Task with no skill / no children → no execution node scheduled;
    // repair-loop owns gap fixing. The dispatch returns continue and
    // doesn't add a mode-specific handler.
    const buffered = graph.getBufferedNodes();
    expect(buffered.some((n) => n.handler === "run-spawner")).toBe(false);
    expect(buffered.some((n) => n.handler === "run-converger")).toBe(false);
    expect(buffered.some((n) => n.handler === "run-gateway")).toBe(false);
  });

  it("does NOT route legacy seedFn tasks to the new converger path", async () => {
    // A unit with seedFn but no explicit mode must continue to use the
    // SeedExecutor lifecycle (resolve-seed → run-skill). The dispatcher
    // should respect that until Stage 3 removal.
    const graph = new NavigatorGraph();
    const unit = fakeUnit({ seedFn: () => null, mode: undefined });
    await runExecutor(fakeSnapshot(unit), graph);
    const buffered = graph.getBufferedNodes();
    expect(buffered.some((n) => n.handler === "run-converger")).toBe(false);
  });
});
