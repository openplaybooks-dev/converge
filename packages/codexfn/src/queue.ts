import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  readdirSync,
  statSync,
  rmdirSync,
} from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export interface GlobalQueueOptions {
  maxConcurrent?: number;
  maxPerMinute?: number;
  stateDir?: string;
  acquireTimeoutMs?: number;
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

const LOCK_STALE_MS = 30_000;

function acquireFileLock(lockPath: string, timeoutMs: number): boolean {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      mkdirSync(lockPath);
      writeFileSync(join(lockPath, "pid"), String(process.pid));
      return true;
    } catch {
      try {
        const pidFile = join(lockPath, "pid");
        if (existsSync(pidFile)) {
          const lockStat = statSync(pidFile);
          if (Date.now() - lockStat.mtimeMs > LOCK_STALE_MS) {
            releaseFileLock(lockPath);
            continue;
          }
          const ownerPid = parseInt(readFileSync(pidFile, "utf-8").trim(), 10);
          if (!isPidAlive(ownerPid)) {
            releaseFileLock(lockPath);
            continue;
          }
        }
      } catch {
        // Ignore errors checking staleness
      }
      spinWait(10);
    }
  }
  return false;
}

function releaseFileLock(lockPath: string): void {
  try {
    const pidFile = join(lockPath, "pid");
    if (existsSync(pidFile)) unlinkSync(pidFile);
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

function purgeDeadSlots(state: QueueState): QueueState {
  return {
    slots: state.slots.filter((s) => isPidAlive(s.pid)),
    timestamps: state.timestamps,
  };
}

function pruneTimestamps(state: QueueState): QueueState {
  const cutoff = Date.now() - 60_000;
  return {
    slots: state.slots,
    timestamps: state.timestamps.filter((t) => t > cutoff),
  };
}

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
    this.stateDir = options.stateDir ?? join(homedir(), ".codexfn");
    this.acquireTimeoutMs = options.acquireTimeoutMs ?? 300_000;
    this.pollIntervalMs = options.pollIntervalMs ?? 250;

    this.statePath = join(this.stateDir, "queue-state.json");
    this.lockPath = join(this.stateDir, ".lock");

    mkdirSync(this.stateDir, { recursive: true });
  }

  async acquire(): Promise<string> {
    const slotId = `${process.pid}-${Date.now()}-${++idCounter}`;
    const deadline = Date.now() + this.acquireTimeoutMs;

    while (Date.now() < deadline) {
      const result = this.tryAcquire(slotId);
      if (result.acquired) {
        return slotId;
      }
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

  release(slotId: string): void {
    if (!acquireFileLock(this.lockPath, 5_000)) {
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

  async wrap<T>(fn: () => Promise<T>): Promise<T> {
    const slotId = await this.acquire();
    try {
      return await fn();
    } finally {
      this.release(slotId);
    }
  }

  status(): {
    activeSlots: number;
    recentRequests: number;
    maxConcurrent: number;
    maxPerMinute: number;
  } {
    if (!acquireFileLock(this.lockPath, 2_000)) {
      return {
        activeSlots: -1,
        recentRequests: -1,
        maxConcurrent: this.maxConcurrent,
        maxPerMinute: this.maxPerMinute,
      };
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

  private tryAcquire(slotId: string): {
    acquired: boolean;
    retryAfterMs?: number;
  } {
    if (!acquireFileLock(this.lockPath, 5_000)) {
      return { acquired: false, retryAfterMs: 100 };
    }
    try {
      let state = readState(this.statePath);
      state = purgeDeadSlots(state);
      state = pruneTimestamps(state);

      if (state.slots.length >= this.maxConcurrent) {
        writeState(this.statePath, state);
        return { acquired: false };
      }

      if (state.timestamps.length >= this.maxPerMinute) {
        const oldest = state.timestamps[0];
        const retryAfterMs = oldest + 60_000 - Date.now();
        writeState(this.statePath, state);
        return { acquired: false, retryAfterMs: Math.max(retryAfterMs, 50) };
      }

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

let defaultQueue: GlobalQueue | null = null;

export function getDefaultQueue(options?: GlobalQueueOptions): GlobalQueue {
  if (!defaultQueue) {
    defaultQueue = new GlobalQueue(options);
  }
  return defaultQueue;
}

export function setDefaultQueue(queue: GlobalQueue | null): void {
  defaultQueue = queue;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
