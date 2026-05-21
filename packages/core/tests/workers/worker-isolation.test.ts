import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { WorkerDispatcher } from "../../src/workers/worker-dispatcher.js";
import { LeaseManager } from "../../src/workers/lease-manager.js";
import { ProcessSupervisor } from "../../src/workers/process-supervisor.js";
import { fork, type ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";

vi.mock("node:child_process");

describe("WorkerDispatcher", () => {
  let dispatcher: WorkerDispatcher;
  let leaseManager: LeaseManager;
  let supervisor: ProcessSupervisor;
  let mockProcess: ChildProcess;

  beforeEach(async () => {
    leaseManager = new LeaseManager();
    supervisor = new ProcessSupervisor();

    // Create 2 mock workers
    const mockProcesses: ChildProcess[] = [];
    for (let i = 0; i < 2; i++) {
      const mock = new EventEmitter() as any;
      mock.pid = 12345 + i;
      mock.kill = vi.fn();
      mock.send = vi.fn();
      mock.connected = true;
      mockProcesses.push(mock);
    }

    let spawnCount = 0;
    vi.mocked(fork).mockImplementation(() => {
      const proc = mockProcesses[spawnCount % 2];
      spawnCount++;
      return proc as any;
    });

    dispatcher = new WorkerDispatcher({
      leaseManager,
      supervisor,
      maxWorkers: 2,
      workerModule: "/path/to/worker-process.js",
    });

    // Spawn the workers so they're available
    await dispatcher.ensureWorkers(2);
    mockProcess = mockProcesses[0];
  });

  afterEach(async () => {
    await dispatcher.shutdown();
    await supervisor.shutdown();
  });

  describe("dispatch", () => {
    it("should dispatch tasks to available workers", async () => {
      const result = dispatcher.dispatch("task-1", "# Task 1", { FOO: "bar" });

      expect(result.status).toBe("dispatched");
      expect(result.workerId).toBeDefined();
    });

    it("should not dispatch same task twice", async () => {
      dispatcher.dispatch("task-1", "# Task 1");

      expect(() => {
        dispatcher.dispatch("task-1", "# Task 1");
      }).toThrow(/already leased/i);
    });

    it("should queue tasks when all workers are busy", async () => {
      // Fill both workers
      dispatcher.dispatch("task-1", "# Task 1");
      dispatcher.dispatch("task-2", "# Task 2");

      // Third task should be queued
      const result = dispatcher.dispatch("task-3", "# Task 3");

      expect(result.status).toBe("queued");
    });
  });

  describe("environment isolation", () => {
    it("should not mutate process.env", async () => {
      const originalEnv = { ...process.env };

      dispatcher.dispatch("task-1", "# Task 1", { ISOLATED_VAR: "test" });

      // process.env should not contain the isolated var
      expect(process.env.ISOLATED_VAR).toBeUndefined();
      // Original env should be preserved
      expect(process.env).toEqual(originalEnv);
    });
  });

  describe("heartbeat", () => {
    it("should detect and expire stalled workers", async () => {
      vi.useFakeTimers();

      dispatcher.dispatch("task-1", "# Task 1", {}, { leaseTimeoutMs: 1000 });

      // Advance past lease timeout
      vi.advanceTimersByTime(2000);

      // Run heartbeat check
      const expired = dispatcher.checkHeartbeats();

      expect(expired).toHaveLength(1);
      expect(expired[0].taskId).toBe("task-1");

      vi.useRealTimers();
    });
  });

  describe("completion", () => {
    it("should handle task completion via IPC", async () => {
      const dispatched = dispatcher.dispatch("task-1", "# Task 1");

      // Simulate IPC completion message
      await dispatcher.handleCompletion({
        leaseId: dispatched.lease.leaseId,
        taskId: "task-1",
        duration: 500,
        result: { status: "completed" },
      });

      const lease = leaseManager.getLease(dispatched.lease.leaseId);
      expect(lease?.state).toBe("completed");
    });
  });
});
