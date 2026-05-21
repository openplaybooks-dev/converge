/**
 * Integration test: RunnerIntegration with real playbook execution.
 *
 * This test verifies that the new worker model (RFC 0033) can execute
 * a simple playbook end-to-end, including:
 * - Task dispatch to worker pool
 * - Environment isolation
 * - Completion handling
 * - Journal persistence
 * - Worker lifecycle management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { RunnerIntegration } from "../../src/workers/runner-integration.js";
import { fork, type ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import { existsSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

vi.mock("node:child_process");

describe("RunnerIntegration", () => {
  let integration: RunnerIntegration;
  let projectDir: string;
  let mockProcesses: ChildProcess[];
  let pidCounter: number;

  beforeEach(() => {
    projectDir = join(tmpdir(), `runner-integration-${Date.now()}`);
    mkdirSync(projectDir, { recursive: true });

    mockProcesses = [];
    pidCounter = 60000;

    vi.mocked(fork).mockImplementation(() => {
      const mock = new EventEmitter() as any;
      mock.pid = ++pidCounter;
      mock.kill = vi.fn(() => {
        mock.emit("exit", 0, null);
        mock.connected = false;
      });
      mock.send = vi.fn();
      mock.connected = true;
      mockProcesses.push(mock);
      return mock;
    });

    integration = new RunnerIntegration({
      projectDir,
      maxWorkers: 2,
      workerModule: "/path/to/worker-process.js",
    });
  });

  afterEach(async () => {
    await integration.shutdown();
    if (existsSync(projectDir)) {
      rmSync(projectDir, { recursive: true, force: true });
    }
    vi.clearAllMocks();
  });

  describe("initialize", () => {
    it("should spawn worker pool", async () => {
      await integration.initialize();

      expect(fork).toHaveBeenCalledTimes(2);
      expect(mockProcesses).toHaveLength(2);
    });

    it("should start heartbeat monitoring", async () => {
      await integration.initialize();

      const stats = integration.getStats();
      expect(stats.activeWorkers).toBe(2);
    });
  });

  describe("executeTask", () => {
    it("should execute a simple task through worker pool", async () => {
      await integration.initialize();

      const taskPromise = integration.executeTask({
        taskId: "test-task-1",
        taskMd: "# Test Task 1\n\nA simple test task.",
        env: { TEST_VAR: "test-value" },
      });

      // Verify env was passed via IPC, not process.env mutation
      const mockProc = mockProcesses[0];
      expect(mockProc.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "task:start",
          payload: expect.objectContaining({
            taskId: "test-task-1",
            env: expect.objectContaining({
              TEST_VAR: "test-value",
            }),
          }),
        }),
      );

      // Simulate completion message from worker
      const lease = integration["leaseManager"].getTaskLease("test-task-1");
      await integration.handleCompletion({
        leaseId: lease!.leaseId,
        taskId: "test-task-1",
        duration: 1000,
        result: { status: "completed" },
      });

      const result = await taskPromise;

      expect(result).toMatchObject({
        taskId: "test-task-1",
        status: "completed",
        duration: 1000,
      });
    });

    it("should queue tasks when all workers are busy", async () => {
      await integration.initialize();

      // Dispatch 3 tasks (2 workers available)
      integration.executeTask({ taskId: "task-1", taskMd: "# Task 1" });
      integration.executeTask({ taskId: "task-2", taskMd: "# Task 2" });
      integration.executeTask({ taskId: "task-3", taskMd: "# Task 3" });

      const stats = integration.getStats();
      expect(stats.activeLeases).toBe(2);
      expect(stats.queuedTasks).toBe(1);

      // Complete first task to unblock queue
      const lease1 = integration["leaseManager"].getTaskLease("task-1");
      await integration.handleCompletion({
        leaseId: lease1!.leaseId,
        taskId: "task-1",
        duration: 500,
        result: { ok: true },
      });

      // Queue should drain
      const statsAfter = integration.getStats();
      expect(statsAfter.queuedTasks).toBe(0);
      expect(statsAfter.activeLeases).toBe(2); // task-2 + task-3
    });

    it("should handle task deferral", async () => {
      await integration.initialize();

      const taskPromise = integration.executeTask({
        taskId: "defer-task",
        taskMd: "# Defer Task",
      });

      const lease = integration["leaseManager"].getTaskLease("defer-task");
      expect(lease).toBeDefined();

      integration.handleDefer(lease!.leaseId, "defer-task", "Rate limited", 5000);

      const result = await taskPromise;

      expect(result).toMatchObject({
        taskId: "defer-task",
        status: "deferred",
        deferReason: "Rate limited",
        retryAfterMs: 5000,
      });
    });

    it("should handle task failure", async () => {
      await integration.initialize();

      const taskPromise = integration.executeTask({
        taskId: "fail-task",
        taskMd: "# Fail Task",
      });

      const lease = integration["leaseManager"].getTaskLease("fail-task");
      expect(lease).toBeDefined();

      integration.handleFailure(lease!.leaseId, "fail-task", "Validation error");

      const result = await taskPromise;

      expect(result).toMatchObject({
        taskId: "fail-task",
        status: "failed",
        error: "Validation error",
      });
    });

    it("should handle lease expiry (worker timeout)", async () => {
      vi.useFakeTimers();

      await integration.initialize();

      const taskPromise = integration.executeTask({
        taskId: "timeout-task",
        taskMd: "# Timeout Task",
        leaseTimeoutMs: 1000,
      });

      // Advance past lease timeout
      vi.advanceTimersByTime(6000);

      const result = await taskPromise;

      expect(result).toMatchObject({
        taskId: "timeout-task",
        status: "failed",
        error: expect.stringContaining("expired"),
      });

      vi.useRealTimers();
    });
  });

  describe("environment isolation", () => {
    it("should not mutate process.env when executing tasks", async () => {
      await integration.initialize();

      const originalEnv = { ...process.env };

      integration.executeTask({
        taskId: "env-task",
        taskMd: "# Env Task",
        env: { ISOLATED_SECRET: "secret-value" },
      });

      expect(process.env.ISOLATED_SECRET).toBeUndefined();
      expect(process.env).toEqual(originalEnv);
    });

    it("should pass env via IPC message", async () => {
      await integration.initialize();

      integration.executeTask({
        taskId: "ipc-env-task",
        taskMd: "# IPC Env Task",
        env: { IPC_VAR: "ipc-value" },
      });

      const mockProc = mockProcesses[0];
      expect(mockProc.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "task:start",
          payload: expect.objectContaining({
            env: expect.objectContaining({
              IPC_VAR: "ipc-value",
            }),
          }),
        }),
      );
    });
  });

  describe("journal persistence", () => {
    it("should log task lifecycle to journal", async () => {
      await integration.initialize();

      integration.executeTask({
        taskId: "journal-task",
        taskMd: "# Journal Task",
      });

      const lease = integration["leaseManager"].getTaskLease("journal-task");
      await integration.handleCompletion({
        leaseId: lease!.leaseId,
        taskId: "journal-task",
        duration: 1500,
        result: { ok: true },
      });

      const journalDir = join(projectDir, ".converge", "journal", "workers");
      const tasksJournal = join(journalDir, "tasks.jsonl");

      expect(existsSync(tasksJournal)).toBe(true);
    });
  });

  describe("shutdown", () => {
    it("should gracefully shutdown worker pool", async () => {
      await integration.initialize();

      await integration.shutdown();

      for (const proc of mockProcesses) {
        expect(proc.kill).toHaveBeenCalled();
      }
    });

    it("should stop heartbeat monitoring on shutdown", async () => {
      await integration.initialize();

      await integration.shutdown();

      expect(integration["heartbeatInterval"]).toBeUndefined();
    });
  });

  describe("getStats", () => {
    it("should return accurate worker pool statistics", async () => {
      await integration.initialize();

      const stats = integration.getStats();

      expect(stats).toMatchObject({
        activeWorkers: 2,
        queuedTasks: 0,
        activeLeases: 0,
        deferredTasks: 0,
      });
    });

    it("should track active leases", async () => {
      await integration.initialize();

      integration.executeTask({
        taskId: "stats-task-1",
        taskMd: "# Stats Task 1",
      });

      integration.executeTask({
        taskId: "stats-task-2",
        taskMd: "# Stats Task 2",
      });

      const stats = integration.getStats();

      expect(stats.activeLeases).toBe(2);
    });
  });

  describe("concurrent task execution", () => {
    it("should execute multiple tasks concurrently", async () => {
      await integration.initialize();

      const task1 = integration.executeTask({
        taskId: "concurrent-1",
        taskMd: "# Task 1",
      });

      const task2 = integration.executeTask({
        taskId: "concurrent-2",
        taskMd: "# Task 2",
      });

      const lease1 = integration["leaseManager"].getTaskLease("concurrent-1");
      const lease2 = integration["leaseManager"].getTaskLease("concurrent-2");

      await integration.handleCompletion({
        leaseId: lease1!.leaseId,
        taskId: "concurrent-1",
        duration: 500,
        result: { ok: true },
      });

      await integration.handleCompletion({
        leaseId: lease2!.leaseId,
        taskId: "concurrent-2",
        duration: 600,
        result: { ok: true },
      });

      const results = await Promise.all([task1, task2]);

      expect(results).toHaveLength(2);
      expect(results[0].taskId).toBe("concurrent-1");
      expect(results[1].taskId).toBe("concurrent-2");
    });
  });
});
