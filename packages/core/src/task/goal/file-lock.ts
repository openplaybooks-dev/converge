/**
 * Advisory file lock — cross-process mutex for read-mutate-write paths.
 *
 * Uses `openSync(lockPath, 'wx')` which atomically succeeds only if the
 * lock file doesn't exist. The OS guarantees this — no two processes can
 * both succeed. If the lock already exists, the caller spins with
 * exponential backoff until it gets in or hits the timeout.
 *
 * On unclean shutdown the lockfile is left behind. To prevent a stale
 * lock blocking future writers forever, the file's mtime is checked: if
 * older than `STALE_LOCK_MS`, the lock is forcibly removed and acquired.
 * The stale window must be longer than the longest legitimate
 * mutation window (we use 30s — atomic rewrites of small JSONL files
 * complete in milliseconds).
 *
 * Why not `proper-lockfile` or `lockfile`?
 *   We have one tightly-scoped use case (small ledger files, short
 *   critical sections, no need to detect process liveness via PID
 *   files). Pulling in a dep that does much more than we need adds
 *   surface area and slow startup. 60 lines of carefully-tested code
 *   beats 600 lines of generic-purpose library.
 */

import { closeSync, openSync, statSync, unlinkSync, writeSync } from "node:fs";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const LOCK_SUFFIX = ".lock";
/**
 * Default stale-lock threshold. Locks older than this (no mtime touch
 * for this many ms) are considered abandoned and forcibly broken.
 *
 * The default is intentionally generous (5 min): legitimate
 * mutations of the ledger files complete in single-digit ms, so 5 min
 * is ~1000× the realistic upper bound on a single write. We need this
 * much headroom because:
 *   - On overloaded systems, a process can be scheduled out for many
 *     seconds during a critical section, even if its actual work is
 *     microseconds.
 *   - On slow filesystems (network shares, encrypted volumes), an
 *     fsync inside atomicWriteFileSync can take seconds.
 *   - On Windows, antivirus scans of the lockfile can hold it open
 *     past the original holder's release.
 *
 * Operators with unusually long-running critical sections (a 10k-task
 * tasks.jsonl rewrite that must fsync) can override via
 * `CONVERGE_STALE_LOCK_MS`. Lower values are NOT supported — under
 * 30s the risk of a false-positive stale-break (lock taken from a
 * live process and torn open) outweighs the benefit.
 */
const STALE_LOCK_DEFAULT_MS = 300_000;
const STALE_LOCK_MIN_MS = 30_000;
function staleLockMs(): number {
  const env = process.env.CONVERGE_STALE_LOCK_MS;
  if (!env) return STALE_LOCK_DEFAULT_MS;
  const n = Number(env);
  if (!Number.isFinite(n) || n < STALE_LOCK_MIN_MS) {
    return STALE_LOCK_DEFAULT_MS;
  }
  return n;
}
const STALE_LOCK_MS = STALE_LOCK_DEFAULT_MS;
/** Backoff schedule (ms) for retrying the lock acquire.
 *
 * Note on event-loop impact: when acquired via the SYNC variant, each
 * iteration busy-waits this many milliseconds. The cap is intentionally
 * kept under 100ms so sync callers (which hold the event loop) don't
 * exceed a single frame of unresponsiveness per retry. Async callers
 * (acquireFileLockAsync / withFileLockAsync) use real setTimeout and
 * are unaffected by these values.
 */
const BACKOFF_MS = [1, 2, 5, 10, 20, 40, 60, 80, 100, 100, 100];

export interface LockHandle {
  /** Release the lock. Idempotent. */
  release(): void;
}

function busyWait(ms: number): void {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    /* sync context — no setTimeout */
  }
}

function isStaleLock(lockPath: string): boolean {
  try {
    const st = statSync(lockPath);
    return Date.now() - st.mtimeMs > staleLockMs();
  } catch {
    // Lock vanished between our exists-check and the stat — treat as not-stale.
    return false;
  }
}

/**
 * Internal: try to acquire the lock once. Returns the handle on success
 * or null on contention. Throws on unexpected I/O error.
 */
function tryAcquire(lockPath: string): LockHandle | null {
  try {
    const fd = openSync(lockPath, "wx");
    try {
      writeSync(
        fd,
        `pid=${process.pid}\nacquiredAt=${new Date().toISOString()}\n`,
      );
    } catch {
      /* writing metadata is best-effort */
    }
    closeSync(fd);
    let released = false;
    return {
      release: () => {
        if (released) return;
        released = true;
        try {
          unlinkSync(lockPath);
        } catch {
          // Lock file may have been forcibly removed by a stale-lock
          // breaker. Nothing to clean up.
        }
      },
    };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "EEXIST") return null;
    throw err;
  }
}

function ensureLockDir(lockPath: string): void {
  try {
    mkdirSync(dirname(lockPath), { recursive: true });
  } catch {
    /* ignore — error will surface from the open() call below */
  }
}

function timeoutError(lockPath: string, timeoutMs: number): Error {
  return new Error(
    `file-lock: timed out after ${timeoutMs}ms waiting for ${lockPath}. ` +
      `If a previous process crashed while holding the lock, delete the ` +
      `file manually (or wait ${staleLockMs() / 1000}s for stale-lock auto-recovery). ` +
      `Override via CONVERGE_STALE_LOCK_MS=<ms> (min ${STALE_LOCK_MIN_MS / 1000}s).`,
  );
}

/**
 * Acquire an exclusive lock on `targetPath`. Synchronous variant — uses
 * busy-wait between retries. Safe to call from sync-only contexts
 * (process exit handlers, init paths). Callers in async contexts
 * should prefer `acquireFileLockAsync` so the event loop isn't blocked
 * during contention.
 *
 * @param targetPath  the file being protected (the lock file is sibling)
 * @param timeoutMs   max time to wait; default 5000ms
 */
export function acquireFileLock(
  targetPath: string,
  timeoutMs = 5_000,
): LockHandle {
  const lockPath = `${targetPath}${LOCK_SUFFIX}`;
  ensureLockDir(lockPath);
  const deadline = Date.now() + timeoutMs;
  let attempt = 0;
  while (true) {
    const handle = tryAcquire(lockPath);
    if (handle) return handle;
    if (isStaleLock(lockPath)) {
      try {
        unlinkSync(lockPath);
      } catch {
        /* another process may have just released; loop will retry */
      }
      continue;
    }
    if (Date.now() >= deadline) {
      throw timeoutError(lockPath, timeoutMs);
    }
    const delay = BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)];
    attempt++;
    busyWait(delay);
  }
}

/**
 * Async variant of `acquireFileLock`. Uses `setTimeout`-based backoff
 * so the event loop stays responsive during contention. Prefer this
 * from any async call site — the sync variant blocks all I/O,
 * timers, and concurrent task execution while it spins.
 */
export async function acquireFileLockAsync(
  targetPath: string,
  timeoutMs = 5_000,
): Promise<LockHandle> {
  const lockPath = `${targetPath}${LOCK_SUFFIX}`;
  ensureLockDir(lockPath);
  const deadline = Date.now() + timeoutMs;
  let attempt = 0;
  while (true) {
    const handle = tryAcquire(lockPath);
    if (handle) return handle;
    if (isStaleLock(lockPath)) {
      try {
        unlinkSync(lockPath);
      } catch {
        /* another process may have just released; loop will retry */
      }
      continue;
    }
    if (Date.now() >= deadline) {
      throw timeoutError(lockPath, timeoutMs);
    }
    const delay = BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)];
    attempt++;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

/**
 * Run `fn` while holding the lock on `targetPath`. Always releases, even
 * on exception. Convenience wrapper over `acquireFileLock`.
 */
export function withFileLock<T>(
  targetPath: string,
  fn: () => T,
  timeoutMs = 5_000,
): T {
  const handle = acquireFileLock(targetPath, timeoutMs);
  try {
    return fn();
  } finally {
    handle.release();
  }
}

/**
 * Async variant of `withFileLock`. The body can be sync or async; we
 * always await the result. Prefer this in async contexts (seed-executor,
 * execute-task, the navigator) so the event loop stays responsive.
 */
export async function withFileLockAsync<T>(
  targetPath: string,
  fn: () => T | Promise<T>,
  timeoutMs = 5_000,
): Promise<T> {
  const handle = await acquireFileLockAsync(targetPath, timeoutMs);
  try {
    return await fn();
  } finally {
    handle.release();
  }
}
