/**
 * goals.jsonl compaction — bounded growth via periodic snapshots.
 *
 * Pre-iter-4: goals.jsonl was append-only with no rotation. After
 * 100k+ events, replay on every readRuntimeLedgerState() became
 * prohibitive. Post: callers can periodically invoke compactGoalsLog()
 * to snapshot the current state and truncate the log; subsequent
 * reads merge snapshot + remaining events.
 *
 * Invariants verified:
 *   - Pre-compaction reads return the same goal state as post.
 *   - Events added after the snapshot are still visible.
 *   - File size after compaction is smaller than before.
 *   - A corrupt snapshot falls back to full replay.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  appendGoalUpsert,
  appendGoalStatus,
  compactGoalsLog,
  readRuntimeLedgerState,
  runtimeGoalsPath,
  runtimeGoalsSnapshotPath,
} from "../../src/task/goal/runtime-ledger.ts";
import type { PlaybookGoal } from "../../src/task/playbook/types.ts";

function makeGoal(id: string): PlaybookGoal {
  return {
    id,
    description: `goal ${id}`,
    checks: [{ id: "ok", cmd: "true" }],
  };
}

describe("goals.jsonl compaction", () => {
  let projectDir: string;
  const pb = "compact-test";

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), "converge-compact-"));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it("compaction preserves goal state", () => {
    // Build up some history.
    appendGoalUpsert(projectDir, pb, makeGoal("goal-a"));
    appendGoalUpsert(projectDir, pb, makeGoal("goal-b"));
    appendGoalStatus(projectDir, pb, "goal-a", "active");
    appendGoalStatus(projectDir, pb, "goal-a", "done");
    appendGoalStatus(projectDir, pb, "goal-b", "active");

    const before = readRuntimeLedgerState(projectDir, pb);

    const result = compactGoalsLog(projectDir, pb);
    expect(result.compactedEvents).toBe(5);
    expect(existsSync(runtimeGoalsSnapshotPath(projectDir, pb))).toBe(true);

    const after = readRuntimeLedgerState(projectDir, pb);
    // Sort for stable comparison.
    const sort = (arr: typeof after.goals) =>
      arr.slice().sort((a, b) => a.id.localeCompare(b.id));
    expect(sort(after.goals).map((g) => g.id)).toEqual(sort(before.goals).map((g) => g.id));
    expect(sort(after.goals).map((g) => g.status_runtime)).toEqual(
      sort(before.goals).map((g) => g.status_runtime),
    );
  });

  it("post-compaction events are still visible", () => {
    appendGoalUpsert(projectDir, pb, makeGoal("g1"));
    appendGoalStatus(projectDir, pb, "g1", "active");
    compactGoalsLog(projectDir, pb);

    // After compaction, append new events.
    appendGoalUpsert(projectDir, pb, makeGoal("g2"));
    appendGoalStatus(projectDir, pb, "g1", "done");
    appendGoalStatus(projectDir, pb, "g2", "active");

    const state = readRuntimeLedgerState(projectDir, pb);
    const byId = new Map(state.goals.map((g) => [g.id, g]));
    expect(byId.get("g1")?.status_runtime).toBe("done");
    expect(byId.get("g2")?.status_runtime).toBe("active");
  });

  it("file size drops after compaction", () => {
    // Generate enough events that the jsonl size is noticeable.
    for (let i = 0; i < 100; i++) {
      appendGoalUpsert(projectDir, pb, makeGoal(`g-${i}`));
      appendGoalStatus(projectDir, pb, `g-${i}`, "active");
      appendGoalStatus(projectDir, pb, `g-${i}`, "done");
    }
    const beforeSize = statSync(runtimeGoalsPath(projectDir, pb)).size;
    expect(beforeSize).toBeGreaterThan(0);

    compactGoalsLog(projectDir, pb);
    const afterSize = statSync(runtimeGoalsPath(projectDir, pb)).size;
    // jsonl is truncated to empty (or near-empty) after compaction.
    expect(afterSize).toBeLessThan(beforeSize / 10);
  });

  it("corrupt snapshot triggers fallback to full replay", () => {
    appendGoalUpsert(projectDir, pb, makeGoal("g1"));
    appendGoalStatus(projectDir, pb, "g1", "done");

    // Plant a corrupt snapshot.
    writeFileSync(
      runtimeGoalsSnapshotPath(projectDir, pb),
      "{ not valid json",
      "utf-8",
    );

    // readRuntimeLedgerState should ignore the corrupt snapshot and
    // replay the full log; result still correct.
    const state = readRuntimeLedgerState(projectDir, pb);
    const g1 = state.goals.find((g) => g.id === "g1");
    expect(g1).toBeDefined();
    expect(g1!.status_runtime).toBe("done");
  });

  it("snapshot survives multiple compaction cycles", () => {
    appendGoalUpsert(projectDir, pb, makeGoal("g1"));
    appendGoalStatus(projectDir, pb, "g1", "active");
    compactGoalsLog(projectDir, pb);

    appendGoalUpsert(projectDir, pb, makeGoal("g2"));
    compactGoalsLog(projectDir, pb);

    appendGoalStatus(projectDir, pb, "g1", "done");
    appendGoalStatus(projectDir, pb, "g2", "active");
    compactGoalsLog(projectDir, pb);

    const state = readRuntimeLedgerState(projectDir, pb);
    const byId = new Map(state.goals.map((g) => [g.id, g]));
    expect(byId.get("g1")?.status_runtime).toBe("done");
    expect(byId.get("g2")?.status_runtime).toBe("active");

    // Sanity: snapshot file is well-formed JSON after each cycle.
    const snap = JSON.parse(
      readFileSync(runtimeGoalsSnapshotPath(projectDir, pb), "utf-8"),
    );
    expect(typeof snap.asOf).toBe("string");
    expect(Array.isArray(snap.goals)).toBe(true);
  });
});
