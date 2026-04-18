/**
 * Tests for the ScheduleRunner.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { ScheduleRunner } from "../../src/schedule/runner.ts";
import type { ScheduleConfig } from "../../src/schedule/types.ts";

describe("ScheduleRunner", () => {
  let runner: ScheduleRunner;

  afterEach(() => {
    runner?.stopAll();
    vi.restoreAllMocks();
  });

  const makeConfig = (overrides?: Partial<ScheduleConfig>): ScheduleConfig => ({
    intervalMs: 1000,
    intervalStr: "1s",
    runImmediately: false,
    skipIfBusy: true,
    ...overrides,
  });

  it("should register and track a scheduled task", () => {
    runner = new ScheduleRunner();
    const fn = vi.fn(async () => {});

    runner.start("test-task", makeConfig(), fn, () => ({}));

    expect(runner.has("test-task")).toBe(true);
    expect(runner.list()).toContain("test-task");
  });

  it("should throw when starting duplicate task", () => {
    runner = new ScheduleRunner();
    const fn = vi.fn(async () => {});

    runner.start("dup", makeConfig(), fn, () => ({}));

    expect(() => {
      runner.start("dup", makeConfig(), fn, () => ({}));
    }).toThrow("already running");
  });

  it("should stop a specific task", () => {
    runner = new ScheduleRunner();
    const fn = vi.fn(async () => {});

    runner.start("task-a", makeConfig(), fn, () => ({}));
    runner.start("task-b", makeConfig(), fn, () => ({}));

    runner.stop("task-a");

    expect(runner.has("task-a")).toBe(false);
    expect(runner.has("task-b")).toBe(true);
  });

  it("should stop all tasks", () => {
    runner = new ScheduleRunner();
    const fn = vi.fn(async () => {});

    runner.start("a", makeConfig(), fn, () => ({}));
    runner.start("b", makeConfig(), fn, () => ({}));

    runner.stopAll();

    expect(runner.list()).toEqual([]);
  });

  it("should run immediately when runImmediately is true", async () => {
    runner = new ScheduleRunner();
    const fn = vi.fn(async () => {});

    runner.start(
      "imm",
      makeConfig({ runImmediately: true, intervalMs: 100_000 }),
      fn,
      () => ({}),
    );

    // Give microtask a chance to complete
    await new Promise((r) => setTimeout(r, 50));

    expect(fn).toHaveBeenCalledTimes(1);
    runner.stop("imm");
  });

  it("should not run immediately when runImmediately is false", async () => {
    runner = new ScheduleRunner();
    const fn = vi.fn(async () => {});

    runner.start(
      "no-imm",
      makeConfig({ runImmediately: false, intervalMs: 100_000 }),
      fn,
      () => ({}),
    );

    await new Promise((r) => setTimeout(r, 50));

    expect(fn).toHaveBeenCalledTimes(0);
    runner.stop("no-imm");
  });
});
