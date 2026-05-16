/**
 * file-lock — cross-process advisory mutex.
 *
 * Tests both happy path (single acquire/release) and the contended case.
 * Since we can't spin up a real second process from inside a test cheaply,
 * we simulate contention by leaving the lock file in place and verifying
 * the contended call waits and then either acquires or throws.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  existsSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
  utimesSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  acquireFileLock,
  acquireFileLockAsync,
  withFileLock,
  withFileLockAsync,
} from "../../src/task/goal/file-lock.ts";

describe("file-lock", () => {
  let dir: string;
  let target: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "converge-flock-"));
    target = join(dir, "tasks.jsonl");
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("acquires when no other holder exists", () => {
    const h = acquireFileLock(target);
    expect(existsSync(`${target}.lock`)).toBe(true);
    h.release();
    expect(existsSync(`${target}.lock`)).toBe(false);
  });

  it("release is idempotent", () => {
    const h = acquireFileLock(target);
    h.release();
    h.release(); // second call must not throw
    expect(existsSync(`${target}.lock`)).toBe(false);
  });

  it("withFileLock acquires, runs fn, releases on success", () => {
    let ran = false;
    const r = withFileLock(target, () => {
      ran = true;
      expect(existsSync(`${target}.lock`)).toBe(true);
      return 42;
    });
    expect(ran).toBe(true);
    expect(r).toBe(42);
    expect(existsSync(`${target}.lock`)).toBe(false);
  });

  it("withFileLock releases on exception", () => {
    expect(() =>
      withFileLock(target, () => {
        throw new Error("boom");
      }),
    ).toThrow(/boom/);
    expect(existsSync(`${target}.lock`)).toBe(false);
  });

  it("contended acquire throws on timeout", () => {
    // Manually plant a fresh lock file so acquire sees contention.
    writeFileSync(`${target}.lock`, "pid=fake\n");
    // Use a short timeout so the test runs fast.
    expect(() => acquireFileLock(target, 100)).toThrow(/timed out/);
  });

  it("breaks a stale lock (mtime older than threshold)", () => {
    // The default stale-lock threshold is 5 min. Backdate the lock
    // to 10 min ago so it's clearly stale.
    writeFileSync(`${target}.lock`, "pid=fake\n");
    const past = Date.now() - 600_000;
    utimesSync(`${target}.lock`, past / 1000, past / 1000);
    // Should succeed by forcibly removing the stale lock.
    const h = acquireFileLock(target, 100);
    h.release();
    expect(existsSync(`${target}.lock`)).toBe(false);
  });

  it("CONVERGE_STALE_LOCK_MS overrides the default threshold", () => {
    const prev = process.env.CONVERGE_STALE_LOCK_MS;
    process.env.CONVERGE_STALE_LOCK_MS = "30000"; // 30s
    try {
      writeFileSync(`${target}.lock`, "pid=fake\n");
      const past = Date.now() - 60_000; // 60s old → stale under 30s threshold
      utimesSync(`${target}.lock`, past / 1000, past / 1000);
      const h = acquireFileLock(target, 100);
      h.release();
      expect(existsSync(`${target}.lock`)).toBe(false);
    } finally {
      if (prev === undefined) delete process.env.CONVERGE_STALE_LOCK_MS;
      else process.env.CONVERGE_STALE_LOCK_MS = prev;
    }
  });

  describe("async variants", () => {
    it("acquireFileLockAsync acquires when uncontended", async () => {
      const h = await acquireFileLockAsync(target);
      expect(existsSync(`${target}.lock`)).toBe(true);
      h.release();
      expect(existsSync(`${target}.lock`)).toBe(false);
    });

    it("withFileLockAsync runs fn and releases", async () => {
      const r = await withFileLockAsync(target, async () => 42);
      expect(r).toBe(42);
      expect(existsSync(`${target}.lock`)).toBe(false);
    });

    it("withFileLockAsync does not block the event loop during contention", async () => {
      // Plant a contended lock and ensure setTimeout callbacks fire
      // while we wait. With the sync variant, busyWait would prevent
      // this timer from running until the lock is acquired or times out.
      writeFileSync(`${target}.lock`, "pid=fake\n");
      let timerFired = false;
      setTimeout(() => {
        timerFired = true;
      }, 30);
      // Acquire with a short timeout — will reject after backoff.
      await expect(
        acquireFileLockAsync(target, 80),
      ).rejects.toThrow(/timed out/);
      // The timer must have fired during our backoff loop — proves we
      // gave up the event loop between attempts.
      expect(timerFired).toBe(true);
    });

    it("withFileLockAsync releases on exception", async () => {
      await expect(
        withFileLockAsync(target, async () => {
          throw new Error("boom");
        }),
      ).rejects.toThrow(/boom/);
      expect(existsSync(`${target}.lock`)).toBe(false);
    });
  });
});
