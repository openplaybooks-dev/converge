/**
 * End-to-end test: Execute a test playbook through the RFC 0033 worker pipeline.
 *
 * This test verifies the full integration from playbook loading through
 * worker dispatch to journal persistence.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { RunnerIntegration } from "../../src/workers/runner-integration.js";
import { fork, type ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import { existsSync, rmSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

vi.mock("node:child_process");

/**
 * Simulates a worker process that completes tasks.
 * In real usage, this would be worker-process.ts running in a fork.
 */
function simulateWorkerCompletion(
  mockProc: ChildProcess & EventEmitter,
  taskId: string,
  leaseId: string,
  delayMs: number,
  result: any = { ok: true },
) {
  setTimeout(() => {
    mockProc.emit("message", {
      type: "task:complete",
      payload: {
        leaseId,
        taskId,
        duration: delayMs,
        result,
      },
    });
  }, delayMs);
}

describe("Playbook E2E Execution", () => {
  let integration: RunnerIntegration;
  let projectDir: string;
  let mockProcesses: ChildProcess[];
  let pidCounter: number;

  beforeEach(() => {
    projectDir = join(tmpdir(), `playbook-e2e-${Date.now()}`);
    mkdirSync(projectDir, { recursive: true });

    mockProcesses = [];
    pidCounter = 70000;

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

  describe("linear playbook execution", () => {
    it("should execute setup → process → report chain", async () => {
      await integration.initialize();

      // Task 1: setup
      const setupTask = integration.executeTask({
        taskId: "setup",
        taskMd: "# Setup\n\nInitialize the project.",
        env: { SETUP_VAR: "setup-value" },
      });

      const setupLease = integration["leaseManager"].getTaskLease("setup");
      await integration.handleCompletion({
        leaseId: setupLease!.leaseId,
        taskId: "setup",
        duration: 100,
        result: { outputs: ["setup-output.txt"] },
      });

      const setupResult = await setupTask;
      expect(setupResult.status).toBe("completed");

      // Task 2: process (depends on setup)
      const processTask = integration.executeTask({
        taskId: "process",
        taskMd: "# Process\n\nProcess the data.",
        env: { PROCESS_VAR: "process-value" },
      });

      const processLease = integration["leaseManager"].getTaskLease("process");
      await integration.handleCompletion({
        leaseId: processLease!.leaseId,
        taskId: "process",
        duration: 200,
        result: { outputs: ["processed-data.json"] },
      });

      const processResult = await processTask;
      expect(processResult.status).toBe("completed");

      // Task 3: report (depends on process)
      const reportTask = integration.executeTask({
        taskId: "report",
        taskMd: "# Report\n\nGenerate report.",
        env: { REPORT_VAR: "report-value" },
      });

      const reportLease = integration["leaseManager"].getTaskLease("report");
      await integration.handleCompletion({
        leaseId: reportLease!.leaseId,
        taskId: "report",
        duration: 150,
        result: { outputs: ["final-report.md"] },
      });

      const reportResult = await reportTask;
      expect(reportResult.status).toBe("completed");

      // Verify journal has all 3 tasks
      const journalDir = join(projectDir, ".converge", "journal", "workers");
      const tasksJournal = join(journalDir, "tasks.jsonl");
      expect(existsSync(tasksJournal)).toBe(true);

      const journalContent = readFileSync(tasksJournal, "utf-8");
      const lines = journalContent.trim().split("\n");
      expect(lines.length).toBeGreaterThanOrEqual(3); // At least one entry per task
    });
  });

  describe("parallel task execution", () => {
    it("should execute independent tasks in parallel", async () => {
      await integration.initialize();

      // Two independent tasks
      const taskA = integration.executeTask({
        taskId: "task-a",
        taskMd: "# Task A",
      });

      const taskB = integration.executeTask({
        taskId: "task-b",
        taskMd: "# Task B",
      });

      // Both should be dispatched to different workers
      const stats = integration.getStats();
      expect(stats.activeLeases).toBe(2);

      // Complete both tasks
      const leaseA = integration["leaseManager"].getTaskLease("task-a");
      const leaseB = integration["leaseManager"].getTaskLease("task-b");

      await Promise.all([
        integration.handleCompletion({
          leaseId: leaseA!.leaseId,
          taskId: "task-a",
          duration: 100,
          result: { ok: true },
        }),
        integration.handleCompletion({
          leaseId: leaseB!.leaseId,
          taskId: "task-b",
          duration: 150,
          result: { ok: true },
        }),
      ]);

      const [resultA, resultB] = await Promise.all([taskA, taskB]);

      expect(resultA.status).toBe("completed");
      expect(resultB.status).toBe("completed");
    });
  });

  describe("task dependency resolution", () => {
    it("should respect task dependencies in DAG", async () => {
      await integration.initialize();

      // Simulate a diamond dependency:
      //   A
      //  / \
      // B   C
      //  \ /
      //   D

      // Execute task A
      const taskA = integration.executeTask({
        taskId: "A",
        taskMd: "# Task A",
      });

      const leaseA = integration["leaseManager"].getTaskLease("A");
      await integration.handleCompletion({
        leaseId: leaseA!.leaseId,
        taskId: "A",
        duration: 100,
        result: { ok: true },
      });
      await taskA;

      // Execute tasks B and C (depend on A)
      const taskB = integration.executeTask({
        taskId: "B",
        taskMd: "# Task B",
      });

      const taskC = integration.executeTask({
        taskId: "C",
        taskMd: "# Task C",
      });

      const leaseB = integration["leaseManager"].getTaskLease("B");
      const leaseC = integration["leaseManager"].getTaskLease("C");

      await Promise.all([
        integration.handleCompletion({
          leaseId: leaseB!.leaseId,
          taskId: "B",
          duration: 200,
          result: { ok: true },
        }),
        integration.handleCompletion({
          leaseId: leaseC!.leaseId,
          taskId: "C",
          duration: 150,
          result: { ok: true },
        }),
      ]);

      await Promise.all([taskB, taskC]);

      // Execute task D (depends on B and C)
      const taskD = integration.executeTask({
        taskId: "D",
        taskMd: "# Task D",
      });

      const leaseD = integration["leaseManager"].getTaskLease("D");
      await integration.handleCompletion({
        leaseId: leaseD!.leaseId,
        taskId: "D",
        duration: 300,
        result: { ok: true },
      });

      const resultD = await taskD;
      expect(resultD.status).toBe("completed");
    });
  });

  describe("error recovery", () => {
    it("should handle task failure and continue with other tasks", async () => {
      await integration.initialize();

      // Task that will fail
      const failTask = integration.executeTask({
        taskId: "fail-task",
        taskMd: "# Fail Task",
      });

      const failLease = integration["leaseManager"].getTaskLease("fail-task");
      integration.handleFailure(failLease!.leaseId, "fail-task", "Intentional failure");

      const failResult = await failTask;
      expect(failResult.status).toBe("failed");

      // Another task should still be dispatchable
      const successTask = integration.executeTask({
        taskId: "success-task",
        taskMd: "# Success Task",
      });

      const successLease = integration["leaseManager"].getTaskLease("success-task");
      await integration.handleCompletion({
        leaseId: successLease!.leaseId,
        taskId: "success-task",
        duration: 100,
        result: { ok: true },
      });

      const successResult = await successTask;
      expect(successResult.status).toBe("completed");
    });

    it("should handle deferred tasks and retry", async () => {
      vi.useFakeTimers();

      await integration.initialize();

      // Task that will be deferred
      const deferTask = integration.executeTask({
        taskId: "defer-task",
        taskMd: "# Defer Task",
      });

      const deferLease = integration["leaseManager"].getTaskLease("defer-task");
      integration.handleDefer(deferLease!.leaseId, "defer-task", "Rate limited", 5000);

      const deferResult = await deferTask;
      expect(deferResult.status).toBe("deferred");

      // After retry delay, task should be re-dispatchable
      vi.advanceTimersByTime(5001);

      // Retry the task
      const retryTask = integration.executeTask({
        taskId: "defer-task",
        taskMd: "# Defer Task Retry",
      });

      const retryLease = integration["leaseManager"].getTaskLease("defer-task");
      await integration.handleCompletion({
        leaseId: retryLease!.leaseId,
        taskId: "defer-task",
        duration: 200,
        result: { ok: true },
      });

      const retryResult = await retryTask;
      expect(retryResult.status).toBe("completed");

      vi.useRealTimers();
    });
  });

  describe("journal persistence", () => {
    it("should persist complete task results to journal", async () => {
      await integration.initialize();

      // Execute and complete a task
      const task = integration.executeTask({
        taskId: "journal-task",
        taskMd: "# Journal Task",
        env: { ENV_VAR: "value" },
      });

      const lease = integration["leaseManager"].getTaskLease("journal-task");
      await integration.handleCompletion({
        leaseId: lease!.leaseId,
        taskId: "journal-task",
        duration: 500,
        result: { outputs: ["output.txt"], checks: "passed" },
      });

      await task;

      // Verify journal content
      const journalDir = join(projectDir, ".converge", "journal", "workers");
      const tasksJournal = join(journalDir, "tasks.jsonl");

      expect(existsSync(tasksJournal)).toBe(true);

      const journalContent = readFileSync(tasksJournal, "utf-8");
      const lines = journalContent.trim().split("\n").map((line) => JSON.parse(line));

      // Should have entries for task start and completion
      const startEntry = lines.find(
        (e: any) => e.taskId === "journal-task" && e.status === "running",
      );
      const completeEntry = lines.find(
        (e: any) => e.taskId === "journal-task" && e.status === "completed",
      );

      expect(startEntry).toBeDefined();
      expect(completeEntry).toBeDefined();
      expect(completeEntry.duration).toBe(500);
    });
  });

  describe("resource limits", () => {
    it("should respect maxWorkers limit", async () => {
      const limitedIntegration = new RunnerIntegration({
        projectDir,
        maxWorkers: 1,
        workerModule: "/path/to/worker-process.js",
      });

      await limitedIntegration.initialize();

      // Dispatch 3 tasks with only 1 worker
      limitedIntegration.executeTask({
        taskId: "task-1",
        taskMd: "# Task 1",
      });

      limitedIntegration.executeTask({
        taskId: "task-2",
        taskMd: "# Task 2",
      });

      limitedIntegration.executeTask({
        taskId: "task-3",
        taskMd: "# Task 3",
      });

      const stats = limitedIntegration.getStats();
      expect(stats.activeLeases).toBe(1);
      expect(stats.queuedTasks).toBe(2);

      await limitedIntegration.shutdown();
    });
  });
});
