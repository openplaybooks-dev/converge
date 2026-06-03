/**
 * Concurrency contract for the runtime ledger.
 *
 * Previously, two parallel `appendTaskUpsert` calls could lose writes:
 * each reads the whole file, mutates in memory, and writes the whole
 * file back. After Blocker-1 fix, the read-mutate-write is wrapped in a
 * `withFileLock` so a second writer waits for the first to commit.
 *
 * We simulate concurrency by spawning N child workers that each upsert a
 * distinct task into the same ledger, then assert all N rows landed.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fork } from "node:child_process";

import {
  appendTaskUpsert,
  readRuntimeLedgerState,
  runtimeTasksPath,
} from "../../src/task/goal/runtime-ledger.ts";

const WORKER_SCRIPT = resolve(
  __dirname,
  "../fixtures/runtime-ledger-worker.mjs",
);

describe("runtime-ledger concurrency", () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), "converge-ledger-conc-"));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it("serial upserts in a single process all land", () => {
    const playbook = "test";
    for (let i = 0; i < 10; i++) {
      appendTaskUpsert(projectDir, playbook, {
        id: `task-${i.toString().padStart(2, "0")}`,
        goalId: "test-goal",
        summary: `task ${i}`,
      });
    }
    const state = readRuntimeLedgerState(projectDir, playbook);
    expect(state.tasks).toHaveLength(10);
    const ids = state.tasks.map((t) => t.id).sort();
    expect(ids).toEqual(
      Array.from(
        { length: 10 },
        (_, i) => `task-${i.toString().padStart(2, "0")}`,
      ),
    );
  });

  it("parallel workers don't lose writes (cross-process lock)", async () => {
    const playbook = "test";
    const N = 8;
    // Fork N workers in parallel; each writes one distinct task.
    const workers = Array.from({ length: N }, (_, i) =>
      runWorker({
        projectDir,
        playbook,
        id: `task-${i.toString().padStart(2, "0")}`,
      }),
    );
    const codes = await Promise.all(workers);
    expect(codes.every((c) => c === 0)).toBe(true);

    // All N rows must be present — no lost writes.
    const state = readRuntimeLedgerState(projectDir, playbook);
    const ids = state.tasks.map((t) => t.id).sort();
    expect(ids).toEqual(
      Array.from(
        { length: N },
        (_, i) => `task-${i.toString().padStart(2, "0")}`,
      ),
    );

    // The file must end with a newline and have no malformed lines.
    const raw = readFileSync(runtimeTasksPath(projectDir, playbook), "utf-8");
    expect(raw.endsWith("\n")).toBe(true);
    const lines = raw.trim().split("\n");
    expect(lines).toHaveLength(N);
    for (const line of lines) {
      // Each line must parse as a JSON object with the expected id shape.
      const obj = JSON.parse(line);
      expect(typeof obj.id).toBe("string");
      expect(obj.id).toMatch(/^task-\d{2}$/);
    }
  }, 30_000);
});

interface WorkerArgs {
  projectDir: string;
  playbook: string;
  id: string;
}

function runWorker(args: WorkerArgs): Promise<number> {
  return new Promise((resolveProm, reject) => {
    const child = fork(WORKER_SCRIPT, [], {
      env: {
        ...process.env,
        CONVERGE_TEST_PROJECT: args.projectDir,
        CONVERGE_TEST_PLAYBOOK: args.playbook,
        CONVERGE_TEST_TASK_ID: args.id,
      },
      stdio: ["ignore", "pipe", "pipe", "ipc"],
    });
    let stderr = "";
    child.stderr?.on("data", (d) => (stderr += d.toString()));
    child.on("exit", (code) => {
      if (code !== 0 && stderr) {
        reject(new Error(`worker exited ${code}: ${stderr}`));
      } else {
        resolveProm(code ?? 1);
      }
    });
    child.on("error", reject);
  });
}
