/**
 * run-lock — playbook-scoped run lock.
 *
 * Tests the UUID stolen-lock guard added in the world-leading pass:
 * if another process replaces the lock file while we're paused, our
 * release must NOT delete the new lock. Without this, a GC pause
 * could let us "release" someone else's lock and let a third process
 * start writing to the same journal.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  acquireRunLock,
  readRunLock,
  runLockPath,
  type RunLockInfo,
} from "../src/run-lock.ts";

describe("run-lock", () => {
  let project: string;
  let lockPath: string;
  const pb = "test-pb";

  beforeEach(() => {
    project = mkdtempSync(join(tmpdir(), "converge-runlock-"));
    lockPath = runLockPath(project, pb);
  });

  afterEach(() => {
    rmSync(project, { recursive: true, force: true });
  });

  it("acquires a lock, writes pid + uuid + metadata", () => {
    const release = acquireRunLock(project, pb, "test");
    const info = readRunLock(project, pb)!;
    expect(info).toMatchObject({
      pid: process.pid,
      playbook: pb,
      command: "test",
    });
    expect(info.uuid).toBeDefined();
    expect(info.uuid!.length).toBeGreaterThan(0);
    release();
    expect(existsSync(lockPath)).toBe(false);
  });

  it("each acquisition gets a fresh UUID", () => {
    const r1 = acquireRunLock(project, pb, "t1");
    const u1 = readRunLock(project, pb)!.uuid!;
    r1();
    const r2 = acquireRunLock(project, pb, "t2");
    const u2 = readRunLock(project, pb)!.uuid!;
    r2();
    expect(u1).not.toBe(u2);
  });

  it("release is idempotent", () => {
    const release = acquireRunLock(project, pb, "t");
    release();
    release(); // must not throw
    expect(existsSync(lockPath)).toBe(false);
  });

  it("release does NOT delete a stolen lock (uuid mismatch)", () => {
    const release = acquireRunLock(project, pb, "first");
    // Simulate: someone else replaces the lock with a different uuid.
    const stolen: RunLockInfo = {
      pid: 99999,
      playbook: pb,
      command: "second",
      startedAt: new Date().toISOString(),
      cwd: project,
      uuid: "stolen-uuid-value",
    };
    writeFileSync(lockPath, JSON.stringify(stolen, null, 2));
    // Our release should detect the uuid mismatch and refuse to delete.
    release();
    expect(existsSync(lockPath)).toBe(true);
    const after = readRunLock(project, pb)!;
    expect(after.uuid).toBe("stolen-uuid-value");
  });

  it("release skips when file is already gone", () => {
    const release = acquireRunLock(project, pb, "t");
    rmSync(lockPath, { force: true });
    // No throw; idempotent.
    expect(() => release()).not.toThrow();
  });

  it("legacy lock without uuid: falls back to PID match", () => {
    // First acquire to create the dir + initial lock, release.
    acquireRunLock(project, pb, "init")();
    // Plant a pre-UUID-era lock for our PID — release should still
    // clean it up.
    const legacy: RunLockInfo = {
      pid: process.pid,
      playbook: pb,
      command: "legacy",
      startedAt: new Date().toISOString(),
      cwd: project,
      // no uuid field — older format
    };
    writeFileSync(lockPath, JSON.stringify(legacy, null, 2));
    // Now acquire — should replace with fresh uuid lock. The legacy
    // lock is for our own pid so acquireRunLock allows replacement.
    const release = acquireRunLock(project, pb, "t");
    const info = readRunLock(project, pb)!;
    expect(info.uuid).toBeDefined();
    release();
    expect(existsSync(lockPath)).toBe(false);
  });
});
