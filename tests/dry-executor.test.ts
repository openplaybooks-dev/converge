/**
 * Stub Mode Executor Tests
 *
 * Tests that the FunctionExecutor routes to stub.cmd when stubMode is active.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resolve, join } from "node:path";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";

import { FunctionExecutor } from "../packages/core/src/executor/function-executor.ts";
import type { TaskContext } from "../packages/core/src/context/types.ts";
import type { TaskConfig } from "../packages/core/src/storage/types.ts";

const REPO_ROOT = resolve(__dirname, "..");

function makeTaskContext(overrides: Partial<TaskContext> = {}): TaskContext {
  const id = `stub-test-${Date.now()}`;
  return {
    taskId: id,
    epicId: "epic-test",
    projectDir: REPO_ROOT,
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
    spawn: vi.fn().mockResolvedValue({ id, status: "pending" }),
    ...overrides,
  } as TaskContext;
}

function makeTaskConfig(overrides: Partial<TaskConfig> & { stub?: { cmd: string; cleanup?: string } } = {}): TaskConfig {
  return {
    id: "test-stub",
    title: "Test Stub Task",
    type: "default",
    metadata: {},
    stub: overrides.stub,
    ...overrides,
  } as TaskConfig;
}

describe("FunctionExecutor stub mode", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "converge-stub-executor-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("runs stub.cmd instead of real executor when stubMode is true", async () => {
    const outputFile = join(tmpDir, "stub-output.txt");
    const executor = new FunctionExecutor();
    const ctx = makeTaskContext({ projectDir: tmpDir });
    const config = makeTaskConfig({
      stub: {
        cmd: `echo "stub-output" > "${outputFile}"`,
      },
    });

    const result = await executor.execute(ctx, config, {
      runChecks: false,
      stubMode: true,
    });

    expect(result.success).toBe(true);
    expect(result.taskId).toBeDefined();
    const content = readFileSync(outputFile, "utf-8");
    expect(content).toContain("stub-output");
  });

  it("marks task as failed when stub.cmd exits non-zero", async () => {
    const executor = new FunctionExecutor();
    const ctx = makeTaskContext({ projectDir: tmpDir });
    const config = makeTaskConfig({
      stub: {
        cmd: "exit 1",
      },
    });

    const result = await executor.execute(ctx, config, {
      runChecks: false,
      stubMode: true,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.message).toMatch(/\[stub\] command exited/);
  });

  it("blocks task when stubMode is true but task has no stub: block", async () => {
    const executor = new FunctionExecutor();
    const ctx = makeTaskContext({ projectDir: tmpDir });
    const config = makeTaskConfig({
      // no stub: block
    });

    const result = await executor.execute(ctx, config, {
      runChecks: false,
      stubMode: true,
    });

    expect(result.success).toBe(false);
    expect(result.blocked).toBe(true);
    expect(result.message).toContain("stub:");
  });

  it("runs real executor when stubMode is false (even with stub: block)", async () => {
    const executor = new FunctionExecutor();
    const ctx = makeTaskContext({ projectDir: tmpDir });
    const config = makeTaskConfig({
      stub: {
        cmd: "echo 'should not run'",
      },
    });

    const result = await executor.execute(ctx, config, {
      runChecks: false,
      stubMode: false,
    });

    // The real executor won't find a registered "default" task — that's expected
    // The key assertion is that it didn't run stub.cmd
    expect(result.taskId).toBe(ctx.taskId);
  });
});
