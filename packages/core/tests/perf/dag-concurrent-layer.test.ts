/**
 * Concurrent intra-layer execution load test.
 *
 * The DAG runner accepts a `concurrency` option; the default is 1
 * (sequential). When concurrency > 1, multiple tasks from the same
 * topological layer execute in parallel — each one writing its
 * status update to the same `tasks.jsonl` and `runstate.json` files.
 *
 * Pre-iter-4, the file lock in `runtime-ledger.ts` protected against
 * data races but the runner's parallel-layer path was never load-
 * tested. This test:
 *   1. Builds a 50-leaf DAG (one root + 50 independent leaves).
 *   2. Runs with concurrency=8.
 *   3. Each leaf's executeNode appends to tasks.jsonl through the
 *      normal `appendTaskUpsert` path.
 *   4. Verifies all 50 rows landed with no corruption.
 *
 * If this test passes, the framework can safely run 8-wide parallel
 * tasks against a shared ledger without lost writes or interleaved
 * JSONL lines.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { runDag } from "../../src/dag/dag-runner.ts";
import { TaskDag } from "../../src/dag/task-dag.ts";
import type { DagNode } from "../../src/dag/dag-node.ts";
import type { TaskDefinition } from "../../src/config/task-definition.ts";
import {
  appendTaskUpsert,
  appendTaskStatus,
  readRuntimeLedgerState,
  runtimeTasksPath,
} from "../../src/task/goal/runtime-ledger.ts";

function makeNode(id: string, depends_on: string[] = []): DagNode {
  return {
    id,
    type: "normal",
    parents: [],
    children: [],
    depends_on,
    depended_on_by: [],
    taskDef: { id } as TaskDefinition,
    path: `/tmp/${id}`,
    status: "pending",
    virtual: false,
  };
}

describe("DAG concurrent-layer load", () => {
  let projectDir: string;
  const playbook = "concurrent-test";

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), "converge-concur-"));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it("concurrency=8 across 50 leaves: every row lands, no JSONL corruption", async () => {
    const N = 50;
    const dag = new TaskDag();
    dag.addNode(makeNode("root"));
    for (let i = 0; i < N; i++) {
      dag.addNode(makeNode(`leaf-${i.toString().padStart(3, "0")}`, ["root"]));
    }

    // Each executeNode does a real ledger upsert + status update.
    // The 50 leaves all run at concurrency=8 — within each batch of 8,
    // they hit appendTaskUpsert simultaneously. The file lock must
    // serialize them so no row is lost and no line is interleaved.
    const executeNode = async (node: DagNode) => {
      appendTaskUpsert(projectDir, playbook, {
        id: node.id,
        goalId: "load",
        summary: `concurrent task ${node.id}`,
      });
      appendTaskStatus(projectDir, playbook, node.id, "done");
      return { success: true };
    };

    const start = Date.now();
    const { completed, failed } = await runDag(dag, executeNode, {
      concurrency: 8,
      maxIterations: 1000,
    });
    const elapsed = Date.now() - start;

    expect(failed).toBe(0);
    expect(completed).toBe(N + 1); // N leaves + 1 root

    // Sanity: budget is generous. 51 tasks each doing 2 file-locked
    // operations = 102 sync locks; 8-way concurrency. Under 30s is
    // a reasonable CI bound.
    expect(
      elapsed,
      `${N} leaves @ concurrency=8 took ${elapsed}ms`,
    ).toBeLessThan(30_000);

    // Verify ledger integrity: every leaf landed with status "done".
    const state = readRuntimeLedgerState(projectDir, playbook);
    const leafIds = state.tasks.filter((t) => t.id.startsWith("leaf-"));
    expect(leafIds).toHaveLength(N);
    for (const r of leafIds) {
      expect(r.status).toBe("done");
    }

    // Sanity: no malformed JSONL lines, no duplicates.
    const raw = readFileSync(runtimeTasksPath(projectDir, playbook), "utf-8");
    const lines = raw
      .trim()
      .split("\n")
      .filter((l) => l.length > 0);
    expect(lines.length).toBe(N + 1);
    const seen = new Set<string>();
    for (const line of lines) {
      // Each line must parse to a valid task object with a unique id.
      const obj = JSON.parse(line);
      expect(typeof obj.id).toBe("string");
      expect(seen.has(obj.id)).toBe(false);
      seen.add(obj.id);
    }
  }, 60_000);

  it("higher concurrency=16 across 100 leaves still consistent", async () => {
    const N = 100;
    const dag = new TaskDag();
    dag.addNode(makeNode("root"));
    for (let i = 0; i < N; i++) {
      dag.addNode(makeNode(`l-${i.toString().padStart(3, "0")}`, ["root"]));
    }
    const executeNode = async (node: DagNode) => {
      appendTaskUpsert(projectDir, playbook, {
        id: node.id,
        goalId: "load",
        summary: `task ${node.id}`,
      });
      return { success: true };
    };

    const { completed, failed } = await runDag(dag, executeNode, {
      concurrency: 16,
      maxIterations: 1000,
    });
    expect(failed).toBe(0);
    expect(completed).toBe(N + 1);

    const state = readRuntimeLedgerState(projectDir, playbook);
    expect(state.tasks).toHaveLength(N + 1);
    const ids = new Set(state.tasks.map((t) => t.id));
    expect(ids.size).toBe(N + 1); // no duplicates
  }, 60_000);
});
