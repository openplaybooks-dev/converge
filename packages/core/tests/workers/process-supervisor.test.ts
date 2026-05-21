import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ProcessSupervisor } from "../../src/workers/process-supervisor.js";
import { fork, type ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";

vi.mock("node:child_process");

describe("ProcessSupervisor", () => {
  let supervisor: ProcessSupervisor;
  let mockProcess: ChildProcess;

  beforeEach(() => {
    supervisor = new ProcessSupervisor();

    // Create a mock ChildProcess
    mockProcess = new EventEmitter() as any;
    mockProcess.pid = 12345;
    mockProcess.kill = vi.fn();
    mockProcess.send = vi.fn();
    mockProcess.connected = true;

    vi.mocked(fork).mockReturnValue(mockProcess);
  });

  afterEach(async () => {
    await supervisor.shutdown();
  });

  describe("spawn", () => {
    it("should spawn a new worker process", async () => {
      const workerId = await supervisor.spawn({
        modulePath: "/path/to/worker.js",
        args: ["--foo", "bar"],
        env: { FOO: "bar" },
      });

      expect(workerId).toMatch(/^worker-\d+-12345-\d+$/);
      expect(fork).toHaveBeenCalledWith(
        "/path/to/worker.js",
        ["--foo", "bar"],
        expect.objectContaining({
          env: expect.objectContaining({ FOO: "bar" }),
          silent: false,
        }),
      );
    });

    it("should track spawned processes", async () => {
      const workerId = await supervisor.spawn({
        modulePath: "/path/to/worker.js",
      });

      const info = supervisor.getWorker(workerId);
      expect(info).toMatchObject({
        workerId,
        pid: 12345,
        status: "running",
        modulePath: "/path/to/worker.js",
      });
    });

    it("should attach exit handler to spawned process", async () => {
      const workerId = await supervisor.spawn({
        modulePath: "/path/to/worker.js",
      });

      // Simulate process exit
      mockProcess.emit("exit", 0, null);

      const info = supervisor.getWorker(workerId);
      expect(info?.status).toBe("exited");
      expect(info?.exitCode).toBe(0);
    });

    it("should reject spawn if modulePath is missing", async () => {
      await expect(
        supervisor.spawn({ modulePath: "" }),
      ).rejects.toThrow(/modulePath is required/i);
    });
  });

  describe("kill", () => {
    it("should kill a running worker", async () => {
      const workerId = await supervisor.spawn({
        modulePath: "/path/to/worker.js",
      });

      await supervisor.kill(workerId, "SIGTERM");

      expect(mockProcess.kill).toHaveBeenCalledWith("SIGTERM");
    });

    it("should mark worker as killed", async () => {
      const workerId = await supervisor.spawn({
        modulePath: "/path/to/worker.js",
      });

      await supervisor.kill(workerId, "SIGTERM");

      const info = supervisor.getWorker(workerId);
      expect(info?.status).toBe("killed");
    });

    it("should throw on kill for non-existent worker", async () => {
      await expect(
        supervisor.kill("nonexistent-worker", "SIGTERM"),
      ).rejects.toThrow(/not found/i);
    });

    it("should be idempotent for already-killed workers", async () => {
      const workerId = await supervisor.spawn({
        modulePath: "/path/to/worker.js",
      });

      await supervisor.kill(workerId, "SIGTERM");

      // Second kill should not throw
      await expect(
        supervisor.kill(workerId, "SIGTERM"),
      ).resolves.not.toThrow();
    });
  });

  describe("send", () => {
    it("should send IPC message to worker", async () => {
      const workerId = await supervisor.spawn({
        modulePath: "/path/to/worker.js",
      });

      await supervisor.send(workerId, { type: "test", payload: { foo: "bar" } });

      expect(mockProcess.send).toHaveBeenCalledWith({
        type: "test",
        payload: { foo: "bar" },
      });
    });

    it("should throw on send to non-existent worker", async () => {
      await expect(
        supervisor.send("nonexistent-worker", { type: "test" }),
      ).rejects.toThrow(/not found/i);
    });

    it("should throw on send to disconnected worker", async () => {
      const workerId = await supervisor.spawn({
        modulePath: "/path/to/worker.js",
      });

      mockProcess.connected = false;

      await expect(
        supervisor.send(workerId, { type: "test" }),
      ).rejects.toThrow(/not connected/i);
    });
  });

  describe("getWorker", () => {
    it("should return worker info by ID", async () => {
      const workerId = await supervisor.spawn({
        modulePath: "/path/to/worker.js",
      });

      const info = supervisor.getWorker(workerId);

      expect(info).toMatchObject({
        workerId,
        pid: 12345,
        status: "running",
      });
    });

    it("should return undefined for non-existent worker", () => {
      const info = supervisor.getWorker("nonexistent-worker");

      expect(info).toBeUndefined();
    });
  });

  describe("getAllWorkers", () => {
    it("should return all workers", async () => {
      const worker1 = await supervisor.spawn({
        modulePath: "/path/to/worker1.js",
      });

      mockProcess.pid = 12346;
      const worker2 = await supervisor.spawn({
        modulePath: "/path/to/worker2.js",
      });

      const all = supervisor.getAllWorkers();

      expect(all).toHaveLength(2);
      expect(all.map((w) => w.workerId).sort()).toEqual([worker1, worker2].sort());
    });

    it("should return empty array when no workers exist", () => {
      const all = supervisor.getAllWorkers();

      expect(all).toEqual([]);
    });
  });

  describe("shutdown", () => {
    it("should kill all running workers on shutdown", async () => {
      const worker1 = await supervisor.spawn({
        modulePath: "/path/to/worker1.js",
      });

      const mockProcess2 = new EventEmitter() as any;
      mockProcess2.pid = 12346;
      mockProcess2.kill = vi.fn();
      mockProcess2.send = vi.fn();
      mockProcess2.connected = true;

      vi.mocked(fork).mockReturnValue(mockProcess2);

      const worker2 = await supervisor.spawn({
        modulePath: "/path/to/worker2.js",
      });

      await supervisor.shutdown();

      expect(mockProcess.kill).toHaveBeenCalledWith("SIGTERM");
      expect(mockProcess2.kill).toHaveBeenCalledWith("SIGTERM");
    });

    it("should wait for workers to exit gracefully", async () => {
      vi.useFakeTimers();

      const workerId = await supervisor.spawn({
        modulePath: "/path/to/worker.js",
      });

      // Start shutdown with short grace period
      const shutdownPromise = supervisor.shutdown({ gracePeriodMs: 100 });

      // Simulate process exit before grace period
      mockProcess.emit("exit", 0, null);

      await shutdownPromise;

      vi.useRealTimers();
    });

    it("should force kill workers that don't exit gracefully", async () => {
      vi.useFakeTimers();

      const workerId = await supervisor.spawn({
        modulePath: "/path/to/worker.js",
      });

      // Kill the process but don't emit exit — worker stays "killed"
      await supervisor.kill(workerId, "SIGKILL");

      const shutdownPromise = supervisor.shutdown({ gracePeriodMs: 100 });

      // Advance past grace period
      vi.advanceTimersByTime(150);

      await shutdownPromise;

      // shutdown should have been called — workers cleared
      expect(supervisor.getAllWorkers()).toHaveLength(0);

      vi.useRealTimers();
    });

    it("should be idempotent", async () => {
      await supervisor.spawn({ modulePath: "/path/to/worker.js" });

      await supervisor.shutdown();

      // Second shutdown should not throw
      await expect(supervisor.shutdown()).resolves.not.toThrow();
    });
  });

  describe("cleanupOrphans", () => {
    it("should remove workers whose processes are dead", async () => {
      const workerId = await supervisor.spawn({
        modulePath: "/path/to/worker.js",
      });

      // Simulate process death without exit event
      mockProcess.emit("exit", 1, null);

      const orphans = await supervisor.cleanupOrphans();

      expect(orphans).toHaveLength(1);
      expect(orphans[0].workerId).toBe(workerId);
      // Worker should be removed
      expect(supervisor.getWorker(workerId)).toBeUndefined();
    });

    it("should not remove running workers", async () => {
      const workerId = await supervisor.spawn({ modulePath: "/path/to/worker.js" });

      // Mock process.kill to succeed (process is alive)
      vi.spyOn(process, "kill").mockReturnValue(undefined);

      const orphans = await supervisor.cleanupOrphans();

      // Worker should still exist
      expect(supervisor.getWorker(workerId)).toBeDefined();
      expect(orphans).toHaveLength(0);

      vi.restoreAllMocks();
    });
  });

  describe("memory management", () => {
    it("should not leak memory after workers exit", async () => {
      const workerIds: string[] = [];
      const mockProcesses: ChildProcess[] = [];

      // Spawn 10 workers (enough to test, 100 is overkill)
      for (let i = 0; i < 10; i++) {
        const proc = new EventEmitter() as any;
        proc.pid = 12345 + i;
        proc.kill = vi.fn();
        proc.send = vi.fn();
        proc.connected = true;
        mockProcesses.push(proc);
      }

      for (let i = 0; i < mockProcesses.length; i++) {
        vi.mocked(fork).mockReturnValueOnce(mockProcesses[i]);
        const workerId = await supervisor.spawn({
          modulePath: "/path/to/worker.js",
        });
        workerIds.push(workerId);
      }

      expect(supervisor.getAllWorkers()).toHaveLength(10);

      // Exit all workers
      for (let i = 0; i < workerIds.length; i++) {
        mockProcesses[i].emit("exit", 0, null);
      }

      // Cleanup
      await supervisor.cleanupOrphans();

      // All workers should be removed from memory
      expect(supervisor.getAllWorkers()).toHaveLength(0);
    });
  });
});
