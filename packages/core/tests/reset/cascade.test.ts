/**
 * RFC 0013 — Surgical reset cascade tests.
 */
import { describe, it, expect } from "vitest";
import { TaskDag } from "../../src/dag/task-dag.ts";
import type { DagNode } from "../../src/dag/dag-node.ts";
import type { TaskDefinition } from "../../src/config/task-definition.ts";
import { computeResetPlan, formatResetPlan } from "../../src/reset/cascade.ts";

function n(o: Partial<DagNode> & { id: string }): DagNode {
  return {
    id: o.id,
    type: "normal",
    parents: [],
    children: [],
    depends_on: [],
    depended_on_by: [],
    taskDef: { id: o.id } as TaskDefinition,
    path: `/${o.id}.md`,
    status: "pending",
    virtual: false,
    ...o,
  };
}

function dagWith(edges: Record<string, { dependedOnBy?: string[]; spawned?: string[] }>) {
  const dag = new TaskDag();
  for (const id of Object.keys(edges)) dag.addNode(n({ id }));
  // Set edges after all nodes are present.
  for (const [id, e] of Object.entries(edges)) {
    const node = dag.nodes.get(id)!;
    if (e.dependedOnBy) node.depended_on_by = e.dependedOnBy;
    if (e.spawned) node.spawned_children = e.spawned;
  }
  return dag;
}

describe("computeResetPlan", () => {
  it("cascade with no descendants → clears only the target", () => {
    const dag = dagWith({ a: {} });
    const plan = computeResetPlan(dag, "a", "cascade");
    expect(plan).toEqual({ mode: "cascade", toClear: ["a"], toMarkStale: [] });
  });

  it("cascade follows static downstream edges (depended_on_by)", () => {
    const dag = dagWith({
      a: { dependedOnBy: ["b", "c"] },
      b: { dependedOnBy: ["d"] },
      c: {},
      d: {},
    });
    const plan = computeResetPlan(dag, "a", "cascade");
    expect(plan.toClear).toEqual(["a", "b", "c", "d"]);
    expect(plan.toMarkStale).toEqual([]);
  });

  it("cascade follows spawned-children edges", () => {
    const dag = dagWith({
      parent: { spawned: ["child1", "child2"] },
      child1: { spawned: ["grand1"] },
      child2: {},
      grand1: {},
    });
    const plan = computeResetPlan(dag, "parent", "cascade");
    expect(plan.toClear).toEqual(["parent", "child1", "child2", "grand1"]);
  });

  it("cascade visits the union of static + spawn descendants without duplicates", () => {
    const dag = dagWith({
      parent: { dependedOnBy: ["downstream"], spawned: ["spawned"] },
      downstream: { dependedOnBy: ["spawned"] }, // also reaches `spawned`
      spawned: {},
    });
    const plan = computeResetPlan(dag, "parent", "cascade");
    expect(plan.toClear.sort()).toEqual(["downstream", "parent", "spawned"]);
  });

  it("isolated clears only the target and marks descendants stale", () => {
    const dag = dagWith({
      a: { dependedOnBy: ["b"], spawned: ["sc"] },
      b: {},
      sc: {},
    });
    const plan = computeResetPlan(dag, "a", "isolated");
    expect(plan.toClear).toEqual(["a"]);
    expect(plan.toMarkStale.sort()).toEqual(["b", "sc"]);
  });

  it("throws on unknown task id", () => {
    const dag = dagWith({ a: {} });
    expect(() => computeResetPlan(dag, "ghost", "cascade")).toThrow(/not found/);
  });

  it("handles a cycle in spawned_children without infinite-looping", () => {
    // Pathological — shouldn't happen, but be safe.
    const dag = dagWith({
      a: { spawned: ["b"] },
      b: { spawned: ["a"] },
    });
    const plan = computeResetPlan(dag, "a", "cascade");
    expect(plan.toClear.sort()).toEqual(["a", "b"]);
  });
});

describe("formatResetPlan", () => {
  it("renders cascade plan with each task on its own line", () => {
    const dag = dagWith({ a: { dependedOnBy: ["b"] }, b: {} });
    const plan = computeResetPlan(dag, "a", "cascade");
    const out = formatResetPlan(plan);
    expect(out).toContain("Reset mode: cascade");
    expect(out).toContain("Would clear 2 tasks");
    expect(out).toContain("- a");
    expect(out).toContain("- b");
  });

  it("renders isolated plan with stale-input section", () => {
    const dag = dagWith({ a: { dependedOnBy: ["b"] }, b: {} });
    const plan = computeResetPlan(dag, "a", "isolated");
    const out = formatResetPlan(plan);
    expect(out).toContain("Reset mode: isolated");
    expect(out).toContain("Would clear 1 task");
    expect(out).toContain("Mark stale-input (1)");
  });
});
