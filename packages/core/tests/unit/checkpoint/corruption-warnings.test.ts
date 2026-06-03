/**
 * Checkpoint corruption warnings — silent re-runs → visible diagnostic.
 *
 * Before iter-13, the three state-manager load() methods in
 * checkpoint/state.ts (TaskStateManager, UnitStateManager,
 * TaskUnitStateManager) would silently swallow JSON parse errors and
 * return null, treating corrupt checkpoint files as if they didn't exist.
 * The task then re-ran — costing AI budget on what could be a recurring
 * disk problem the operator had no way to see.
 *
 * iter-13 keeps the behavior (re-run is still the right thing to do)
 * but emits a console.warn so corruption is no longer invisible.
 *
 * What's under test:
 *   - load() returns null for missing files (no warning)
 *   - load() returns null for corrupt files AND warns
 *   - The warning names the file path so operators can find the bad file
 *   - load() returns the parsed checkpoint for valid files (no warning)
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  TaskStateManager,
  UnitStateManager,
  TaskUnitStateManager,
} from "../../../src/checkpoint/state.ts";

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

describe("Checkpoint corruption warnings", () => {
  let workspace: string;
  let spy: ReturnType<typeof spyConsoleWarn>;

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), "converge-ckpt-corrupt-"));
    spy = spyConsoleWarn();
  });

  afterEach(() => {
    spy.restore();
    rmSync(workspace, { recursive: true, force: true });
  });

  describe("TaskStateManager.load (global checkpoint)", () => {
    it("returns null for missing file without warning", async () => {
      const mgr = new TaskStateManager(workspace);
      const result = await mgr.load();
      expect(result).toBeNull();
      expect(spy.calls).toEqual([]);
    });

    it("returns null AND warns for corrupt JSON", async () => {
      const checkpointPath = join(
        workspace,
        ".converge",
        "journal",
        ".checkpoint.json",
      );
      mkdirSync(join(workspace, ".converge", "journal"), { recursive: true });
      writeFileSync(checkpointPath, "{ not valid json", "utf-8");

      const mgr = new TaskStateManager(workspace);
      const result = await mgr.load();
      expect(result).toBeNull();
      expect(spy.calls.length).toBe(1);
      expect(spy.calls[0]).toMatch(/corrupt checkpoint/);
      expect(spy.calls[0]).toContain(checkpointPath);
      expect(spy.calls[0]).toMatch(/re-run/);
    });

    it("returns parsed checkpoint for valid file without warning", async () => {
      const checkpointPath = join(
        workspace,
        ".converge",
        "journal",
        ".checkpoint.json",
      );
      mkdirSync(join(workspace, ".converge", "journal"), { recursive: true });
      writeFileSync(
        checkpointPath,
        JSON.stringify({
          version: 3,
          id: "test",
          timestamp: "2026-05-16T00:00:00Z",
          cursor: { path: [], breadcrumbs: [] },
        }),
        "utf-8",
      );

      const mgr = new TaskStateManager(workspace);
      const result = await mgr.load();
      expect(result).not.toBeNull();
      expect(spy.calls).toEqual([]);
    });
  });

  describe("UnitStateManager.load (per-unit checkpoint)", () => {
    it("returns null AND warns for corrupt JSON", async () => {
      // UnitStateManager(projectDir, level, ...ids) — level="task" maps
      // to journal/<ids[0]>/tasks/<ids[1..]>/checkpoint.json
      const playbook = "default";
      const taskId = "001-task";
      const checkpointPath = join(
        workspace,
        ".converge/journal",
        playbook,
        "tasks",
        taskId,
        "checkpoint.json",
      );
      mkdirSync(join(checkpointPath, ".."), { recursive: true });
      writeFileSync(checkpointPath, "}}truncated", "utf-8");

      const mgr = new UnitStateManager(workspace, "task", playbook, taskId);
      const result = await mgr.load();
      expect(result).toBeNull();
      expect(spy.calls.length).toBe(1);
      expect(spy.calls[0]).toMatch(/checkpoint:unit/);
      expect(spy.calls[0]).toContain(checkpointPath);
    });
  });

  describe("TaskUnitStateManager.load (epic/task checkpoint)", () => {
    it("returns null AND warns for corrupt JSON", async () => {
      const epicId = "default";
      const taskId = "002-impl";
      const checkpointPath = join(
        workspace,
        ".converge/journal",
        epicId,
        "tasks",
        taskId,
        "checkpoint.json",
      );
      mkdirSync(join(checkpointPath, ".."), { recursive: true });
      writeFileSync(checkpointPath, "garbage", "utf-8");

      const mgr = new TaskUnitStateManager(workspace, epicId, taskId);
      const result = await mgr.load();
      expect(result).toBeNull();
      expect(spy.calls.length).toBe(1);
      expect(spy.calls[0]).toMatch(/checkpoint:task/);
      expect(spy.calls[0]).toContain(checkpointPath);
    });

    it("missing file is silent (no warning)", async () => {
      const mgr = new TaskUnitStateManager(workspace, "default", "missing");
      const result = await mgr.load();
      expect(result).toBeNull();
      expect(spy.calls).toEqual([]);
    });
  });
});
