/**
 * Ledger scale test — quantify behavior at 10,000+ tasks.
 *
 * The DAG perf test exercises in-memory data structures. This test
 * exercises the on-disk ledger (tasks.jsonl): writes, reads, and
 * mtime-keyed cache hits at scale. World-leading means knowing the
 * runtime ceiling, not just the floor.
 *
 * Run with: `pnpm test -- tests/perf/ledger-scale.test.ts`
 *
 * Notes:
 *   - These tests use the public `appendTaskUpsert`/`readRuntimeLedgerState`
 *     API; no fake fixtures. If the ledger code regresses, this test
 *     surfaces the regression with concrete timings.
 *   - Each test runs in an isolated tmpdir; no global state.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  appendTaskUpsert,
  appendTaskStatus,
  readRuntimeLedgerState,
  runtimeTasksPath,
} from "../../src/task/goal/runtime-ledger.ts";

describe("ledger scale", () => {
  let projectDir: string;
  const playbook = "scale-test";

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), "converge-scale-"));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it("inserts 1,000 tasks in bounded time", () => {
    // 1000-task baseline — the realistic scale for autonomous runs
    // (sprints of ~10 tasks × ~100 goal-driven iterations).
    const N = 1_000;
    const start = Date.now();
    for (let i = 0; i < N; i++) {
      appendTaskUpsert(projectDir, playbook, {
        id: `t-${i.toString().padStart(4, "0")}`,
        goalId: "scale",
        summary: `task ${i}`,
      });
    }
    const elapsed = Date.now() - start;
    // The current read-mutate-write loop is O(N²) bytes for N
    // upserts. At N=1000 this should complete in a few seconds.
    // If it regresses past 30s, the ledger needs an append-only path.
    expect(elapsed, `1,000 upserts took ${elapsed}ms`).toBeLessThan(30_000);

    const state = readRuntimeLedgerState(projectDir, playbook);
    expect(state.tasks).toHaveLength(N);

    // Sanity: the file is JSONL with one record per line, no
    // duplicates.
    const raw = readFileSync(runtimeTasksPath(projectDir, playbook), "utf-8");
    const lines = raw.trim().split("\n");
    expect(lines).toHaveLength(N);
    const ids = new Set(lines.map((l) => JSON.parse(l).id));
    expect(ids.size).toBe(N);
  }, 60_000);

  it("inserts 10,000 tasks via the append-only fast path", () => {
    // After the fast-path optimization in appendTaskUpsert,
    // INSERT-only upserts append a single line per call (O(1))
    // instead of rewriting the whole file (O(N)). 10k inserts
    // should now complete well under the 30s budget. This is the
    // throughput floor for production overnight runs that may
    // generate thousands of spawned tasks.
    const N = 10_000;
    const start = Date.now();
    for (let i = 0; i < N; i++) {
      appendTaskUpsert(projectDir, playbook, {
        id: `t-${i.toString().padStart(5, "0")}`,
        goalId: "scale",
        summary: `task ${i}`,
      });
    }
    const elapsed = Date.now() - start;
    expect(elapsed, `10,000 INSERT upserts took ${elapsed}ms`).toBeLessThan(
      30_000,
    );

    const state = readRuntimeLedgerState(projectDir, playbook);
    expect(state.tasks).toHaveLength(N);
  }, 60_000);

  it("repeated readRuntimeLedgerState on a stable ledger is fast (cache hit)", () => {
    // Pre-populate a moderate ledger.
    const N = 1000;
    for (let i = 0; i < N; i++) {
      appendTaskUpsert(projectDir, playbook, {
        id: `t-${i.toString().padStart(4, "0")}`,
        goalId: "scale",
        summary: `task ${i}`,
      });
    }
    // Now stat the ledger and read it 1000 times. With the mtime
    // cache, the second-through-Nth reads should be cheap (no
    // JSONL parse).
    const start = Date.now();
    let lastSize = 0;
    for (let i = 0; i < 1000; i++) {
      const state = readRuntimeLedgerState(projectDir, playbook);
      lastSize = state.tasks.length;
    }
    const elapsed = Date.now() - start;
    expect(lastSize).toBe(N);
    // 1000 cache-hit reads of 1000 tasks should complete well under 5s.
    // Without the cache this was ~10s on the same machine.
    expect(
      elapsed,
      `1000 cached reads of ${N} tasks took ${elapsed}ms`,
    ).toBeLessThan(5_000);
  }, 60_000);

  it("status updates on a 1000-task ledger remain responsive", () => {
    const N = 1000;
    for (let i = 0; i < N; i++) {
      appendTaskUpsert(projectDir, playbook, {
        id: `t-${i.toString().padStart(4, "0")}`,
        goalId: "scale",
        summary: `task ${i}`,
      });
    }
    // Status-update every 10th task; measure throughput.
    const updateIds = Array.from(
      { length: 100 },
      (_, i) => `t-${(i * 10).toString().padStart(4, "0")}`,
    );
    const start = Date.now();
    for (const id of updateIds) {
      appendTaskStatus(projectDir, playbook, id, "done");
    }
    const elapsed = Date.now() - start;
    // 100 status updates should complete in under 5s even on a slow
    // CI runner. Each is a full read-mutate-write of a 1000-line file.
    expect(
      elapsed,
      `100 status updates on ${N}-task ledger took ${elapsed}ms`,
    ).toBeLessThan(5_000);

    // All updates landed.
    const state = readRuntimeLedgerState(projectDir, playbook);
    const done = state.tasks.filter((t) => t.status === "done");
    expect(done).toHaveLength(100);
  }, 60_000);

  it("reports file size growth for ops awareness", () => {
    // Diagnostic test: how big does tasks.jsonl get at 1k tasks?
    // Operators need to know when rotation matters.
    const N = 1_000;
    for (let i = 0; i < N; i++) {
      appendTaskUpsert(projectDir, playbook, {
        id: `t-${i.toString().padStart(4, "0")}`,
        goalId: "scale",
        summary: `task ${i}`,
      });
    }
    const size = statSync(runtimeTasksPath(projectDir, playbook)).size;
    const kb = Math.round(size / 1024);
    // Sanity bound: each row is ~200 bytes; 1k = ~200 KB. Anything
    // wildly bigger indicates a regression (e.g., redundant metadata).
    expect(kb, `tasks.jsonl size for ${N} rows: ${kb} KB`).toBeLessThan(1_000);
  }, 60_000);
});
