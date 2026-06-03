/**
 * RFC 0033 Phase 1 — Lease-based task assignment.
 *
 * The LeaseManager coordinates task execution across workers using a
 * lease-based model. Workers acquire leases for tasks, heartbeat to
 * keep them alive, and complete/defer/fail to release them.
 *
 * Key guarantees:
 * - A task can only have one active lease at a time
 * - Leases expire if not heartbeated within the lease window
 * - State transitions are validated (can't complete a failed lease)
 * - Idempotent operations (duplicate complete is safe)
 */

import {
  type Lease,
  type LeaseState,
  canTransition,
  isExpired,
  makeLeaseId,
} from "./protocol.js";
import type { ErrorClass } from "../orchestrator/error-class.js";

export interface AcquireOptions {
  taskMd: string;
  env?: Record<string, string>;
  leaseTimeoutMs?: number;
}

export interface DeferredTask {
  taskId: string;
  retryAfter: number;
}

export class LeaseManager {
  private leases = new Map<string, Lease>();
  private taskToLease = new Map<string, string>();
  private deferredTasks = new Map<string, DeferredTask>();
  private readonly defaultLeaseTimeoutMs = 60_000; // 60s default

  /**
   * Acquire a lease for a task. Throws if the task is already leased
   * (unless the previous lease expired or is deferred and past retry time).
   */
  acquire(workerId: string, taskId: string, options: AcquireOptions): Lease {
    const now = Date.now();

    // Check if task is deferred and not yet ready
    const deferred = this.deferredTasks.get(taskId);
    if (deferred && now < deferred.retryAfter) {
      throw new Error(
        `Task ${taskId} is deferred until ${new Date(deferred.retryAfter).toISOString()}`,
      );
    }

    // Check if task already has an active lease
    const existingLeaseId = this.taskToLease.get(taskId);
    if (existingLeaseId) {
      const existingLease = this.leases.get(existingLeaseId);
      if (existingLease) {
        // Allow re-acquisition if expired
        if (!isExpired(existingLease, now)) {
          // Check if it's a terminal state
          if (["completed", "failed"].includes(existingLease.state)) {
            throw new Error(
              `Task ${taskId} already leased and in terminal state: ${existingLease.state}`,
            );
          }
          throw new Error(
            `Task ${taskId} already leased by worker ${existingLease.workerId}`,
          );
        }
      }
    }

    // Clear deferred state if present
    this.deferredTasks.delete(taskId);

    // Create new lease
    const leaseTimeoutMs = options.leaseTimeoutMs ?? this.defaultLeaseTimeoutMs;
    const lease: Lease = {
      leaseId: makeLeaseId(workerId, taskId, now),
      taskId,
      workerId,
      state: "leased",
      leasedAt: now,
      leaseUntil: now + leaseTimeoutMs,
      lastHeartbeatAt: now,
    };

    this.leases.set(lease.leaseId, lease);
    this.taskToLease.set(taskId, lease.leaseId);

    return lease;
  }

  /**
   * Update the heartbeat timestamp and extend the lease expiry.
   */
  heartbeat(leaseId: string, extensionMs?: number): void {
    const lease = this.leases.get(leaseId);
    if (!lease) {
      throw new Error(`Lease ${leaseId} not found`);
    }

    if (lease.state !== "leased") {
      throw new Error(
        `Cannot heartbeat lease ${leaseId} in state ${lease.state}`,
      );
    }

    const now = Date.now();
    lease.lastHeartbeatAt = now;

    // Extend lease by the original timeout duration or custom extension
    const extension = extensionMs ?? this.defaultLeaseTimeoutMs;
    lease.leaseUntil = now + extension;
  }

  /**
   * Mark a lease as completed. Idempotent — duplicate calls are safe.
   */
  complete(
    leaseId: string,
    events: Array<{ ts: number; eventType: string; payload?: unknown }>,
  ): void {
    const lease = this.leases.get(leaseId);
    if (!lease) {
      throw new Error(`Lease ${leaseId} not found`);
    }

    // Idempotent — if already completed, ignore
    if (lease.state === "completed") {
      return;
    }

    this.transitionState(lease, "completed");
  }

  /**
   * Mark a lease as deferred (transient failure, retry later).
   */
  defer(
    leaseId: string,
    errorClass: Extract<ErrorClass, "transient">,
    reason: string,
    retryAfterMs: number,
  ): void {
    const lease = this.leases.get(leaseId);
    if (!lease) {
      throw new Error(`Lease ${leaseId} not found`);
    }

    this.transitionState(lease, "deferred");

    // Track deferred task for retry
    this.deferredTasks.set(lease.taskId, {
      taskId: lease.taskId,
      retryAfter: Date.now() + retryAfterMs,
    });
  }

  /**
   * Mark a lease as failed (permanent failure, no retry).
   */
  fail(
    leaseId: string,
    errorClass: Exclude<ErrorClass, "transient">,
    reason: string,
  ): void {
    const lease = this.leases.get(leaseId);
    if (!lease) {
      throw new Error(`Lease ${leaseId} not found`);
    }

    this.transitionState(lease, "failed");
  }

  /**
   * Scan all leases and expire those past their leaseUntil time.
   * Returns the list of expired leases.
   */
  expireStaleLeases(graceMs = 0): Lease[] {
    const now = Date.now();
    const expired: Lease[] = [];

    for (const lease of this.leases.values()) {
      if (isExpired(lease, now, graceMs)) {
        this.transitionState(lease, "expired");
        expired.push(lease);
      }
    }

    return expired;
  }

  /**
   * Get a lease by its ID.
   */
  getLease(leaseId: string): Lease | undefined {
    return this.leases.get(leaseId);
  }

  /**
   * Get the active lease for a task (if any).
   */
  getTaskLease(taskId: string): Lease | undefined {
    const leaseId = this.taskToLease.get(taskId);
    if (!leaseId) return undefined;
    return this.leases.get(leaseId);
  }

  /**
   * Get all leases.
   */
  getAllLeases(): Lease[] {
    return Array.from(this.leases.values());
  }

  /**
   * Get all deferred tasks.
   */
  getDeferredTasks(): DeferredTask[] {
    return Array.from(this.deferredTasks.values());
  }

  /**
   * Clear all state (for testing).
   */
  clear(): void {
    this.leases.clear();
    this.taskToLease.clear();
    this.deferredTasks.clear();
  }

  private transitionState(lease: Lease, newState: LeaseState): void {
    if (!canTransition(lease.state, newState)) {
      throw new Error(
        `Invalid transition: ${lease.state} -> ${newState} for lease ${lease.leaseId}`,
      );
    }

    lease.state = newState;

    // If transitioning to a terminal state, we can remove the task mapping
    // to allow re-acquisition (except for failed, which should block)
    if (
      newState === "completed" ||
      newState === "expired" ||
      newState === "deferred"
    ) {
      this.taskToLease.delete(lease.taskId);
    }
  }
}
