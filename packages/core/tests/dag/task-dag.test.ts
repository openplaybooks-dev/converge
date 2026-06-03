import { describe, it, expect } from "vitest";
import type { DagNode } from "../../src/dag/dag-node.ts";
import { TaskDag } from "../../src/dag/task-dag.ts";

function makeTaskDef(
  overrides?: Partial<
    import("../../src/config/task-definition.ts").TaskDefinition
  >,
) {
  return {
    id: "test-task",
    ...overrides,
  } as import("../../src/config/task-definition.ts").TaskDefinition;
}

function makeNode(overrides?: Partial<DagNode>): DagNode {
  return {
    id: "test-node",
    parents: [],
    children: [],
    depends_on: [],
    depended_on_by: [],
    taskDef: makeTaskDef(),
    path: "/test/path.md",
    status: "pending",
    virtual: false,
    ...overrides,
  };
}

describe("TaskDag", () => {
  describe("empty DAG", () => {
    it("has no nodes and empty roots", () => {
      const dag = new TaskDag();
      expect(dag.nodes.size).toBe(0);
      expect(dag.roots).toEqual([]);
    });

    it("getReady returns empty array", () => {
      const dag = new TaskDag();
      expect(dag.getReady()).toEqual([]);
    });

    it("topologicalOrder returns empty array", () => {
      const dag = new TaskDag();
      expect(dag.topologicalOrder()).toEqual([]);
    });

    it("toManifest produces a valid empty manifest", () => {
      const dag = new TaskDag();
      const m = dag.toManifest();
      expect(m.nodes).toEqual({});
      expect(m.child_map).toEqual({});
      expect(m.parent_map).toEqual({});
      expect(m.metadata).toBeDefined();
    });
  });

  describe("addNode", () => {
    it("adds a node to the DAG", () => {
      const dag = new TaskDag();
      const node = makeNode({ id: "a" });
      dag.addNode(node);
      expect(dag.nodes.has("a")).toBe(true);
      expect(dag.nodes.get("a")).toBe(node);
    });

    it("adds a node with no parents as a root", () => {
      const dag = new TaskDag();
      dag.addNode(makeNode({ id: "a", parents: [] }));
      expect(dag.roots.map((n) => n.id)).toEqual(["a"]);
    });

    it("does not add a node with parents as a root", () => {
      const dag = new TaskDag();
      dag.addNode(makeNode({ id: "a", parents: [] }));
      dag.addNode(makeNode({ id: "b", parents: ["a"] }));
      expect(dag.roots.map((n) => n.id)).toEqual(["a"]);
    });

    it("rejects duplicate id", () => {
      const dag = new TaskDag();
      dag.addNode(makeNode({ id: "a" }));
      expect(() => dag.addNode(makeNode({ id: "a" }))).toThrow(/duplicate/i);
    });

    it("recomputes reverse edges when adding child references", () => {
      const dag = new TaskDag();
      dag.addNode(makeNode({ id: "parent", children: ["child"] }));
      dag.addNode(makeNode({ id: "child", parents: ["parent"] }));
      const child = dag.nodes.get("child")!;
      expect(child.parents).toContain("parent");
      const parent = dag.nodes.get("parent")!;
      expect(parent.children).toContain("child");
    });
  });

  describe("getReady", () => {
    it("returns nodes with no depends_on", () => {
      const dag = new TaskDag();
      dag.addNode(makeNode({ id: "a", depends_on: [] }));
      dag.addNode(makeNode({ id: "b", depends_on: ["a"] }));
      const ready = dag.getReady().map((n) => n.id);
      expect(ready).toEqual(["a"]);
    });

    it("returns nodes whose depends_on are all complete", () => {
      const dag = new TaskDag();
      dag.addNode(makeNode({ id: "a", depends_on: [], status: "complete" }));
      dag.addNode(makeNode({ id: "b", depends_on: ["a"] }));
      const ready = dag.getReady().map((n) => n.id);
      expect(ready).toContain("b");
    });

    it("does not return nodes whose depends_on are not all complete", () => {
      const dag = new TaskDag();
      dag.addNode(makeNode({ id: "a", depends_on: [], status: "pending" }));
      dag.addNode(makeNode({ id: "b", depends_on: ["a"] }));
      const ready = dag.getReady().map((n) => n.id);
      expect(ready).not.toContain("b");
    });

    it("does not return already-running nodes", () => {
      const dag = new TaskDag();
      dag.addNode(makeNode({ id: "a", depends_on: [], status: "running" }));
      expect(dag.getReady()).toEqual([]);
    });

    it("does not return already-complete nodes", () => {
      const dag = new TaskDag();
      dag.addNode(makeNode({ id: "a", depends_on: [], status: "complete" }));
      expect(dag.getReady()).toEqual([]);
    });

    it("does not return failed nodes", () => {
      const dag = new TaskDag();
      dag.addNode(makeNode({ id: "a", depends_on: [], status: "failed" }));
      expect(dag.getReady()).toEqual([]);
    });
  });

  describe("markComplete / markFailed", () => {
    it("markComplete sets node status to complete", () => {
      const dag = new TaskDag();
      dag.addNode(makeNode({ id: "a" }));
      dag.markComplete("a");
      expect(dag.nodes.get("a")!.status).toBe("complete");
    });

    it("markFailed sets node status to failed", () => {
      const dag = new TaskDag();
      dag.addNode(makeNode({ id: "a" }));
      dag.markFailed("a");
      expect(dag.nodes.get("a")!.status).toBe("failed");
    });

    it("throws for unknown id", () => {
      const dag = new TaskDag();
      expect(() => dag.markComplete("nonexistent")).toThrow();
      expect(() => dag.markFailed("nonexistent")).toThrow();
    });
  });

  describe("getDownstream / getUpstream", () => {
    it("getDownstream returns nodes that depend on the given id", () => {
      const dag = new TaskDag();
      dag.addNode(makeNode({ id: "a" }));
      dag.addNode(makeNode({ id: "b", depends_on: ["a"] }));
      dag.addNode(makeNode({ id: "c", depends_on: ["a"] }));
      const downstream = dag.getDownstream("a").map((n) => n.id);
      expect(downstream).toEqual(expect.arrayContaining(["b", "c"]));
      expect(downstream.length).toBe(2);
    });

    it("getUpstream returns nodes the given id depends on", () => {
      const dag = new TaskDag();
      dag.addNode(makeNode({ id: "a" }));
      dag.addNode(makeNode({ id: "b" }));
      dag.addNode(makeNode({ id: "c", depends_on: ["a", "b"] }));
      const upstream = dag.getUpstream("c").map((n) => n.id);
      expect(upstream).toEqual(expect.arrayContaining(["a", "b"]));
      expect(upstream.length).toBe(2);
    });

    it("getDownstream returns empty for leaf node", () => {
      const dag = new TaskDag();
      dag.addNode(makeNode({ id: "a" }));
      expect(dag.getDownstream("a")).toEqual([]);
    });

    it("getUpstream returns empty for root node", () => {
      const dag = new TaskDag();
      dag.addNode(makeNode({ id: "a", depends_on: [] }));
      expect(dag.getUpstream("a")).toEqual([]);
    });

    it("throws for unknown id", () => {
      const dag = new TaskDag();
      expect(() => dag.getDownstream("nope")).toThrow();
      expect(() => dag.getUpstream("nope")).toThrow();
    });
  });

  describe("topologicalOrder", () => {
    it("returns layers for a linear DAG", () => {
      const dag = new TaskDag();
      dag.addNode(makeNode({ id: "a", depends_on: [] }));
      dag.addNode(makeNode({ id: "b", depends_on: ["a"] }));
      dag.addNode(makeNode({ id: "c", depends_on: ["b"] }));
      const order = dag.topologicalOrder();
      expect(order.length).toBe(3);
      expect(order[0].map((n) => n.id)).toEqual(["a"]);
      expect(order[1].map((n) => n.id)).toEqual(["b"]);
      expect(order[2].map((n) => n.id)).toEqual(["c"]);
    });

    it("returns parallel nodes in the same layer", () => {
      const dag = new TaskDag();
      dag.addNode(makeNode({ id: "a", depends_on: [] }));
      dag.addNode(makeNode({ id: "b", depends_on: ["a"] }));
      dag.addNode(makeNode({ id: "c", depends_on: ["a"] }));
      const order = dag.topologicalOrder();
      expect(order.length).toBe(2);
      expect(order[0].map((n) => n.id)).toEqual(["a"]);
      expect(order[1].map((n) => n.id)).toEqual(
        expect.arrayContaining(["b", "c"]),
      );
      expect(order[1].length).toBe(2);
    });
  });

  describe("toManifest / fromManifest round-trip", () => {
    it("round-trips nodes with edges", () => {
      const dag = new TaskDag();
      dag.addNode(
        makeNode({
          id: "a",
          parents: [],
          children: ["b"],
          depends_on: [],
          depended_on_by: ["b"],
          path: "/tasks/a.md",
        }),
      );
      dag.addNode(
        makeNode({
          id: "b",
          parents: ["a"],
          children: [],
          depends_on: ["a"],
          depended_on_by: [],
          path: "/tasks/b.md",
        }),
      );

      const manifest = dag.toManifest();
      const restored = TaskDag.fromManifest(manifest);

      expect(restored.nodes.size).toBe(2);
      expect(restored.nodes.get("a")!.id).toBe("a");
      expect(restored.nodes.get("b")!.id).toBe("b");
      expect(restored.nodes.get("b")!.depends_on).toEqual(["a"]);
      expect(restored.nodes.get("a")!.depended_on_by).toEqual(["b"]);
    });

    it("preserves parent/child edges via parent_map and child_map", () => {
      const dag = new TaskDag();
      dag.addNode(makeNode({ id: "parent", children: ["child"] }));
      dag.addNode(makeNode({ id: "child", parents: ["parent"] }));

      const manifest = dag.toManifest();
      expect(manifest.child_map["parent"]).toEqual(["child"]);
      expect(manifest.parent_map["child"]).toEqual(["parent"]);

      const restored = TaskDag.fromManifest(manifest);
      expect(restored.nodes.get("parent")!.children).toContain("child");
      expect(restored.nodes.get("child")!.parents).toContain("parent");
    });

    it("returns empty DAG from empty manifest", () => {
      const dag = TaskDag.fromManifest({
        metadata: {
          playbook: "test",
          generated_at: new Date().toISOString(),
          converge_version: "0.1.0",
          frontier_count: 0,
        },
        nodes: {},
        child_map: {},
        parent_map: {},
      });
      expect(dag.nodes.size).toBe(0);
      expect(dag.roots).toEqual([]);
    });
  });

  describe("multi-parent", () => {
    it("node with multiple parents is not a root", () => {
      const dag = new TaskDag();
      dag.addNode(makeNode({ id: "p1", children: ["c"] }));
      dag.addNode(makeNode({ id: "p2", children: ["c"] }));
      dag.addNode(makeNode({ id: "c", parents: ["p1", "p2"] }));
      const rootIds = dag.roots.map((n) => n.id);
      expect(rootIds).not.toContain("c");
      expect(rootIds).toEqual(expect.arrayContaining(["p1", "p2"]));
    });
  });
});
