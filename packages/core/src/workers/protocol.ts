/**
 * RFC 0007 — Distributed worker boundary (part 1: protocol shapes).
 *
 * Ships the wire-format and lease-state machine pieces only. Part 2
 * lands the HTTP server + `converge worker --connect` client; part 3
 * adds in-process parallelism by bumping the local-worker count.
 *
 * Why protocol-first: locking the message shapes early lets the
 * client/server halves be developed in parallel and gives RFC 0011
 * (dashboard) a stable schema to subscribe against.
 */

import type { ErrorClass } from "../orchestrator/error-class.ts";

/* ------------------------------------------------------------------ */
/*  Wire-format messages                                              */
/* ------------------------------------------------------------------ */

export interface LeaseRequest {
  workerId: string;
  /** Optional capabilities filter — workers only match tasks tagged with one of these. */
  capabilities?: string[];
}

export interface LeaseResponse {
  leaseId: string;
  taskId: string;
  /** Pre-rendered TASK.md body so the worker doesn't need filesystem access to the coordinator. */
  taskMd: string;
  /** ISO-8601 expiry timestamp; worker must heartbeat or complete before this. */
  leaseUntil: string;
  /** Environment vars the coordinator wants the worker to set. */
  env?: Record<string, string>;
}

export interface HeartbeatRequest {
  leaseId: string;
  /** Optional progress metadata for dashboards (RFC 0011). */
  progress?: Record<string, unknown>;
}

export interface CompleteRequest {
  leaseId: string;
  /** Events emitted during execution, in order, ready for journal append. */
  events: Array<{ ts: number; eventType: string; payload?: unknown }>;
  /** Optional cost telemetry (RFC 0018). */
  cost?: { usd: number; seconds: number; calls: number };
}

export interface DeferRequest {
  leaseId: string;
  errorClass: Extract<ErrorClass, "transient">;
  reason: string;
  retryAfterMs: number;
}

export interface FailRequest {
  leaseId: string;
  errorClass: Exclude<ErrorClass, "transient">;
  reason: string;
  sourcePath?: string;
  sourceLine?: number;
}

/* ------------------------------------------------------------------ */
/*  Lease state machine                                               */
/* ------------------------------------------------------------------ */

export type LeaseState = "leased" | "completed" | "deferred" | "failed" | "expired";

export interface Lease {
  leaseId: string;
  taskId: string;
  workerId: string;
  state: LeaseState;
  leasedAt: number;
  leaseUntil: number;
  lastHeartbeatAt: number;
}

/**
 * Legal lease state transitions. The coordinator enforces this so a
 * misbehaving worker can't transition leased → completed twice or
 * resurrect a failed lease.
 */
const TRANSITIONS: Record<LeaseState, LeaseState[]> = {
  leased: ["completed", "deferred", "failed", "expired"],
  completed: [],
  deferred: [],
  failed: [],
  expired: [],
};

export function canTransition(from: LeaseState, to: LeaseState): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Decide whether a lease should be considered expired at `now`. A lease
 * is expired when:
 *   - state is "leased" AND
 *   - `now > leaseUntil` AND
 *   - last heartbeat was more than `graceMs` ms ago (default 0 — no grace).
 *
 * The coordinator runs this on a tick and reclaims expired leases so
 * another worker can pick the task up.
 */
export function isExpired(
  lease: Pick<Lease, "state" | "leaseUntil" | "lastHeartbeatAt">,
  now: number,
  graceMs = 0,
): boolean {
  if (lease.state !== "leased") return false;
  if (now <= lease.leaseUntil) return false;
  if (now - lease.lastHeartbeatAt < graceMs) return false;
  return true;
}

/**
 * Generate a deterministic-ish lease id. Format:
 *   `<workerId>-<taskId>-<epochMs>` — collision-resistant per worker
 *   without needing crypto for v1.
 */
export function makeLeaseId(workerId: string, taskId: string, ts: number): string {
  return `${workerId}-${taskId}-${ts}`;
}

/* ------------------------------------------------------------------ */
/*  Idempotency                                                       */
/* ------------------------------------------------------------------ */

/**
 * The coordinator must accept a `complete` for an already-completed
 * lease without double-counting. This helper returns true when the
 * incoming request should be applied; false means it's a duplicate the
 * caller should ack-and-ignore.
 */
export function shouldApplyComplete(lease: Lease | undefined, now: number): boolean {
  if (!lease) return false;
  if (lease.state !== "leased") return false;
  // Expired leases can still complete — the worker may have finished a
  // hair after the timer; we prefer the completion over a re-dispatch
  // if no other worker has claimed the task yet.
  return !isExpired(lease, now);
}
