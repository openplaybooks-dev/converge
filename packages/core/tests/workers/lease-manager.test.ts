import { describe, it, expect, beforeEach, vi } from "vitest";
import { LeaseManager } from "../../src/workers/lease-manager.js";
import type { Lease } from "../../src/workers/protocol.js";

describe("LeaseManager", () => {
  let manager: LeaseManager;
  let now: number;

  beforeEach(() => {
    now = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    manager = new LeaseManager();
  });

  describe("acquire", () => {
    it("should acquire a lease for a ready task", () => {
      const lease = manager.acquire("worker-1", "task-1", {
        taskMd: "# Task 1",
        env: { FOO: "bar" },
      });

      expect(lease).toMatchObject({
        taskId: "task-1",
        workerId: "worker-1",
        state: "leased",
      });
      expect(lease.leaseId).toMatch(/^worker-1-task-1-\d+$/);
      expect(lease.leasedAt).toBe(now);
      expect(lease.leaseUntil).toBeGreaterThan(now);
      expect(lease.lastHeartbeatAt).toBe(now);
    });

    it("should reject acquiring a lease for an already-leased task", () => {
      manager.acquire("worker-1", "task-1", { taskMd: "# Task 1" });

      expect(() => {
        manager.acquire("worker-2", "task-1", { taskMd: "# Task 1" });
      }).toThrow(/already leased/i);
    });

    it("should allow re-acquiring a task after previous lease expired", () => {
      const lease1 = manager.acquire("worker-1", "task-1", { taskMd: "# Task 1" });

      // Advance time past lease expiry
      vi.advanceTimersByTime(lease1.leaseUntil - now + 1000);

      // Expire the lease
      manager.expireStaleLeases();

      // Should be able to acquire again
      const lease2 = manager.acquire("worker-2", "task-1", { taskMd: "# Task 1" });
      expect(lease2.workerId).toBe("worker-2");
      expect(lease2.state).toBe("leased");
    });
  });

  describe("heartbeat", () => {
    it("should update lastHeartbeatAt on successful heartbeat", () => {
      const lease = manager.acquire("worker-1", "task-1", { taskMd: "# Task 1" });
      const initialHeartbeat = lease.lastHeartbeatAt;

      vi.advanceTimersByTime(5000);
      manager.heartbeat(lease.leaseId);

      const updated = manager.getLease(lease.leaseId);
      expect(updated?.lastHeartbeatAt).toBe(initialHeartbeat + 5000);
      expect(updated?.lastHeartbeatAt).toBeGreaterThan(initialHeartbeat);
    });

    it("should extend lease expiry on heartbeat", () => {
      const lease = manager.acquire("worker-1", "task-1", { taskMd: "# Task 1" });
      const initialExpiry = lease.leaseUntil;

      vi.advanceTimersByTime(5000);
      manager.heartbeat(lease.leaseId);

      const updated = manager.getLease(lease.leaseId);
      expect(updated?.leaseUntil).toBeGreaterThan(initialExpiry);
    });

    it("should throw on heartbeat for non-existent lease", () => {
      expect(() => {
        manager.heartbeat("nonexistent-lease-id");
      }).toThrow(/not found/i);
    });

    it("should throw on heartbeat for completed lease", () => {
      const lease = manager.acquire("worker-1", "task-1", { taskMd: "# Task 1" });
      manager.complete(lease.leaseId, []);

      expect(() => {
        manager.heartbeat(lease.leaseId);
      }).toThrow(/cannot heartbeat/i);
    });
  });

  describe("complete", () => {
    it("should transition lease to completed state", () => {
      const lease = manager.acquire("worker-1", "task-1", { taskMd: "# Task 1" });
      const events = [{ ts: now, eventType: "test", payload: { foo: "bar" } }];

      manager.complete(lease.leaseId, events);

      const updated = manager.getLease(lease.leaseId);
      expect(updated?.state).toBe("completed");
    });

    it("should be idempotent for duplicate complete calls", () => {
      const lease = manager.acquire("worker-1", "task-1", { taskMd: "# Task 1" });
      const events = [{ ts: now, eventType: "test" }];

      manager.complete(lease.leaseId, events);

      // Second complete should not throw
      expect(() => {
        manager.complete(lease.leaseId, events);
      }).not.toThrow();
    });

    it("should throw on complete for non-existent lease", () => {
      expect(() => {
        manager.complete("nonexistent-lease-id", []);
      }).toThrow(/not found/i);
    });
  });

  describe("defer", () => {
    it("should transition lease to deferred state", () => {
      const lease = manager.acquire("worker-1", "task-1", { taskMd: "# Task 1" });

      manager.defer(lease.leaseId, "transient", "Rate limit hit", 5000);

      const updated = manager.getLease(lease.leaseId);
      expect(updated?.state).toBe("deferred");
    });

    it("should allow re-acquiring deferred task after retry delay", () => {
      const lease = manager.acquire("worker-1", "task-1", { taskMd: "# Task 1" });
      manager.defer(lease.leaseId, "transient", "Rate limit", 5000);

      vi.advanceTimersByTime(5001);

      // Should be able to acquire again
      const lease2 = manager.acquire("worker-2", "task-1", { taskMd: "# Task 1" });
      expect(lease2.workerId).toBe("worker-2");
    });
  });

  describe("fail", () => {
    it("should transition lease to failed state", () => {
      const lease = manager.acquire("worker-1", "task-1", { taskMd: "# Task 1" });

      manager.fail(lease.leaseId, "permanent", "Validation error");

      const updated = manager.getLease(lease.leaseId);
      expect(updated?.state).toBe("failed");
    });

    it("should not allow re-acquiring failed task", () => {
      const lease = manager.acquire("worker-1", "task-1", { taskMd: "# Task 1" });
      manager.fail(lease.leaseId, "permanent", "Validation error");

      expect(() => {
        manager.acquire("worker-2", "task-1", { taskMd: "# Task 1" });
      }).toThrow(/already leased/i);
    });
  });

  describe("expireStaleLeases", () => {
    it("should expire leases past their leaseUntil time", () => {
      const lease = manager.acquire("worker-1", "task-1", { taskMd: "# Task 1" });

      // Advance past expiry
      vi.advanceTimersByTime(lease.leaseUntil - now + 1000);

      const expired = manager.expireStaleLeases();

      expect(expired).toHaveLength(1);
      expect(expired[0].leaseId).toBe(lease.leaseId);
      expect(expired[0].state).toBe("expired");
    });

    it("should not expire leases with recent heartbeats", () => {
      const lease = manager.acquire("worker-1", "task-1", { taskMd: "# Task 1" });

      // Advance halfway to expiry
      vi.advanceTimersByTime((lease.leaseUntil - now) / 2);

      // Heartbeat
      manager.heartbeat(lease.leaseId);

      // Advance past original expiry
      vi.advanceTimersByTime((lease.leaseUntil - now) / 2 + 1000);

      const expired = manager.expireStaleLeases();

      expect(expired).toHaveLength(0);
    });

    it("should not expire already-completed leases", () => {
      const lease = manager.acquire("worker-1", "task-1", { taskMd: "# Task 1" });
      manager.complete(lease.leaseId, []);

      vi.advanceTimersByTime(lease.leaseUntil - now + 1000);

      const expired = manager.expireStaleLeases();

      expect(expired).toHaveLength(0);
    });
  });

  describe("getTaskLease", () => {
    it("should return active lease for a task", () => {
      const lease = manager.acquire("worker-1", "task-1", { taskMd: "# Task 1" });

      const found = manager.getTaskLease("task-1");

      expect(found?.leaseId).toBe(lease.leaseId);
    });

    it("should return undefined for task with no lease", () => {
      const found = manager.getTaskLease("nonexistent-task");

      expect(found).toBeUndefined();
    });

    it("should return expired lease if not yet cleaned up", () => {
      const lease = manager.acquire("worker-1", "task-1", { taskMd: "# Task 1" });

      vi.advanceTimersByTime(lease.leaseUntil - now + 1000);

      // Before expireStaleLeases() is called
      const found = manager.getTaskLease("task-1");

      expect(found?.leaseId).toBe(lease.leaseId);
      expect(found?.state).toBe("leased"); // Still shows as leased until sweep
    });
  });

  describe("getAllLeases", () => {
    it("should return all leases", () => {
      manager.acquire("worker-1", "task-1", { taskMd: "# Task 1" });
      manager.acquire("worker-2", "task-2", { taskMd: "# Task 2" });

      const all = manager.getAllLeases();

      expect(all).toHaveLength(2);
      expect(all.map((l) => l.taskId).sort()).toEqual(["task-1", "task-2"]);
    });

    it("should return empty array when no leases exist", () => {
      const all = manager.getAllLeases();

      expect(all).toEqual([]);
    });
  });

  describe("state transitions", () => {
    it("should enforce valid state transitions", () => {
      const lease = manager.acquire("worker-1", "task-1", { taskMd: "# Task 1" });

      // Complete the lease
      manager.complete(lease.leaseId, []);

      // Try to fail an already-completed lease
      expect(() => {
        manager.fail(lease.leaseId, "permanent", "Should not work");
      }).toThrow(/invalid transition/i);
    });
  });
});
