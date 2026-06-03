/**
 * RFC 0049 — `TaskDag.childrenOf(id)` is the single source of truth for
 * hierarchy. The DAG is a pure projection of inventory rows: each node
 * carries a `parent` field, and `childrenOf(id)` returns the rows whose
 * `parent === id` (static-nested + runtime-spawned alike). The
 * polymorphic `node.children` reverse-edge list is gone.
 */
import { describe, it, expect } from "vitest";
import { TaskDag } from "../../../src/dag/task-dag";
import type { DagNode } from "../../../src/dag/dag-node";
import type { TaskDefinition } from "../../../src/config/task-definition";

function makeNode(
  id: string,
  opts: { parent?: string; depends_on?: string[] } = {},
): DagNode {
  const taskDef = {
    id,
    title: id,
    prompt: "",
    blocking: true,
  } as TaskDefinition;
  return {
    id,
    type: "normal",
    parent: opts.parent,
    parents: opts.parent ? [opts.parent] : [],
    children: [],
    depends_on: opts.depends_on ?? [],
    depended_on_by: [],
    taskDef,
    path: `/tasks/${id}/TASK.md`,
    status: "pending",
    virtual: false,
  };
}

describe("TaskDag.childrenOf — RFC 0049 Phase B (inventory hierarchy)", () => {
  it("returns [] for a node with no children", () => {
    const dag = new TaskDag();
    dag.addNode(makeNode("A"));
    expect(dag.childrenOf("A")).toEqual([]);
  });

  it("returns the inventory children of a node with `parent` set", () => {
    const dag = new TaskDag();
    dag.addNode(makeNode("A"));
    dag.addNode(makeNode("B", { parent: "A" }));
    dag.addNode(makeNode("C", { parent: "A" }));
    expect(dag.childrenOf("A")).toEqual(["B", "C"]);
  });

  it("preserves insertion order (matches inventory row order)", () => {
    const dag = new TaskDag();
    dag.addNode(makeNode("A"));
    dag.addNode(makeNode("01-first", { parent: "A" }));
    dag.addNode(makeNode("02-second", { parent: "A" }));
    dag.addNode(makeNode("03-third", { parent: "A" }));
    expect(dag.childrenOf("A")).toEqual(["01-first", "02-second", "03-third"]);
  });

  it("registerSpawnedChild is idempotent: adding the same child twice is a no-op", () => {
    // addNode throws on duplicates by design (you can't redefine a node);
    // registerSpawnedChild is the safe-to-call-twice path for runtime
    // spawns.
    const dag = new TaskDag();
    dag.addNode(makeNode("A"));
    dag.addNode(makeNode("B", { parent: "A" }));
    dag.registerSpawnedChild("A", "B");
    expect(dag.childrenOf("A")).toEqual(["B"]);
  });

  it("does NOT push reverse-edges into children (the conflation fix)", () => {
    // The old addNode() would push `B` into `A.children` because B depends
    // on A (a reverse-edge). Phase B eliminates that: children are
    // inventory-derived only. B is NOT A's child unless A is B's `parent`.
    const dag = new TaskDag();
    dag.addNode(makeNode("A"));
    dag.addNode(makeNode("B", { depends_on: ["A"] }));
    expect(dag.childrenOf("A")).toEqual([]);
    // B's `depended_on_by` (the DAG reverse-edge) is still populated, but
    // `childrenOf` is the inventory hierarchy only.
    const aNode = dag.nodes.get("A")!;
    expect(aNode.depended_on_by).toEqual(["B"]);
  });

  it("supports multi-level nesting: A → B → C", () => {
    const dag = new TaskDag();
    dag.addNode(makeNode("A"));
    dag.addNode(makeNode("B", { parent: "A" }));
    dag.addNode(makeNode("C", { parent: "B" }));
    expect(dag.childrenOf("A")).toEqual(["B"]);
    expect(dag.childrenOf("B")).toEqual(["C"]);
    expect(dag.childrenOf("C")).toEqual([]);
  });

  it("registerSpawnedChild wires a runtime-spawned child into the bucket", () => {
    // A seed task emits a spawn command at runtime; the spawned child
    // lands in the DAG mid-run. The legacy addNode() back-fill on
    // `parents` only worked when the child was added AFTER the parent;
    // runtime-spawned children break that ordering, so
    // registerSpawnedChild is the canonical wire-up.
    const dag = new TaskDag();
    dag.addNode(makeNode("seed"));
    dag.addNode(makeNode("spawned-A", { parent: "seed" }));
    dag.registerSpawnedChild("seed", "spawned-B");
    expect(dag.childrenOf("seed")).toEqual(["spawned-A", "spawned-B"]);
  });

  it("static-nested and runtime-spawned children follow the same rule", () => {
    // RFC 0049: one hierarchy, one completion rule. The DAG does not
    // distinguish "static" from "spawned" — both are just rows whose
    // `parent` is set.
    const dag = new TaskDag();
    dag.addNode(makeNode("A"));
    // Static-nested (from inventory `parent`)
    dag.addNode(makeNode("static-child", { parent: "A" }));
    // Runtime-spawned (from registerSpawnedChild)
    dag.addNode(makeNode("spawned-child"));
    dag.registerSpawnedChild("A", "spawned-child");
    expect(dag.childrenOf("A")).toEqual(["static-child", "spawned-child"]);
  });
});

describe("TaskDag.getReady — children block downstream dependents (Phase B)", () => {
  // The completion rule: a downstream dependent of a node with children
  // must wait until all children complete. Static-nested and
  // runtime-spawned children follow the same rule.
  //
  // Note: the child relationship is `parent` (hierarchy), but a child
  // task also has `depends_on: [parentId]` because the seeded completion
  // rule fires only when the child's `parent` is `seeded` — which is
  // exactly the same condition as "the dep passed". The seeded rule
  // therefore short-circuits a child's wait on its parent.
  it("downstream of a parent with children waits until children are done", () => {
    const dag = new TaskDag();
    dag.addNode(makeNode("A"));
    dag.addNode(makeNode("B", { parent: "A", depends_on: ["A"] }));
    dag.addNode(makeNode("C", { parent: "A", depends_on: ["A"] }));
    dag.addNode(makeNode("D", { depends_on: ["A"] }));

    // A starts.
    expect(
      dag
        .getReady()
        .map((n) => n.id)
        .sort(),
    ).toEqual(["A"]);

    // A is `seeded` (it has children) → its children B and C unblock
    // via the seeded rule. Downstream D is still blocked.
    dag.markSeeded("A");
    const ready1 = dag
      .getReady()
      .map((n) => n.id)
      .sort();
    expect(ready1).toContain("B");
    expect(ready1).toContain("C");
    expect(ready1).not.toContain("D");

    // B and C complete. A's children are all done. A goes to
    // `complete`; now D becomes ready.
    dag.markComplete("B");
    dag.markComplete("C");
    dag.markComplete("A");
    expect(
      dag
        .getReady()
        .map((n) => n.id)
        .sort(),
    ).toEqual(["D"]);
  });

  it("a 0-child parent satisfies its downstream dependents immediately on complete", () => {
    // The 0-child spawner fix: a node with no children goes `complete`
    // (not `seeded`), and its downstream dependents can run.
    const dag = new TaskDag();
    dag.addNode(makeNode("A"));
    dag.addNode(makeNode("B", { depends_on: ["A"] }));
    dag.addNode(makeNode("C", { depends_on: ["B"] }));

    expect(
      dag
        .getReady()
        .map((n) => n.id)
        .sort(),
    ).toEqual(["A"]);
    dag.markComplete("A");
    // A has no children → B is ready.
    expect(
      dag
        .getReady()
        .map((n) => n.id)
        .sort(),
    ).toEqual(["B"]);
    dag.markComplete("B");
    expect(
      dag
        .getReady()
        .map((n) => n.id)
        .sort(),
    ).toEqual(["C"]);
  });

  it("a `seeded` parent unblocks its inventory children but not downstream", () => {
    // "seeded" satisfies the dep for the parent's children (they need
    // the parent to have run). Downstream dependents are still blocked
    // until children complete.
    const dag = new TaskDag();
    dag.addNode(makeNode("A"));
    dag.addNode(makeNode("B", { parent: "A", depends_on: ["A"] }));
    dag.addNode(makeNode("downstream", { depends_on: ["A"] }));

    dag.markSeeded("A");
    const ready = dag
      .getReady()
      .map((n) => n.id)
      .sort();
    expect(ready).toContain("B"); // child
    expect(ready).not.toContain("downstream"); // still blocked

    // B completes → downstream is now ready (A is `seeded`, all
    // children of A are done).
    dag.markComplete("B");
    expect(
      dag
        .getReady()
        .map((n) => n.id)
        .sort(),
    ).toEqual(["downstream"]);
  });

  it("runtime-spawned children block downstream the same way static children do", () => {
    const dag = new TaskDag();
    dag.addNode(makeNode("seed"));
    dag.addNode(
      makeNode("spawned-1", { parent: "seed", depends_on: ["seed"] }),
    );
    dag.registerSpawnedChild("seed", "spawned-1");
    dag.addNode(makeNode("downstream", { depends_on: ["seed"] }));

    dag.markSeeded("seed");
    expect(
      dag
        .getReady()
        .map((n) => n.id)
        .sort(),
    ).toEqual(["spawned-1"]);

    dag.markComplete("spawned-1");
    expect(
      dag
        .getReady()
        .map((n) => n.id)
        .sort(),
    ).toEqual(["downstream"]);
  });
});
