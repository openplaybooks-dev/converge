/**
 * Regression test for RFC 0020: container convergence detection.
 *
 * When a seeded parent's children are all complete, the parent must be
 * marked `complete` exactly once. Prior behaviour re-queued the parent to
 * `pending` for an "assembly" pass, which the seed-preflight then
 * short-circuited back to `seeded`, producing an infinite re-lease loop
 * (observed 9000+ attempts in a real baby-app run).
 *
 * These tests exercise the extracted convergence helper directly to lock
 * the invariant in: a single convergence step transitions the parent to
 * `complete`; running it again is idempotent.
 */
import { describe, it, expect } from "vitest";
import type { DagNode, DagNodeStatus } from "../../src/dag/dag-node.ts";
import type { TaskDefinition } from "../../src/config/task-definition.ts";
import { TaskDag } from "../../src/dag/task-dag.ts";
import { convergeSeededParents } from "../../src/run/converge-seeded-parents.ts";

function makeTaskDef(overrides?: Partial<TaskDefinition>): TaskDefinition {
  return { id: "test-task", ...overrides } as TaskDefinition;
}

function makeNode(overrides: Partial<DagNode> & { id: string; status?: DagNodeStatus }): DagNode {
  return {
    id: overrides.id,
    type: "normal",
    parents: [],
    children: [],
    depends_on: [],
    depended_on_by: [],
    taskDef: makeTaskDef({ id: overrides.id }),
    path: `/test/${overrides.id}.md`,
    status: overrides.status ?? "pending",
    virtual: false,
    ...overrides,
  };
}

describe("convergeSeededParents (RFC 0020)", () => {
  it("marks a seeded parent complete when its one spawned child is complete", async () => {
    const dag = new TaskDag();
    dag.addNode(makeNode({ id: "parent", status: "seeded", spawned_children: ["child"] }));
    dag.addNode(makeNode({ id: "child", status: "complete", parents: ["parent"] }));

    const converged = await convergeSeededParents(dag);

    expect(converged).toEqual(["parent"]);
    expect(dag.nodes.get("parent")!.status).toBe("complete");
  });

  it("treats `pass` children as done (parity with `complete`)", async () => {
    const dag = new TaskDag();
    dag.addNode(makeNode({ id: "parent", status: "seeded", spawned_children: ["c"] }));
    dag.addNode(makeNode({ id: "c", status: "pass", parents: ["parent"] }));

    expect(await convergeSeededParents(dag)).toEqual(["parent"]);
    expect(dag.nodes.get("parent")!.status).toBe("complete");
  });

  it("leaves the parent seeded while any child is still pending", async () => {
    const dag = new TaskDag();
    dag.addNode(makeNode({ id: "parent", status: "seeded", spawned_children: ["a", "b"] }));
    dag.addNode(makeNode({ id: "a", status: "complete", parents: ["parent"] }));
    dag.addNode(makeNode({ id: "b", status: "pending", parents: ["parent"] }));

    expect(await convergeSeededParents(dag)).toEqual([]);
    expect(dag.nodes.get("parent")!.status).toBe("seeded");
  });

  it("leaves the parent seeded if any child failed", async () => {
    const dag = new TaskDag();
    dag.addNode(makeNode({ id: "parent", status: "seeded", spawned_children: ["a"] }));
    dag.addNode(makeNode({ id: "a", status: "failed", parents: ["parent"] }));

    expect(await convergeSeededParents(dag)).toEqual([]);
    expect(dag.nodes.get("parent")!.status).toBe("seeded");
  });

  it("skips a seeded node with zero children (defensive — should not happen, must not throw)", async () => {
    const dag = new TaskDag();
    dag.addNode(makeNode({ id: "lonely", status: "seeded" }));

    expect(await convergeSeededParents(dag)).toEqual([]);
    expect(dag.nodes.get("lonely")!.status).toBe("seeded");
  });

  it("is idempotent: running twice on a converged DAG does not re-fire", async () => {
    const dag = new TaskDag();
    dag.addNode(makeNode({ id: "parent", status: "seeded", spawned_children: ["c"] }));
    dag.addNode(makeNode({ id: "c", status: "complete", parents: ["parent"] }));

    expect(await convergeSeededParents(dag)).toEqual(["parent"]);
    expect(await convergeSeededParents(dag)).toEqual([]);
    expect(dag.nodes.get("parent")!.status).toBe("complete");
  });

  it("converges only the seeded parents whose children are all done", async () => {
    const dag = new TaskDag();
    dag.addNode(makeNode({ id: "p1", status: "seeded", spawned_children: ["p1c"] }));
    dag.addNode(makeNode({ id: "p1c", status: "complete", parents: ["p1"] }));
    dag.addNode(makeNode({ id: "p2", status: "seeded", spawned_children: ["p2c"] }));
    dag.addNode(makeNode({ id: "p2c", status: "pending", parents: ["p2"] }));

    expect((await convergeSeededParents(dag)).sort()).toEqual(["p1"]);
    expect(dag.nodes.get("p1")!.status).toBe("complete");
    expect(dag.nodes.get("p2")!.status).toBe("seeded");
  });

  it("invokes onConverge for each newly-converged parent (resultsMgr hook)", async () => {
    const dag = new TaskDag();
    dag.addNode(makeNode({ id: "parent", status: "seeded", spawned_children: ["c"] }));
    dag.addNode(makeNode({ id: "c", status: "complete", parents: ["parent"] }));

    const seen: string[] = [];
    const converged = await convergeSeededParents(dag, {
      onConverge: async (id) => { seen.push(id); },
    });

    expect(converged).toEqual(["parent"]);
    expect(seen).toEqual(["parent"]);
  });

  it("recognises children listed only on `children` (static children, no spawn)", async () => {
    // Belt-and-suspenders: the live runner unions spawned_children with the
    // legacy `children` field. Keep that union behaviour locked in.
    const dag = new TaskDag();
    dag.addNode(makeNode({ id: "parent", status: "seeded", children: ["c"] }));
    dag.addNode(makeNode({ id: "c", status: "complete" }));

    expect(await convergeSeededParents(dag)).toEqual(["parent"]);
    expect(dag.nodes.get("parent")!.status).toBe("complete");
  });
});
