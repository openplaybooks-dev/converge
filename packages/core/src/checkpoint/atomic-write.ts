/**
 * Atomic file write — never leaves a partial file on disk.
 *
 * Standard pattern: write to `<path>.tmp.<pid>.<rand>`, fsync, then `rename()`
 * to the final path. POSIX guarantees `rename()` is atomic on the same
 * filesystem — readers see either the old file or the new file, never a
 * partial one.
 *
 * Required for checkpoint files: a partial write here is the source of
 * "Failed to load checkpoint: Unexpected end of JSON input" errors that
 * lose progress on the next resume.
 */

import { rename, unlink, open } from "node:fs/promises";
import {
  writeFileSync,
  openSync,
  fsyncSync,
  closeSync,
  renameSync,
  unlinkSync,
} from "node:fs";
import { dirname, basename, join } from "node:path";

function tempPath(finalPath: string): string {
  const dir = dirname(finalPath);
  const name = basename(finalPath);
  // Random + pid suffix so concurrent writers from different processes
  // don't collide. (Same-process concurrent writers are still a contract
  // violation, but this avoids accidental collisions.)
  const suffix = `${process.pid}.${Math.random().toString(36).slice(2, 10)}`;
  return join(dir, `.${name}.tmp.${suffix}`);
}

// On Windows, `rename()` over an existing file fails with EPERM/EBUSY/EACCES
// if any other process holds the destination open — even briefly. Defender,
// Search Indexer, OneDrive sync, and editor watchers all routinely do this.
// Retry the rename with small backoff so transient locks don't crash long runs.
const RENAME_RETRY_CODES = new Set(["EPERM", "EBUSY", "EACCES", "ENOENT"]);
const RENAME_MAX_ATTEMPTS = 10;
const RENAME_BACKOFF_MS = [5, 10, 20, 40, 75, 125, 200, 300, 450, 700];

async function renameWithRetry(from: string, to: string): Promise<void> {
  let lastErr: NodeJS.ErrnoException | undefined;
  for (let attempt = 0; attempt < RENAME_MAX_ATTEMPTS; attempt++) {
    try {
      await rename(from, to);
      return;
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (!e.code || !RENAME_RETRY_CODES.has(e.code)) throw err;
      lastErr = e;
      const delay = RENAME_BACKOFF_MS[attempt] ?? 700;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

function renameSyncWithRetry(from: string, to: string): void {
  let lastErr: NodeJS.ErrnoException | undefined;
  for (let attempt = 0; attempt < RENAME_MAX_ATTEMPTS; attempt++) {
    try {
      renameSync(from, to);
      return;
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (!e.code || !RENAME_RETRY_CODES.has(e.code)) throw err;
      lastErr = e;
      const delay = RENAME_BACKOFF_MS[attempt] ?? 700;
      const end = Date.now() + delay;
      while (Date.now() < end) {
        /* busy-wait — sync context */
      }
    }
  }
  throw lastErr;
}

/**
 * Async atomic write. Use for non-hot-path checkpoint persistence.
 */
export async function atomicWriteFile(
  finalPath: string,
  data: string | Uint8Array,
): Promise<void> {
  const tmp = tempPath(finalPath);
  let fd: Awaited<ReturnType<typeof open>> | null = null;
  try {
    // Write + fsync the temp file before rename. fsync ensures the data is
    // actually on disk; without it a power loss between write() and rename()
    // could still leave a corrupt file under the final name.
    fd = await open(tmp, "w");
    await fd.writeFile(data);
    await fd.sync();
    await fd.close();
    fd = null;
    await renameWithRetry(tmp, finalPath);
  } catch (err) {
    // Best-effort cleanup of the temp file. Swallow errors — the original
    // exception is what the caller should see.
    if (fd) await fd.close().catch(() => {});
    await unlink(tmp).catch(() => {});
    throw err;
  }
}

/**
 * Sync atomic write. Use only when the caller is already in sync code
 * (e.g. process exit handlers).
 */
export function atomicWriteFileSync(
  finalPath: string,
  data: string | Uint8Array,
): void {
  const tmp = tempPath(finalPath);
  let fd: number | null = null;
  try {
    fd = openSync(tmp, "w");
    writeFileSync(fd, data);
    fsyncSync(fd);
    closeSync(fd);
    fd = null;
    renameSyncWithRetry(tmp, finalPath);
  } catch (err) {
    if (fd !== null) {
      try {
        closeSync(fd);
      } catch {
        /* ignore */
      }
    }
    try {
      unlinkSync(tmp);
    } catch {
      /* ignore */
    }
    throw err;
  }
}
