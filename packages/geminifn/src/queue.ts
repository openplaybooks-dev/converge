import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, readdirSync, statSync, rmdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

// ─── Types ──────────────────────────────────────────────────

export interface GlobalQueueOptions {
  /** Maximum concurrent Gemini CLI processes across all Node processes (default: 5) */
  maxConcurrent?: number;
  /** Maximum requests per minute across all Node processes (default: 60) */
  maxPerMinute?: number;
  /** Directory for cross-process state files (default: ~/.geminifn) */
  stateDir?: string;
  /** Timeout in ms waiting to acquire a slot (default: 300_000 = 5 min) */
  acquireTimeoutMs?: number;
  /** Polling interval in ms when waiting for a slot (default: 250) */
  pollIntervalMs?: number;
}

interface SlotEntry {
  pid: number;
  acquiredAt: number;
  id: string;
}

interface QueueState {
  slots: SlotEntry[];
  timestamps: number[];
}

// ─── File-based Lock ────────────────────────────────────────

const LOCK_STALE_MS = 30_000; // consider a lock stale after 30s

function acquireFileLock(lockPath: string, timeoutMs: number): boolean {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      // mkdir is atomic on POSIX — if it succeeds, we own the lock
      mkdirSync(lockPath);
      // Write our PID so stale locks can be detected
      writeFileSync(join(lockPath, "pid"), String(process.pid));
      return true;
    } catch {
      // Lock exists — check if it's stale
      try {
        const pidFile = join(lockPath, "pid");
        if (existsSync(pidFile)) {
          const lockStat = statSync(pidFile);
          if (Date.now() - lockStat.mtimeMs > LOCK_STALE_MS) {
            // Stale lock — break it
            releaseFileLock(lockPath);
            continue;
          }
          // Check if the owning PID is still alive
          const ownerPid = parseInt(readFileSync(pidFile, "utf-8").trim(), 10);
          if (!isPidAlive(ownerPid)) {
            releaseFileLock(lockPath);
            continue;
          }
        }
      } catch {
        // Ignore errors checking staleness
      }
      // Spin wait
      spinWait(10);
    }
  }
  return false;
}

function releaseFileLock(lockPath: string): void {
  try {
    const pidFile = join(lockPath, "pid");
    if (existsSync(pidFile)) unlinkSync(pidFile);
    // rmdir only works on empty directories (safe)
    const entries = readdirSync(lockPath);
    for (const e of entries) unlinkSync(join(lockPath, e));
    rmdirSync(lockPath);
  } catch {
    // Best-effort cleanup
  }
}

function spinWait(ms: number): void {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    // busy wait — only used for very short lock acquisition
  }
}

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

// ─── State Management ───────────────────────────────────────

function readState(statePath: string): QueueState {
  try {
    const raw = readFileSync(statePath, "utf-8");
    return JSON.parse(raw) as QueueState;
  } catch {
    return { slots: [], timestamps: [] };
  }
}

function writeState(statePath: string, state: QueueState): void {
  writeFileSync(statePath, JSON.stringify(state), "utf-8");
}

/** Remove slots whose owning process has died */
function purgeDeadSlots(state: QueueState): QueueState {
  return {
    slots: state.slots.filter((s) => isPidAlive(s.pid)),
    timestamps: state.timestamps,
  };
}

/** Remove timestamps older than 60 seconds */
function pruneTimestamps(state: QueueState): QueueState {
  const cutoff = Date.now() - 60_000;
  return {
    slots: state.slots,
    timestamps: state.timestamps.filter((t) => t > cutoff),
  };
}

// ─── Global Queue ───────────────────────────────────────────

let idCounter = 0;

export class GlobalQueue {
  readonly maxConcurrent: number;
  readonly maxPerMinute: number;
  readonly stateDir: string;
  readonly acquireTimeoutMs: number;
  readonly pollIntervalMs: number;

  private readonly statePath: string;
  private readonly lockPath: string;

  constructor(options: GlobalQueueOptions = {}) {
    this.maxConcurrent = options.maxConcurrent ?? 5;
    this.maxPerMinute = options.maxPerMinute ?? 60;
    this.stateDir = options.stateDir ?? join(homedir(), ".geminifn");
    this.acquireTimeoutMs = options.acquireTimeoutMs ?? 300_000;
    this.pollIntervalMs = options.pollIntervalMs ?? 250;

    this.statePath = join(this.stateDir, "queue-state.json");
    this.lockPath = join(this.stateDir, ".lock");

    // Ensure state directory exists
    mkdirSync(this.stateDir, { recursive: true });
  }

  /**
   * Acquire a slot in the global queue.
   * Blocks (via polling) until a slot is available and rate limit permits.
   * Returns an opaque slot ID that must be passed to release().
   */
  async acquire(): Promise<string> {
    const slotId = `${process.pid}-${Date.now()}-${++idCounter}`;
    const deadline = Date.now() + this.acquireTimeoutMs;

    while (Date.now() < deadline) {
      const result = this.tryAcquire(slotId);
      if (result.acquired) {
        return slotId;
      }

      // Wait before retrying — use async sleep so we don't block the event loop
      const waitMs = result.retryAfterMs
        ? Math.min(result.retryAfterMs, this.pollIntervalMs)
        : this.pollIntervalMs;
      await sleep(waitMs);
    }

    throw new Error(
      `GlobalQueue: timed out waiting for a slot after ${this.acquireTimeoutMs}ms ` +
        `(maxConcurrent=${this.maxConcurrent}, maxPerMinute=${this.maxPerMinute})`,
    );
  }

  /**
   * Release a slot back to the global queue.
   * Must be called when the Gemini CLI process completes (or errors).
   */
  release(slotId: string): void {
    if (!acquireFileLock(this.lockPath, 5_000)) {
      // Best effort — if we can't lock, at least try to clean up
      return;
    }

    try {
      let state = readState(this.statePath);
      state = purgeDeadSlots(state);
      state.slots = state.slots.filter((s) => s.id !== slotId);
      writeState(this.statePath, state);
    } finally {
      releaseFileLock(this.lockPath);
    }
  }

  /**
   * Wrap an async operation with automatic acquire/release.
   * Acquires a slot before running `fn`, releases it when done (success or error).
   */
  async wrap<T>(fn: () => Promise<T>): Promise<T> {
    const slotId = await this.acquire();
    try {
      return await fn();
    } finally {
      this.release(slotId);
    }
  }

  /**
   * Get the current queue status (for monitoring/debugging).
   */
  status(): { activeSlots: number; recentRequests: number; maxConcurrent: number; maxPerMinute: number } {
    if (!acquireFileLock(this.lockPath, 2_000)) {
      return { activeSlots: -1, recentRequests: -1, maxConcurrent: this.maxConcurrent, maxPerMinute: this.maxPerMinute };
    }

    try {
      let state = readState(this.statePath);
      state = purgeDeadSlots(state);
      state = pruneTimestamps(state);
      writeState(this.statePath, state);
      return {
        activeSlots: state.slots.length,
        recentRequests: state.timestamps.length,
        maxConcurrent: this.maxConcurrent,
        maxPerMinute: this.maxPerMinute,
      };
    } finally {
      releaseFileLock(this.lockPath);
    }
  }

  // ─── Private ────────────────────────────────────────────────

  private tryAcquire(slotId: string): { acquired: boolean; retryAfterMs?: number } {
    if (!acquireFileLock(this.lockPath, 5_000)) {
      return { acquired: false, retryAfterMs: 100 };
    }

    try {
      let state = readState(this.statePath);
      state = purgeDeadSlots(state);
      state = pruneTimestamps(state);

      // Check concurrency limit
      if (state.slots.length >= this.maxConcurrent) {
        writeState(this.statePath, state);
        return { acquired: false };
      }

      // Check rate limit
      if (state.timestamps.length >= this.maxPerMinute) {
        // Calculate when the oldest timestamp will expire
        const oldest = state.timestamps[0];
        const retryAfterMs = oldest + 60_000 - Date.now();
        writeState(this.statePath, state);
        return { acquired: false, retryAfterMs: Math.max(retryAfterMs, 50) };
      }

      // Acquire slot
      state.slots.push({
        pid: process.pid,
        acquiredAt: Date.now(),
        id: slotId,
      });
      state.timestamps.push(Date.now());
      writeState(this.statePath, state);
      return { acquired: true };
    } finally {
      releaseFileLock(this.lockPath);
    }
  }
}

// ─── Singleton ──────────────────────────────────────────────

let defaultQueue: GlobalQueue | null = null;

/**
 * Get or create the default global queue singleton.
 * All geminifn/compose calls share this queue unless a custom queue is provided.
 */
export function getDefaultQueue(options?: GlobalQueueOptions): GlobalQueue {
  if (!defaultQueue) {
    defaultQueue = new GlobalQueue(options);
  }
  return defaultQueue;
}

/**
 * Replace the default global queue singleton (useful for testing or reconfiguration).
 */
export function setDefaultQueue(queue: GlobalQueue | null): void {
  defaultQueue = queue;
}

// ─── Helpers ────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
