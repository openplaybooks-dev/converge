/**
 * RFC 0021 — `CONVERGE_TASK_DIR` exposure tests.
 *
 * The runtime guarantees every task body sees a stable directory at
 *   $CONVERGE_TASK_DIR  (absolute)
 *   .converge/journal/<pb>/tasks/<task-id>/exec  (workspace-relative)
 * exists before the body runs and persists across attempts.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ensureExecDir, execDirFor } from "../../src/task/spawn/exec-dir.ts";

describe("execDirFor / ensureExecDir", () => {
  let workspace: string;

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), "converge-exec-"));
  });
  afterEach(() => {
    rmSync(workspace, { recursive: true, force: true });
  });

  it("execDirFor returns workspace-relative path under .converge/journal", () => {
    expect(execDirFor("pb1", "task-x")).toBe(
      ".converge/journal/pb1/tasks/task-x/exec",
    );
  });

  it("ensureExecDir creates the directory if missing", async () => {
    const abs = await ensureExecDir(workspace, "pb1", "task-x");
    expect(existsSync(abs)).toBe(true);
    expect(abs).toBe(
      join(workspace, ".converge", "journal", "pb1", "tasks", "task-x", "exec"),
    );
  });

  it("ensureExecDir is idempotent and persists files across calls", async () => {
    const abs1 = await ensureExecDir(workspace, "pb1", "persist");
    writeFileSync(join(abs1, "scratch.txt"), "hello", "utf-8");
    const abs2 = await ensureExecDir(workspace, "pb1", "persist");
    expect(abs1).toBe(abs2);
    expect(readFileSync(join(abs2, "scratch.txt"), "utf-8")).toBe("hello");
  });
});
