/**
 * Queue-state corruption warnings (iter-15).
 *
 * Before iter-15:
 *   - computeQueueContext silently returned `state: null, hasPending: false`
 *     on a corrupt state.json, indistinguishable from "no state yet".
 *   - checkQueueConvergence silently returned `true` (converged → stop)
 *     on a corrupt state.json, halting the incremental loop with no
 *     diagnostic.
 *
 * Both behaviors are preserved (correctness is fine — defaulting to
 * "empty/done" is the right recovery action) but now emit a structured
 * console.warn so operators see the downgrade.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  computeQueueContext,
  checkQueueConvergence,
} from "../../../src/task/incremental.ts";

function spyConsoleWarn() {
  const original = console.warn;
  const calls: string[] = [];
  console.warn = (...args: unknown[]) => {
    calls.push(args.map(String).join(" "));
  };
  return {
    calls,
    restore: () => {
      console.warn = original;
    },
  };
}

describe("queue-state corruption (iter-15)", () => {
  let workspace: string;
  let spy: ReturnType<typeof spyConsoleWarn>;

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), "converge-qstate-corrupt-"));
    spy = spyConsoleWarn();
  });

  afterEach(() => {
    spy.restore();
    rmSync(workspace, { recursive: true, force: true });
  });

  describe("computeQueueContext", () => {
    it("missing state file is silent (no warning)", () => {
      const result = computeQueueContext(
        "queue",
        { stateFile: "missing-state.json", maxBatches: 50 },
        workspace,
      );
      expect(result.isQueue).toBe(true);
      expect(result.state).toBeNull();
      expect(result.hasPending).toBe(false);
      expect(spy.calls).toEqual([]);
    });

    it("corrupt state file degrades to empty AND warns with path + reason", () => {
      const stateFile = "queue-state.json";
      writeFileSync(join(workspace, stateFile), "}{ not json", "utf-8");

      const result = computeQueueContext(
        "queue",
        { stateFile, maxBatches: 50 },
        workspace,
      );
      expect(result.isQueue).toBe(true);
      expect(result.state).toBeNull();
      expect(result.hasPending).toBe(false);
      expect(spy.calls.length).toBe(1);
      expect(spy.calls[0]).toMatch(/\[queue-state\]/);
      expect(spy.calls[0]).toContain(stateFile);
      expect(spy.calls[0]).toMatch(/Treating as empty/);
    });

    it("valid JSON returns parsed state without warning", () => {
      const stateFile = "queue-state.json";
      writeFileSync(
        join(workspace, stateFile),
        JSON.stringify({
          pending: ["item-a", "item-b"],
          stats: { epochs_completed: 2 },
        }),
        "utf-8",
      );

      const result = computeQueueContext(
        "queue",
        { stateFile, maxBatches: 50 },
        workspace,
      );
      expect(result.isQueue).toBe(true);
      expect(result.hasPending).toBe(true);
      expect(result.batchNumber).toBe(2);
      expect(spy.calls).toEqual([]);
    });
  });

  describe("checkQueueConvergence", () => {
    it("missing state file → converged, no warning", () => {
      const result = checkQueueConvergence(
        null,
        join(workspace, "absent.json"),
      );
      expect(result).toBe(true);
      expect(spy.calls).toEqual([]);
    });

    it("valid state with pending items → not converged, no warning", () => {
      const path = join(workspace, "state.json");
      writeFileSync(
        path,
        JSON.stringify({ pending: ["a", "b", "c"] }),
        "utf-8",
      );
      const result = checkQueueConvergence(null, path);
      expect(result).toBe(false);
      expect(spy.calls).toEqual([]);
    });

    it("valid state with no pending → converged, no warning", () => {
      const path = join(workspace, "state.json");
      writeFileSync(path, JSON.stringify({ pending: [] }), "utf-8");
      const result = checkQueueConvergence(null, path);
      expect(result).toBe(true);
      expect(spy.calls).toEqual([]);
    });

    it("corrupt state defaults to converged AND warns about the loop halt", () => {
      const path = join(workspace, "state.json");
      writeFileSync(path, "}{garbage", "utf-8");

      const result = checkQueueConvergence(null, path);
      // Preserve the behavior: convergence defaults to true when state
      // is unreadable. The warning is what's new.
      expect(result).toBe(true);
      expect(spy.calls.length).toBe(1);
      expect(spy.calls[0]).toContain(path);
      expect(spy.calls[0]).toMatch(/loop will stop|defaulting to 'done'/);
      expect(spy.calls[0]).toMatch(/Repair or remove/);
    });
  });
});
