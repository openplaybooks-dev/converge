import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

export interface RunLockInfo {
  pid: number;
  playbook: string;
  command: string;
  startedAt: string;
  cwd: string;
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

  const info: RunLockInfo = {
    pid: process.pid,
    playbook: playbookName,
    command,
    startedAt: new Date().toISOString(),
    cwd: process.cwd(),
  };
  writeFileSync(path, JSON.stringify(info, null, 2));

  let released = false;
  return () => {
    if (released) return;
    released = true;
    const current = readRunLock(projectDir, playbookName);
    if (!current || current.pid === process.pid) {
      rmSync(path, { force: true });
    }
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
