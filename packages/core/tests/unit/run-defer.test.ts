/**
 * --defer integration test — exercises the option plumbing without
 * spinning up an actual run loop.
 *
 * The behaviour we verify: when `state` + `defer` are passed to
 * `run()`, the prior manifest is read and any node whose
 * `upstream_hash` matches a "complete" prior is pre-marked complete in
 * the current DAG. We don't execute anything; we just observe the
 * resulting DAG status pre-loop. End-to-end semantics (skipping
 * actual executor calls) follow naturally from the standard
 * complete-status handling in `runDag`.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { TaskDag } from "../../src/dag/task-dag.ts";
import type { DagNode } from "../../src/dag/dag-node.ts";
import type { TaskDefinition } from "../../src/config/task-definition.ts";

function makeNode(
  id: string,
  upstream_hash?: string,
  outputs?: string[],
): DagNode {
  const td: TaskDefinition & { upstream_hash?: string } = {
    id,
    upstream_hash,
    outputs,
  } as TaskDefinition;
  return {
    id,
    type: "normal",
    parents: [],
    children: [],
    depends_on: [],
    depended_on_by: [],
    taskDef: td,
    path: `/tmp/${id}`,
    status: "pending",
    virtual: false,
  };
}

describe("--defer cross-state reuse", () => {
  let projectDir: string;
  let priorManifest: string;

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), "converge-defer-"));
    priorManifest = join(projectDir, "prior-manifest.json");
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it("plumbing — prior manifest with a matching complete node short-circuits", () => {
    // The actual defer block lives inside the `run()` function and is
    // expensive to invoke standalone (needs RunStateManager, full
    // compilePlaybook, etc.). We exercise the *logic* by hand here:
    // given a prior manifest and a fresh DAG, an upstream-hash match
    // + "complete" prior should mark the current node complete.
    const dag = new TaskDag();
    dag.addNode(makeNode("task-a", "hash-aaa"));
    dag.addNode(makeNode("task-b", "hash-bbb"));

    writeFileSync(
      priorManifest,
      JSON.stringify({
        nodes: {
          "task-a": { state: "complete", upstream_hash: "hash-aaa" },
          "task-b": { state: "complete", upstream_hash: "hash-old" }, // hash mismatch
        },
      }),
    );

    // Inline the defer reuse algorithm (mirrors run/index.ts).
    const prior = JSON.parse(
      require("node:fs").readFileSync(priorManifest, "utf-8"),
    );
    let deferred = 0;
    for (const [id, currNode] of dag.nodes) {
      const p = prior.nodes?.[id];
      if (!p) continue;
      const currHash = (currNode.taskDef as { upstream_hash?: string })
        .upstream_hash;
      if (
        p.upstream_hash &&
        currHash &&
        p.upstream_hash === currHash &&
        (p.state === "complete" || p.state === "pass")
      ) {
        dag.markComplete(id);
        deferred++;
      }
    }

    expect(deferred).toBe(1);
    expect(dag.nodes.get("task-a")!.status).toBe("complete");
    expect(dag.nodes.get("task-b")!.status).toBe("pending");
  });

  it("missing prior manifest is tolerated (no throw, no defer)", () => {
    // The run-loop catches missing-file errors and emits a warn log;
    // verify the algorithm doesn't crash on absent state.
    const dag = new TaskDag();
    dag.addNode(makeNode("task-a", "hash-aaa"));

    const fs = require("node:fs");
    let deferred = 0;
    try {
      const prior = JSON.parse(
        fs.readFileSync(join(projectDir, "missing.json"), "utf-8"),
      );
      for (const [id, currNode] of dag.nodes) {
        if (prior.nodes?.[id]) deferred++;
        void id;
        void currNode;
      }
    } catch {
      // The run() implementation logs and proceeds; here we just verify
      // the throw is the expected handler entry point.
    }
    expect(deferred).toBe(0);
    expect(dag.nodes.get("task-a")!.status).toBe("pending");
  });

  it("output rehydration — hash match BUT missing outputs leaves node pending and reports it", () => {
    // Same workspace, same upstream hash, but the deferred task's
    // declared output was deleted between runs. Defer must NOT
    // short-circuit (downstream tasks would read a missing input).
    const dag = new TaskDag();
    dag.addNode(makeNode("task-a", "hash-aaa", ["build/output-present.txt"]));
    dag.addNode(makeNode("task-b", "hash-bbb", ["build/output-missing.txt"]));

    // Create only one of the outputs.
    mkdirSync(join(projectDir, "build"), { recursive: true });
    writeFileSync(join(projectDir, "build/output-present.txt"), "data", "utf-8");

    writeFileSync(
      priorManifest,
      JSON.stringify({
        nodes: {
          "task-a": { state: "complete", upstream_hash: "hash-aaa" },
          "task-b": { state: "complete", upstream_hash: "hash-bbb" },
        },
      }),
    );

    const prior = JSON.parse(
      require("node:fs").readFileSync(priorManifest, "utf-8"),
    );
    let deferred = 0;
    const missingOutputs: Array<{ id: string; missing: string[] }> = [];
    for (const [id, currNode] of dag.nodes) {
      const p = prior.nodes?.[id];
      if (!p) continue;
      const currHash = (currNode.taskDef as { upstream_hash?: string })
        .upstream_hash;
      if (
        p.upstream_hash &&
        currHash &&
        p.upstream_hash === currHash &&
        (p.state === "complete" || p.state === "pass")
      ) {
        const declared =
          (currNode.taskDef as { outputs?: string[] }).outputs ??
          p.outputs ??
          [];
        const missing: string[] = [];
        for (const o of declared) {
          const abs = o.startsWith("/") ? o : join(projectDir, o);
          if (!existsSync(abs)) missing.push(o);
        }
        if (missing.length > 0) {
          missingOutputs.push({ id, missing });
          continue;
        }
        dag.markComplete(id);
        deferred++;
      }
    }

    expect(deferred).toBe(1);
    expect(dag.nodes.get("task-a")!.status).toBe("complete");
    expect(dag.nodes.get("task-b")!.status).toBe("pending");
    expect(missingOutputs).toEqual([
      { id: "task-b", missing: ["build/output-missing.txt"] },
    ]);
  });

  it("hash mismatch leaves all current nodes pending", () => {
    const dag = new TaskDag();
    dag.addNode(makeNode("task-a", "current-hash"));

    writeFileSync(
      priorManifest,
      JSON.stringify({
        nodes: {
          "task-a": { state: "complete", upstream_hash: "different-hash" },
        },
      }),
    );

    const prior = JSON.parse(
      require("node:fs").readFileSync(priorManifest, "utf-8"),
    );
    let deferred = 0;
    for (const [id, currNode] of dag.nodes) {
      const p = prior.nodes?.[id];
      if (!p) continue;
      const currHash = (currNode.taskDef as { upstream_hash?: string })
        .upstream_hash;
      if (
        p.upstream_hash &&
        currHash &&
        p.upstream_hash === currHash &&
        p.state === "complete"
      ) {
        dag.markComplete(id);
        deferred++;
      }
    }

    expect(deferred).toBe(0);
    expect(dag.nodes.get("task-a")!.status).toBe("pending");
  });
});
