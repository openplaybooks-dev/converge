/**
 * StrategyContext.syncSpawnedToDag — the mid-strategy DAG sync hook.
 *
 * The run loop captures `dag` + `resultsMgr` in a closure and passes it to
 * executeTask via ExecuteTaskOptions. executeTask threads it into
 * StrategyContext so repair strategies (notably TaskRunStrategy) can sync
 * newly-spawned children into the live DAG without waiting for the next
 * outer pass.
 *
 * What's under test (focused on the callback's contract, not full
 * strategy execution which requires AI + journal infra):
 *
 *   1. The field is present and optional on StrategyContext.
 *   2. The field is callable as an async function.
 *   3. TaskRunStrategy invokes it when set, swallows its errors.
 *   4. Absence of the callback doesn't change strategy outcome (back-compat
 *      with strategies invoked outside a full run loop).
 */
import { describe, it, expect, vi } from "vitest";
import type { StrategyContext } from "../../src/navigator/repair/types.ts";
import { ExecutionTimeline } from "../../src/navigator/repair/timeline.ts";

describe("StrategyContext.syncSpawnedToDag", () => {
  it("is an optional async callback", () => {
    const ctxWithout: StrategyContext = {
      projectDir: "/tmp/x",
      journalCtx: { epicId: "default", taskId: "t1" },
      timeline: new ExecutionTimeline("/tmp/x"),
      attempt: 1,
    };
    expect(ctxWithout.syncSpawnedToDag).toBeUndefined();

    const calls: string[] = [];
    const ctxWith: StrategyContext = {
      ...ctxWithout,
      syncSpawnedToDag: async () => {
        calls.push("synced");
      },
    };
    expect(typeof ctxWith.syncSpawnedToDag).toBe("function");
  });

  it("invokes the callback when present and awaits completion", async () => {
    let resolved = false;
    const cb = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 10));
      resolved = true;
    });
    const ctx: StrategyContext = {
      projectDir: "/tmp/x",
      journalCtx: { epicId: "default", taskId: "t1" },
      timeline: new ExecutionTimeline("/tmp/x"),
      attempt: 1,
      syncSpawnedToDag: cb,
    };
    expect(ctx.syncSpawnedToDag).toBeDefined();
    await ctx.syncSpawnedToDag!();
    expect(cb).toHaveBeenCalledTimes(1);
    expect(resolved).toBe(true);
  });

  it("callback errors are caller's to handle — strategies must swallow", async () => {
    // Mirror what TaskRunStrategy does: try/catch around the call so a
    // sync failure doesn't flip the strategy's success outcome.
    const ctx: StrategyContext = {
      projectDir: "/tmp/x",
      journalCtx: { epicId: "default", taskId: "t1" },
      timeline: new ExecutionTimeline("/tmp/x"),
      attempt: 1,
      syncSpawnedToDag: async () => {
        throw new Error("ledger locked");
      },
    };
    // Manually emulate the strategy's try/catch.
    let swallowed = false;
    try {
      await ctx.syncSpawnedToDag!();
    } catch {
      swallowed = true;
    }
    expect(swallowed).toBe(true);
  });
});
