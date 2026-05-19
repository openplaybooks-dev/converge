/**
 * RFC 0007 — Distributed worker protocol tests (part 1).
 */
import { describe, it, expect } from "vitest";
import {
  canTransition,
  isExpired,
  makeLeaseId,
  shouldApplyComplete,
  type Lease,
} from "../../src/workers/protocol.ts";

describe("canTransition (lease state machine)", () => {
  it("allows leased → completed/deferred/failed/expired", () => {
    expect(canTransition("leased", "completed")).toBe(true);
    expect(canTransition("leased", "deferred")).toBe(true);
    expect(canTransition("leased", "failed")).toBe(true);
    expect(canTransition("leased", "expired")).toBe(true);
  });

  it("forbids any transition out of a terminal state", () => {
    for (const from of ["completed", "deferred", "failed", "expired"] as const) {
      for (const to of ["leased", "completed", "deferred", "failed", "expired"] as const) {
        expect(canTransition(from, to)).toBe(false);
      }
    }
  });

  it("forbids self-loops from leased to leased", () => {
    expect(canTransition("leased", "leased")).toBe(false);
  });
});

describe("isExpired", () => {
  const baseLease = {
    state: "leased" as const,
    leaseUntil: 1000,
    lastHeartbeatAt: 800,
  };

  it("returns false before leaseUntil", () => {
    expect(isExpired(baseLease, 999)).toBe(false);
  });

  it("returns true past leaseUntil with no grace", () => {
    expect(isExpired(baseLease, 1500)).toBe(true);
  });

  it("returns false when the worker heartbeat is inside the grace window", () => {
    expect(isExpired({ ...baseLease, lastHeartbeatAt: 1490 }, 1500, 100)).toBe(false);
  });

  it("returns false when state is not 'leased'", () => {
    expect(isExpired({ ...baseLease, state: "completed" as const }, 1_000_000)).toBe(false);
    expect(isExpired({ ...baseLease, state: "expired" as const }, 1_000_000)).toBe(false);
  });
});

describe("makeLeaseId", () => {
  it("is deterministic for a given (worker, task, ts)", () => {
    expect(makeLeaseId("w1", "task-a", 12345)).toBe("w1-task-a-12345");
    expect(makeLeaseId("w1", "task-a", 12345)).toBe(makeLeaseId("w1", "task-a", 12345));
  });

  it("differs across workers for the same task", () => {
    expect(makeLeaseId("w1", "t", 1)).not.toBe(makeLeaseId("w2", "t", 1));
  });
});

describe("shouldApplyComplete (idempotency)", () => {
  function lease(o: Partial<Lease>): Lease {
    return {
      leaseId: "l1",
      taskId: "t",
      workerId: "w",
      state: "leased",
      leasedAt: 0,
      leaseUntil: 1000,
      lastHeartbeatAt: 0,
      ...o,
    };
  }

  it("applies for a live leased lease", () => {
    expect(shouldApplyComplete(lease({}), 500)).toBe(true);
  });

  it("ignores a duplicate complete for an already-completed lease", () => {
    expect(shouldApplyComplete(lease({ state: "completed" }), 500)).toBe(false);
  });

  it("ignores complete for unknown leaseId", () => {
    expect(shouldApplyComplete(undefined, 500)).toBe(false);
  });

  it("rejects complete on an already-expired lease (a different worker has it now)", () => {
    expect(shouldApplyComplete(lease({ leaseUntil: 100 }), 5000)).toBe(false);
  });
});
