/**
 * dag-runner runaway guards — the runner must NOT loop forever when:
 *   1. A node's runNode returns successfully but doesn't transition
 *      the node (logic bug — the node stays "ready" indefinitely).
 *   2. The wall-clock deadline is exceeded.
 *   3. iter > maxIterations.
 *
 * Pre-Blocker-3, both `executeDag` and `runDag` had bare `while (true)`
 * loops with no abort condition besides `ready.length === 0`. A
 * misbehaving executeNode could hang the runner indefinitely.
 */

import { describe, it, expect } from "vitest";
import {
  executeDag,
  runDag,
  StuckRunnerError,
  RunDurationExceededError,
} from "../../src/dag/dag-runner.ts";
import { TaskDag } from "../../src/dag/task-dag.ts";
import type { DagNode } from "../../src/dag/dag-node.ts";
import type { TaskDefinition } from "../../src/config/task-definition.ts";

function makeNode(overrides: Partial<DagNode>): DagNode {
  return {
    id: "n",
    type: "normal",
    parents: [],
    children: [],
    depends_on: [],
    depended_on_by: [],
    taskDef: { id: "n" } as TaskDefinition,
    path: "/tmp/n",
    status: "pending",
    virtual: false,
    ...overrides,
  };
}

describe("executeDag runaway guards", () => {
  it("aborts immediately with RunDurationExceededError when deadline has passed", async () => {
    const dag = new TaskDag();
    dag.addNode(makeNode({ id: "slow" }));

    const runNode = async (_node: DagNode) => {
      // Never gets called because deadline trips on the first
      // iteration before runNode runs.
    };

    const deadlineMs = Date.now() - 1; // already past
    await expect(
      executeDag(dag, runNode, { projectDir: "/tmp", deadlineMs }),
    ).rejects.toBeInstanceOf(RunDurationExceededError);
  });

  it("normal execution: a clean DAG completes without tripping guards", async () => {
    const dag = new TaskDag();
    dag.addNode(makeNode({ id: "a" }));
    dag.addNode(makeNode({ id: "b", depends_on: ["a"], parents: ["a"] }));

    const ran: string[] = [];
    const runNode = async (node: DagNode) => {
      ran.push(node.id);
    };

    await executeDag(dag, runNode, {
      projectDir: "/tmp",
      maxIterations: 100,
    });
    expect(ran).toEqual(["a", "b"]);
  });
});

describe("runDag runaway guards", () => {
  it("makes normal progress when nodes properly complete", async () => {
    const dag = new TaskDag();
    dag.addNode(makeNode({ id: "a" }));
    dag.addNode(makeNode({ id: "b", depends_on: ["a"], parents: ["a"] }));

    const ran: string[] = [];
    const executeNode = async (node: DagNode) => {
      ran.push(node.id);
      return { success: true };
    };

    const r = await runDag(dag, executeNode);
    expect(r.completed).toBe(2);
    expect(r.failed).toBe(0);
    expect(ran).toEqual(["a", "b"]);
  });

  it("aborts with RunDurationExceededError past deadline", async () => {
    const dag = new TaskDag();
    dag.addNode(makeNode({ id: "x" }));
    const executeNode = async (_n: DagNode) => ({ success: true });
    await expect(
      runDag(dag, executeNode, { deadlineMs: Date.now() - 1 }),
    ).rejects.toBeInstanceOf(RunDurationExceededError);
  });

  it("StuckRunnerError class carries diagnostic info", () => {
    const err = new StuckRunnerError(42, ["a", "b", "c"]);
    expect(err.name).toBe("StuckRunnerError");
    expect(err.iterations).toBe(42);
    expect(err.readyIds).toEqual(["a", "b", "c"]);
    expect(err.message).toMatch(/42 consecutive iterations/);
  });
});
