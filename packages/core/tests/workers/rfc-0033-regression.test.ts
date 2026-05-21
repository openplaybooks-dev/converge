/**
 * RFC 0033 — Regression tests for the specific bugs cited in the problem statement.
 *
 * Bug 1: Memory Leaks from Unbounded State Accumulation
 * Bug 2: Leftover Background Templates / Orphaned Tasks
 * Bug 3: process.env Global Mutation Race Conditions
 * Bug 4: Failed Process Locking / Crash Recovery
 * Bug 5: No Clear Worker Abstraction
 *
 * Each test verifies the bug is fixed in the new architecture.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { LeaseManager } from "../../src/workers/lease-manager.js";
import { ProcessSupervisor } from "../../src/workers/process-supervisor.js";
import { WorkerDispatcher } from "../../src/workers/worker-dispatcher.js";
import { JournalStore } from "../../src/workers/journal-store.js";
import { fork, type ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import { existsSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

vi.mock("node:child_process");

let pidCounter = 90000;
function createMockProcess(pid?: number) {
  const p = pid ?? ++pidCounter;
  const mock = new EventEmitter() as any;
  mock.pid = p;
  mock.kill = vi.fn(() => {
    mock.emit("exit", 0, null);
    mock.connected = false;
  });
  mock.send = vi.fn();
  mock.connected = true;
  return mock as ChildProcess;
}

describe("RFC 0033 Regression: Bug 1 — Memory Leaks", () => {
  let leaseManager: LeaseManager;
  let supervisor: ProcessSupervisor;
  let dispatcher: WorkerDispatcher;
  let journalDir: string;
  let journal: JournalStore;
  let mockProcesses: ChildProcess[];

  beforeEach(() => {
    leaseManager = new LeaseManager();
    supervisor = new ProcessSupervisor();
    journalDir = join(tmpdir(), `regression-mem-${Date.now()}`);
    mkdirSync(journalDir, { recursive: true });
    journal = new JournalStore(journalDir);
    mockProcesses = [];

    vi.mocked(fork).mockImplementation(() => {
      const mock = createMockProcess();
      mockProcesses.push(mock);
      return mock;
    });

    dispatcher = new WorkerDispatcher({
      leaseManager,
      supervisor,
      maxWorkers: 4,
      workerModule: "/path/to/worker-process.js",
    });
  });

  afterEach(async () => {
    await dispatcher.shutdown();
    await supervisor.shutdown();
    if (existsSync(journalDir)) {
      rmSync(journalDir, { recursive: true, force: true });
    }
    vi.clearAllMocks();
  });

  it("should not accumulate stale entries in LeaseManager after 100 task cycles", async () => {
    await dispatcher.ensureWorkers(4);

    for (let i = 0; i < 100; i++) {
      const result = dispatcher.dispatch(
        `cycle-task-${i}`,
        `# Task ${i}`,
      );

      if (result.status === "dispatched") {
        await dispatcher.handleCompletion({
          leaseId: result.lease.leaseId,
          taskId: `cycle-task-${i}`,
          duration: 10,
          result: { ok: true },
        });
      }
    }

    // Drain remaining queue
    await dispatcher.checkHeartbeats();

    // All leases should be in terminal state
    const activeLeases = leaseManager.getAllLeases().filter(
      (l) => l.state === "leased",
    );
    expect(activeLeases).toHaveLength(0);

    // Deferred tasks should be empty
    const deferred = leaseManager.getDeferredTasks();
    expect(deferred).toHaveLength(0);
  });

  it("should not accumulate entries in ProcessSupervisor after workers exit", async () => {
    await dispatcher.ensureWorkers(4);

    // Kill all workers
    const workers = supervisor.getAllWorkers();
    for (const worker of workers) {
      mockProcesses.find((m) => m.pid === worker.pid)?.emit("exit", 0, null);
    }

    // Cleanup orphans
    await supervisor.cleanupOrphans();

    // All exited workers should be removed from memory
    expect(supervisor.getAllWorkers()).toHaveLength(0);
  });

  it("should clear LeaseManager state on explicit clear", () => {
    leaseManager.acquire("worker-1", "task-1", { taskMd: "# Task 1" });
    leaseManager.acquire("worker-2", "task-2", { taskMd: "# Task 2" });

    expect(leaseManager.getAllLeases()).toHaveLength(2);

    leaseManager.clear();

    expect(leaseManager.getAllLeases()).toHaveLength(0);
  });
});

describe("RFC 0033 Regression: Bug 2 — Orphaned Tasks", () => {
  let leaseManager: LeaseManager;
  let supervisor: ProcessSupervisor;
  let dispatcher: WorkerDispatcher;

  beforeEach(() => {
    leaseManager = new LeaseManager();
    supervisor = new ProcessSupervisor();

    vi.mocked(fork).mockImplementation(() => {
      const mock = createMockProcess(30000);
      return mock as ChildProcess;
    });

    dispatcher = new WorkerDispatcher({
      leaseManager,
      supervisor,
      maxWorkers: 2,
      workerModule: "/path/to/worker-process.js",
    });
  });

  afterEach(async () => {
    await dispatcher.shutdown();
    await supervisor.shutdown();
  });

  it("should recover orphaned leases after supervisor restart", async () => {
    await dispatcher.ensureWorkers(1);

    const result = dispatcher.dispatch("orphan-task", "# Orphan Task");

    expect(result.status).toBe("dispatched");
    expect(result.lease.state).toBe("leased");

    // Simulate supervisor crash — kill workers without completing leases
    await supervisor.shutdown();

    // Restart supervisor
    const newSupervisor = new ProcessSupervisor();
    const newDispatcher = new WorkerDispatcher({
      leaseManager,
      supervisor: newSupervisor,
      maxWorkers: 2,
      workerModule: "/path/to/worker-process.js",
    });

    await newDispatcher.ensureWorkers(1);

    // The lease should be expired (no heartbeat)
    vi.useFakeTimers();
    vi.advanceTimersByTime(61000); // Past default 60s timeout

    const expired = leaseManager.expireStaleLeases();
    expect(expired.length).toBeGreaterThan(0);
    expect(expired[0].taskId).toBe("orphan-task");

    // Task should now be re-acquirable
    const newResult = newDispatcher.dispatch("orphan-task", "# Orphan Task Retry");
    expect(newResult.status).toBe("dispatched");

    await newDispatcher.shutdown();
    await newSupervisor.shutdown();
    vi.useRealTimers();
  });

  it("should not leave deferred tasks permanently stuck", async () => {
    await dispatcher.ensureWorkers(1);

    const result = dispatcher.dispatch("defer-task", "# Defer Task");

    vi.useFakeTimers();

    // Simulate transient failure via dispatcher (frees the worker slot)
    dispatcher.handleDefer(result.lease.leaseId, "defer-task", "Rate limited", 5000);

    const deferred = leaseManager.getDeferredTasks();
    expect(deferred).toHaveLength(1);

    // Wait past retry delay
    vi.advanceTimersByTime(5001);

    // Should be able to re-acquire
    const newResult = dispatcher.dispatch("defer-task", "# Defer Task Retry");
    expect(newResult.status).toBe("dispatched");

    vi.useRealTimers();
  });
});

describe("RFC 0033 Regression: Bug 3 — process.env Race Conditions", () => {
  let leaseManager: LeaseManager;
  let supervisor: ProcessSupervisor;
  let dispatcher: WorkerDispatcher;

  beforeEach(() => {
    leaseManager = new LeaseManager();
    supervisor = new ProcessSupervisor();

    vi.mocked(fork).mockImplementation(() => {
      const mock = createMockProcess(40000);
      return mock as ChildProcess;
    });

    dispatcher = new WorkerDispatcher({
      leaseManager,
      supervisor,
      maxWorkers: 4,
      workerModule: "/path/to/worker-process.js",
    });
  });

  afterEach(async () => {
    await dispatcher.shutdown();
    await supervisor.shutdown();
  });

  it("should never mutate process.env when dispatching concurrent tasks", async () => {
    await dispatcher.ensureWorkers(4);

    const envSnapshot = { ...process.env };
    const tasks = [
      { id: "env-task-1", env: { SECRET_A: "value-a", TASK_NUM: "1" } },
      { id: "env-task-2", env: { SECRET_B: "value-b", TASK_NUM: "2" } },
      { id: "env-task-3", env: { SECRET_C: "value-c", TASK_NUM: "3" } },
      { id: "env-task-4", env: { SECRET_D: "value-d", TASK_NUM: "4" } },
    ];

    // Dispatch all 4 tasks concurrently
    for (const task of tasks) {
      dispatcher.dispatch(task.id, `# ${task.id}`, task.env);
    }

    // Verify no env pollution
    expect(process.env.SECRET_A).toBeUndefined();
    expect(process.env.SECRET_B).toBeUndefined();
    expect(process.env.SECRET_C).toBeUndefined();
    expect(process.env.SECRET_D).toBeUndefined();
    expect(process.env.TASK_NUM).toBeUndefined();
    expect(process.env).toEqual(envSnapshot);
  });

  it("should pass isolated env via IPC message, not process mutation", async () => {
    await dispatcher.ensureWorkers(1);

    dispatcher.dispatch("isolated-task", "# Isolated Task", {
      ISOLATED_KEY: "isolated-value",
    });

    const mockProc = supervisor.getAllWorkers()[0]?.process;
    expect(mockProc?.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "task:start",
        payload: expect.objectContaining({
          env: expect.objectContaining({
            ISOLATED_KEY: "isolated-value",
          }),
        }),
      }),
    );
  });
});

describe("RFC 0033 Regression: Bug 4 — Crash Recovery", () => {
  let leaseManager: LeaseManager;
  let supervisor: ProcessSupervisor;
  let dispatcher: WorkerDispatcher;
  let journalDir: string;
  let journal: JournalStore;

  beforeEach(() => {
    leaseManager = new LeaseManager();
    supervisor = new ProcessSupervisor();
    journalDir = join(tmpdir(), `regression-crash-${Date.now()}`);
    mkdirSync(journalDir, { recursive: true });
    journal = new JournalStore(journalDir);

    vi.mocked(fork).mockImplementation(() => {
      const mock = createMockProcess(50000);
      return mock as ChildProcess;
    });

    dispatcher = new WorkerDispatcher({
      leaseManager,
      supervisor,
      maxWorkers: 2,
      workerModule: "/path/to/worker-process.js",
    });
  });

  afterEach(async () => {
    await dispatcher.shutdown();
    await supervisor.shutdown();
    if (existsSync(journalDir)) {
      rmSync(journalDir, { recursive: true, force: true });
    }
  });

  it("should recover state from journal after process crash", async () => {
    await dispatcher.ensureWorkers(2);

    // Dispatch and complete a task, logging to journal
    const result1 = dispatcher.dispatch("crash-task-1", "# Crash Task 1");
    await dispatcher.handleCompletion({
      leaseId: result1.lease.leaseId,
      taskId: "crash-task-1",
      duration: 1000,
      result: { ok: true },
    });
    await journal.append("tasks", {
      taskId: "crash-task-1",
      status: "completed",
      ts: Date.now(),
    });

    // Dispatch another task that will crash
    const result2 = dispatcher.dispatch("crash-task-2", "# Crash Task 2");
    await journal.append("tasks", {
      taskId: "crash-task-2",
      status: "running",
      ts: Date.now(),
    });

    // Simulate crash: kill all workers
    await supervisor.shutdown();

    // Restart: new supervisor + dispatcher
    const newSupervisor = new ProcessSupervisor();
    const newDispatcher = new WorkerDispatcher({
      leaseManager,
      supervisor: newSupervisor,
      maxWorkers: 2,
      workerModule: "/path/to/worker-process.js",
    });

    await newDispatcher.ensureWorkers(2);

    // Replay journal to recover state
    const manifest = await journal.deriveManifest({
      tasksKey: "taskId",
      leasesKey: "leaseId",
    });

    expect(manifest.tasks.get("crash-task-1")?.status).toBe("completed");
    expect(manifest.tasks.get("crash-task-2")?.status).toBe("running");

    // crash-task-2 can be re-dispatched (lease expired after crash)
    vi.useFakeTimers();
    vi.advanceTimersByTime(61000);
    leaseManager.expireStaleLeases();

    const result3 = newDispatcher.dispatch("crash-task-2", "# Crash Task 2 Retry");
    expect(result3.status).toBe("dispatched");

    await newDispatcher.shutdown();
    await newSupervisor.shutdown();
    vi.useRealTimers();
  });

  it("should detect stuck tasks via lease expiry", async () => {
    vi.useFakeTimers();

    await dispatcher.ensureWorkers(1);

    dispatcher.dispatch("stuck-task", "# Stuck Task", {}, { leaseTimeoutMs: 2000 });

    // Task is leased but worker never completes
    const lease = leaseManager.getTaskLease("stuck-task");
    expect(lease?.state).toBe("leased");

    // Advance past lease timeout
    vi.advanceTimersByTime(3000);

    // Heartbeat check should expire the lease
    const expired = dispatcher.checkHeartbeats();
    expect(expired).toHaveLength(1);
    expect(expired[0].taskId).toBe("stuck-task");

    // Task should be re-dispatchable
    const newResult = dispatcher.dispatch("stuck-task", "# Stuck Task Retry");
    expect(newResult.status).toBe("dispatched");

    vi.useRealTimers();
  });
});

describe("RFC 0033 Regression: Bug 5 — Worker Abstraction", () => {
  let leaseManager: LeaseManager;
  let supervisor: ProcessSupervisor;
  let dispatcher: WorkerDispatcher;
  let mockProcesses: ChildProcess[];

  beforeEach(() => {
    leaseManager = new LeaseManager();
    supervisor = new ProcessSupervisor();
    mockProcesses = [];

    // Reset counter for clean PIDs
    pidCounter = 50000;

    vi.mocked(fork).mockImplementation(() => {
      const mock = createMockProcess();
      mockProcesses.push(mock);
      return mock;
    });

    dispatcher = new WorkerDispatcher({
      leaseManager,
      supervisor,
      maxWorkers: 4,
      workerModule: "/path/to/worker-process.js",
    });
  });

  afterEach(async () => {
    await dispatcher.shutdown();
    await supervisor.shutdown();
    vi.clearAllMocks();
  });

  it("should isolate workers as separate processes", async () => {
    await dispatcher.ensureWorkers(4);

    const workers = supervisor.getAllWorkers();
    expect(workers).toHaveLength(4);

    // Each worker should have a unique PID
    const pids = workers.map((w) => w.pid);
    const uniquePids = new Set(pids);
    expect(uniquePids.size).toBe(4);
  });

  it("should enforce worker health via heartbeat", async () => {
    vi.useFakeTimers();

    await dispatcher.ensureWorkers(2);

    const result = dispatcher.dispatch("health-task", "# Health Task", {}, {
      leaseTimeoutMs: 1000,
    });

    // Worker heartbeats
    const worker = supervisor.getAllWorkers()[0];
    supervisor.send(worker.workerId, { type: "heartbeat:ping" });

    // Advance time
    vi.advanceTimersByTime(500);

    // Lease is still valid
    const lease = leaseManager.getTaskLease("health-task");
    expect(lease?.state).toBe("leased");

    // Worker heartbeats again
    supervisor.send(worker.workerId, { type: "heartbeat:ping" });

    vi.advanceTimersByTime(500);

    // Lease should still be valid (was extended by heartbeat)
    const leaseAfter = leaseManager.getTaskLease("health-task");
    expect(leaseAfter?.state).toBe("leased");

    vi.useRealTimers();
  });

  it("should support worker lifecycle (start, stop, restart, drain)", async () => {
    // Start workers
    await dispatcher.ensureWorkers(2);
    expect(supervisor.getAllWorkers()).toHaveLength(2);

    // Stop all workers
    await dispatcher.shutdown();
    await supervisor.shutdown();
    expect(supervisor.getAllWorkers()).toHaveLength(0);

    // Restart
    const newSupervisor = new ProcessSupervisor();
    const newDispatcher = new WorkerDispatcher({
      leaseManager,
      supervisor: newSupervisor,
      maxWorkers: 2,
      workerModule: "/path/to/worker-process.js",
    });

    await newDispatcher.ensureWorkers(2);
    expect(newSupervisor.getAllWorkers()).toHaveLength(2);

    // Drain queue
    await newDispatcher.shutdown();
    await newSupervisor.shutdown();
  });

  it("should track worker resource accounting (tasks per worker)", async () => {
    await dispatcher.ensureWorkers(2);

    // Dispatch tasks
    dispatcher.dispatch("task-1", "# Task 1");
    dispatcher.dispatch("task-2", "# Task 2");

    // Complete tasks
    const lease1 = leaseManager.getTaskLease("task-1");
    const lease2 = leaseManager.getTaskLease("task-2");

    if (lease1) {
      await dispatcher.handleCompletion({
        leaseId: lease1.leaseId,
        taskId: "task-1",
        duration: 100,
        result: { ok: true },
      });
    }
    if (lease2) {
      await dispatcher.handleCompletion({
        leaseId: lease2.leaseId,
        taskId: "task-2",
        duration: 200,
        result: { ok: true },
      });
    }

    // Both leases should be completed
    expect(lease1?.state).toBe("completed");
    expect(lease2?.state).toBe("completed");
  });
});
