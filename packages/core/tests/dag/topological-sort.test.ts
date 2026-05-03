import { describe, it, expect } from "vitest";
import type { DagNode } from "../../src/dag/dag-node.ts";
import type { TaskDefinition } from "../../src/config/task-definition.ts";
import { topologicalSort, detectCycle } from "../../src/dag/topological-sort.ts";

function makeNode(id: string, depends_on: string[] = []): DagNode {
  return {
    id,
    parents: [],
    children: [],
    depends_on,
    depended_on_by: [],
    taskDef: { id, title: id, description: '', body: '', checks: [] } as TaskDefinition,
    path: `/tasks/${id}/TASK.md`,
    status: 'pending',
    virtual: false,
  };
}

describe("topologicalSort", () => {
  it("Linear A→B→C: three layers", () => {
    const A = makeNode("A");
    const B = makeNode("B", ["A"]);
    const C = makeNode("C", ["B"]);
    const byId = new Map([A, B, C].map(n => [n.id, n]));

    const result = topologicalSort(byId);
    expect(result).toEqual([["A"], ["B"], ["C"]]);
  });

  it("Diamond A→[B,C]→D: B and C in same layer", () => {
    const A = makeNode("A");
    const B = makeNode("B", ["A"]);
    const C = makeNode("C", ["A"]);
    const D = makeNode("D", ["B", "C"]);
    const byId = new Map([A, B, C, D].map(n => [n.id, n]));

    const result = topologicalSort(byId);
    expect(result).toEqual([["A"], ["B", "C"], ["D"]]);
  });

  it("Empty DAG returns []", () => {
    const byId = new Map<string, DagNode>();
    expect(topologicalSort(byId)).toEqual([]);
  });

  it("Single node with no edges returns [[node]]", () => {
    const A = makeNode("A");
    const byId = new Map([[A.id, A]]);

    expect(topologicalSort(byId)).toEqual([["A"]]);
  });

  it("Disconnected sub-graphs A→B and C→D sort correctly", () => {
    const A = makeNode("A");
    const B = makeNode("B", ["A"]);
    const C = makeNode("C");
    const D = makeNode("D", ["C"]);
    const byId = new Map([A, B, C, D].map(n => [n.id, n]));

    const result = topologicalSort(byId);
    // A and C both in layer 0; B and D both in layer 1
    expect(result.length).toBe(2);
    expect(result[0]).toContain("A");
    expect(result[0]).toContain("C");
    expect(result[1]).toContain("B");
    expect(result[1]).toContain("D");
  });

  it("Multi-layer chain A→B→C→D→E produces 5 layers", () => {
    const A = makeNode("A");
    const B = makeNode("B", ["A"]);
    const C = makeNode("C", ["B"]);
    const D = makeNode("D", ["C"]);
    const E = makeNode("E", ["D"]);
    const byId = new Map([A, B, C, D, E].map(n => [n.id, n]));

    const result = topologicalSort(byId);
    expect(result).toEqual([["A"], ["B"], ["C"], ["D"], ["E"]]);
  });

  it("Cycle A→B→C→A throws with cycle error", () => {
    const A = makeNode("A", ["C"]);
    const B = makeNode("B", ["A"]);
    const C = makeNode("C", ["B"]);
    const byId = new Map([A, B, C].map(n => [n.id, n]));

    expect(() => topologicalSort(byId)).toThrow(/cycle/i);
  });
});

describe("detectCycle", () => {
  it("Acyclic returns null", () => {
    const A = makeNode("A");
    const B = makeNode("B", ["A"]);
    const C = makeNode("C", ["A"]);
    const D = makeNode("D", ["B", "C"]);
    const byId = new Map([A, B, C, D].map(n => [n.id, n]));

    expect(detectCycle(byId)).toBeNull();
  });

  it("Cycle returns path A→B→C→A", () => {
    const A = makeNode("A", ["C"]);
    const B = makeNode("B", ["A"]);
    const C = makeNode("C", ["B"]);
    const byId = new Map([A, B, C].map(n => [n.id, n]));

    const cycle = detectCycle(byId);
    expect(cycle).not.toBeNull();
    expect(cycle![0]).toBe("A");
    expect(cycle![cycle!.length - 1]).toBe("A");
  });

  it("Self-loop: A depends_on [A] is detected", () => {
    const A = makeNode("A", ["A"]);
    const byId = new Map([[A.id, A]]);

    const cycle = detectCycle(byId);
    expect(cycle).not.toBeNull();
    expect(cycle).toEqual(["A", "A"]);
  });
});
