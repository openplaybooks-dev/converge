/**
 * Task-definition cache LRU bound — prevents unbounded memory growth
 * in long-running processes (studio, planner daemon) that parse many
 * TASK.md files.
 *
 * Pre-fix: `_taskDefCache` was an unbounded Map; loading 10,000 task
 * definitions across a long session left them all resident.
 * Post-fix: capped at CONVERGE_TASKDEF_CACHE_MAX (default 1000), LRU
 * eviction on overflow.
 *
 * We can't exercise the public `fromPath` entry point without
 * touching the filesystem, so this test exercises the helper
 * `_taskDefCacheSize()` (exported for testing) plus the cache
 * invariants after many sequential `fromPath` calls.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fromPath, _taskDefCacheSize } from "../../src/task/unit/factories.ts";

describe("taskDef cache LRU bound", () => {
  let dir: string;
  let prevCap: string | undefined;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "converge-cache-"));
    prevCap = process.env.CONVERGE_TASKDEF_CACHE_MAX;
    // Cap at 5 so the test runs fast.
    process.env.CONVERGE_TASKDEF_CACHE_MAX = "5";
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    if (prevCap === undefined) delete process.env.CONVERGE_TASKDEF_CACHE_MAX;
    else process.env.CONVERGE_TASKDEF_CACHE_MAX = prevCap;
  });

  function plantTaskMd(id: string): string {
    // path-utils.extractJournalTaskId requires an `epics` ancestor.
    const taskDir = join(dir, "epics", "ep", id);
    mkdirSync(taskDir, { recursive: true });
    writeFileSync(
      join(taskDir, "TASK.md"),
      `---\nid: ${id}\ntitle: ${id}\n---\nbody\n`,
      "utf-8",
    );
    return taskDir;
  }

  it("evicts oldest entries beyond the cap", async () => {
    const initialSize = _taskDefCacheSize();
    // Load 10 distinct task definitions with a cap of 5 — cache should
    // top out at 5. extractLeafTaskId requires a `\d{2,3}-` prefix on
    // the directory name.
    for (let i = 0; i < 10; i++) {
      const taskDir = plantTaskMd(`${i.toString().padStart(3, "0")}-task`);
      await fromPath(taskDir);
    }
    const finalSize = _taskDefCacheSize();
    expect(finalSize - initialSize).toBeLessThanOrEqual(5);
  });
});
