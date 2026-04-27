/**
 * Playbook lockfile — one runner per playbook at a time.
 *
 * Prevents two `converge run` processes from writing to the same checkpoint
 * and journal concurrently, which silently corrupts state ("marked complete
 * but missing outputs", partial JSON in checkpoint.json, dual-write races on
 * downstream artifacts).
 *
 * Lock is a small JSON file at `.converge/journal/<playbook>/.lock` containing
 * the holder's PID and start time. Acquire at run start; release on clean
 * exit or signal. A stale lock (PID no longer alive) is reclaimed
 * automatically with a warning.
 */

import { existsSync, readFileSync } from "node:fs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";

interface LockData {
  pid: number;
  startedAt: string;
  command: string;
}

function lockPath(projectDir: string, playbook: string): string {
  return join(projectDir, ".converge", "journal", playbook, ".lock");
}

/**
 * True if a process with the given PID is currently alive.
 * Uses kill(pid, 0) — sends signal 0, which checks existence without
 * actually signalling.
 */
function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err: unknown) {
    // ESRCH = no such process. EPERM = exists but we don't have permission
    // (still alive — count it as held).
    const code = (err as NodeJS.ErrnoException)?.code;
    return code === "EPERM";
  }
}

/**
 * Try to acquire the playbook lock. On success, returns a release function.
 * On failure (lock held by a live process), prints a clear message and
 * exits the process — there is no scenario where running two writers on
 * the same playbook is safe.
 */
export async function acquirePlaybookLock(
  projectDir: string,
  playbook: string,
): Promise<() => Promise<void>> {
  const path = lockPath(projectDir, playbook);
  await mkdir(dirname(path), { recursive: true });

  // If a lock exists, decide whether it's stale.
  if (existsSync(path)) {
    let existing: LockData | null = null;
    try {
      existing = JSON.parse(readFileSync(path, "utf-8")) as LockData;
    } catch {
      // Corrupt lock file — treat as stale.
      console.warn(`⚠️  Stale lockfile (unreadable) — reclaiming: ${path}`);
    }

    if (existing && isProcessAlive(existing.pid)) {
      console.error(
        `\n⛔ Another converge run is already in progress for playbook "${playbook}".\n`,
      );
      console.error(`   Holder PID:  ${existing.pid}`);
      console.error(`   Started at:  ${existing.startedAt}`);
      console.error(`   Command:     ${existing.command}`);
      console.error(
        `\nKill the other run first, then retry. To inspect:`,
      );
      console.error(`   ps -p ${existing.pid}\n`);
      console.error(
        `If you're sure no other run is alive, delete the lockfile manually:`,
      );
      console.error(`   rm ${path}\n`);
      process.exit(1);
    }

    if (existing) {
      console.warn(
        `⚠️  Stale lockfile from PID ${existing.pid} (no longer alive) — reclaiming.`,
      );
    }
  }

  const data: LockData = {
    pid: process.pid,
    startedAt: new Date().toISOString(),
    command: process.argv.slice(1).join(" "),
  };
  await writeFile(path, JSON.stringify(data, null, 2));

  // Register cleanup on signals — best-effort, never throws to caller.
  let released = false;
  const release = async (): Promise<void> => {
    if (released) return;
    released = true;
    try {
      await unlink(path);
    } catch {
      // File may already be gone (concurrent cleanup, --restart cleared
      // the journal, etc.) — that's fine.
    }
  };

  // Synchronous cleanup for unexpected exits — process.exit, uncaught throw,
  // SIGTERM/SIGINT. We accept the small risk of leaving a stale lock if the
  // process is hard-killed (kill -9); the next run will reclaim it via the
  // alive-check above.
  const sigCleanup = (sig: NodeJS.Signals) => {
    try {
      const { unlinkSync } = require("node:fs");
      unlinkSync(path);
    } catch {
      // ignore
    }
    // Re-raise the default signal behavior so the process actually exits.
    process.kill(process.pid, sig);
  };
  process.once("SIGINT", () => sigCleanup("SIGINT"));
  process.once("SIGTERM", () => sigCleanup("SIGTERM"));
  process.once("exit", () => {
    try {
      const { unlinkSync } = require("node:fs");
      unlinkSync(path);
    } catch {
      // ignore
    }
  });

  return release;
}
