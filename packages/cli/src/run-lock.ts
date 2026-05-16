import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";

export interface RunLockInfo {
  pid: number;
  playbook: string;
  command: string;
  startedAt: string;
  cwd: string;
  /**
   * Per-acquisition UUID. The acquirer records this in the lock file
   * and remembers it in memory. Before releasing (or any privileged
   * action), the acquirer re-reads the file and compares UUIDs — if
   * they differ, the lock was stolen (operator force-removed the file
   * and another process re-acquired it). Stolen lock-holders must
   * bail to avoid double-writing the journal.
   *
   * Optional for backward compat with lock files written before this
   * field existed (treated as "no validation possible — assume mine").
   */
  uuid?: string;
}

export function runLockPath(projectDir: string, playbookName: string): string {
  return join(projectDir, ".converge", "journal", playbookName, "run.lock");
}

export function readRunLock(projectDir: string, playbookName: string): RunLockInfo | null {
  const path = runLockPath(projectDir, playbookName);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as RunLockInfo;
  } catch {
    return null;
  }
}

export function isPidAlive(pid: number): boolean {
  if (!Number.isFinite(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function acquireRunLock(projectDir: string, playbookName: string, command: string): () => void {
  const path = runLockPath(projectDir, playbookName);
  mkdirSync(join(projectDir, ".converge", "journal", playbookName), { recursive: true });

  const existing = readRunLock(projectDir, playbookName);
  if (existing && isPidAlive(existing.pid) && existing.pid !== process.pid) {
    const age = existing.startedAt ? `started ${existing.startedAt}` : "start time unknown";
    throw new Error(
      `Playbook "${playbookName}" is already running.\n` +
      `   PID: ${existing.pid} (${age})\n` +
      `   Command: ${existing.command || "unknown"}\n` +
      `   Lock: ${path}\n\n` +
      `Stop it first with:\n` +
      `   converge stop --playbook=${playbookName}\n`
    );
  }

  // Mint a fresh UUID for this acquisition. Stored in the lock file
  // and remembered in closure scope so release can verify we still
  // own the lock — guards against the race where a paused process
  // wakes up after another process has stolen the lock.
  const myUuid = randomUUID();
  const info: RunLockInfo = {
    pid: process.pid,
    playbook: playbookName,
    command,
    startedAt: new Date().toISOString(),
    cwd: process.cwd(),
    uuid: myUuid,
  };
  writeFileSync(path, JSON.stringify(info, null, 2));

  let released = false;
  return () => {
    if (released) return;
    released = true;
    const current = readRunLock(projectDir, playbookName);
    // Only delete if the on-disk lock is still ours. Three valid cases:
    //   - file gone (already cleaned up) → nothing to do
    //   - same uuid → it's ours, delete
    //   - missing uuid (legacy lock written by older code) → fall
    //     back to PID match for backward compat
    if (!current) return;
    if (current.uuid && current.uuid !== myUuid) {
      // Someone else owns this lock now. Do NOT delete — they would
      // lose their critical section. Log so the operator knows their
      // lock was stolen and any post-release work this process does
      // is potentially racing.
      console.warn(
        `converge: WARNING — run lock for "${playbookName}" was stolen ` +
          `(now held by pid=${current.pid}). Skipping lock removal to avoid ` +
          `disrupting the other process.`,
      );
      return;
    }
    if (!current.uuid && current.pid !== process.pid) return;
    rmSync(path, { force: true });
  };
}

export function stopRun(projectDir: string, playbookName: string): boolean {
  const lock = readRunLock(projectDir, playbookName);
  let stopped = false;
  if (lock && isPidAlive(lock.pid)) {
    try {
      process.kill(lock.pid, "SIGTERM");
      stopped = true;
    } catch {}
  }

  // Best-effort cleanup of child agents/tails scoped to this playbook journal.
  const pattern = `journal/${playbookName}/`;
  if (process.platform !== "win32") {
    spawnSync("pkill", ["-f", pattern], { stdio: "ignore" });
  }

  rmSync(runLockPath(projectDir, playbookName), { force: true });
  return stopped;
}
