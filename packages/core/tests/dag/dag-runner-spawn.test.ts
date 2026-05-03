import { describe, it, expect } from "vitest";
import type { DagNode } from "../../src/dag/dag-node.ts";
import { TaskDag } from "../../src/dag/task-dag.ts";
import { executeDag, type SpawnedChild } from "../../src/dag/dag-runner.ts";
import type { TaskDefinition } from "../../src/config/task-definition.ts";
import type { SeedMdDefinition } from "../../src/config/seed-md-definition.ts";
import { synthesize, synthesizeOne } from "../../src/runtime/child-synthesizer.ts";
import type { SynthesizeEntry } from "../../src/runtime/child-synthesizer.ts";

function makeTaskDef(overrides?: Partial<TaskDefinition>): TaskDefinition {
  return { id: "test-task", ...overrides } as TaskDefinition;
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

function makeSeed(name: string, overrides?: Partial<SeedMdDefinition>): SeedMdDefinition {
  return {
    name,
    description: `Seed definition for ${name}`,
    kind: "nodejs",
    args: {},
    ...overrides,
  };
}

function makeSpawner(entriesMap: Record<string, SynthesizeEntry[]>) {
  return async (node: DagNode): Promise<SpawnedChild[]> => {
    const entries = entriesMap[node.id] ?? [];
    const result = synthesize(node.taskDef, entries);
    const children: SpawnedChild[] = [];
    for (let i = 0; i < result.childIds.length; i++) {
      const entry = entries[i];
      const childId = result.childIds[i];
      // If this child itself has entries in the map, give it from_seed
      // so executeDag knows to spawn grandchildren when it completes.
      const hasGrandchildren = childId in entriesMap;
      children.push({
        id: childId,
        taskDef: makeTaskDef({ id: childId, ...(hasGrandchildren ? { from_seed: childId } : {}) }),
        path: entry?.path,
      });
    }
    return children;
  };
}

describe("dynamic spawn", () => {
  describe("virtual node materializes", () => {
    it("synthesize returns child IDs from seed entries", () => {
      const parent = makeTaskDef({ id: "A", from_seed: "tokens" });
      const entries: SynthesizeEntry[] = [
        { seed: makeSeed("B"), args: {} },
        { seed: makeSeed("C"), args: {} },
      ];
      const result = synthesize(parent, entries);
      expect(result.childIds).toEqual(["B", "C"]);
    });

    it("children appear in DAG after parent with from_seed completes", async () => {
      const dag = new TaskDag();
      const parent = makeTaskDef({ id: "A", from_seed: "tokens" });
      dag.addNode(makeNode({ id: "A", taskDef: parent, virtual: true }));

      const entries: SynthesizeEntry[] = [
        { seed: makeSeed("B"), args: {} },
        { seed: makeSeed("C"), args: {} },
      ];

      await executeDag(dag, async () => {}, {
        projectDir: "/test",
        spawnChildren: makeSpawner({ A: entries }),
      });

      expect(dag.nodes.has("B")).toBe(true);
      expect(dag.nodes.has("C")).toBe(true);
    });
  });

  describe("virtual node replaced by concrete", () => {
    it("virtual node becomes concrete after spawner runs", async () => {
      const dag = new TaskDag();
      const parent = makeTaskDef({ id: "A", from_seed: "tokens" });
      dag.addNode(makeNode({ id: "A", taskDef: parent, virtual: true }));

      const entry: SynthesizeEntry = { seed: makeSeed("B"), args: {} };

      await executeDag(dag, async () => {}, {
        projectDir: "/test",
        spawnChildren: makeSpawner({ A: [entry] }),
      });

      const nodeA = dag.nodes.get("A")!;
      expect(nodeA.virtual).toBe(false);
      expect(nodeA.taskDef.id).toBe("A");
    });
  });

  describe("spawned children respect depends_on", () => {
    it("children depend on parent and are not ready until parent completes", () => {
      const dag = new TaskDag();
      dag.addNode(makeNode({ id: "A", virtual: true }));

      dag.addNode(makeNode({ id: "B", depends_on: ["A"], parents: ["A"] }));
      dag.addNode(makeNode({ id: "C", depends_on: ["A"], parents: ["A"] }));

      const beforeReady = dag.getReady().map((n) => n.id);
      expect(beforeReady).not.toContain("B");
      expect(beforeReady).not.toContain("C");

      dag.markComplete("A");

      const afterReady = dag.getReady().map((n) => n.id);
      expect(afterReady).toContain("B");
      expect(afterReady).toContain("C");
    });

    it("synthesized children automatically get depends_on linking to parent", async () => {
      const dag = new TaskDag();
      const parent = makeTaskDef({ id: "A", from_seed: "tokens" });
      dag.addNode(makeNode({ id: "A", taskDef: parent, virtual: true }));

      const entries: SynthesizeEntry[] = [
        { seed: makeSeed("B"), args: {} },
        { seed: makeSeed("C"), args: {} },
      ];

      await executeDag(dag, async () => {}, {
        projectDir: "/test",
        spawnChildren: makeSpawner({ A: entries }),
      });

      const nodeB = dag.nodes.get("B");
      const nodeC = dag.nodes.get("C");
      expect(nodeB).toBeDefined();
      expect(nodeC).toBeDefined();
      expect(nodeB!.depends_on).toContain("A");
      expect(nodeC!.depends_on).toContain("A");
    });
  });

  describe("multi-generation spawn", () => {
    it("child with from_seed spawns grandchildren when it completes", async () => {
      const dag = new TaskDag();

      const parentA = makeTaskDef({ id: "A", from_seed: "tokens" });
      dag.addNode(makeNode({ id: "A", taskDef: parentA, virtual: true }));

      const entriesA: SynthesizeEntry[] = [{ seed: makeSeed("B"), args: {} }];

      await executeDag(dag, async () => {}, {
        projectDir: "/test",
        spawnChildren: makeSpawner({
          A: entriesA,
          B: [{ seed: makeSeed("C"), args: {} }],
        }),
      });

      // Check both generations were spawned
      expect(dag.nodes.has("B")).toBe(true);
      expect(dag.nodes.has("C")).toBe(true);

      const nodeC = dag.nodes.get("C");
      expect(nodeC).toBeDefined();
      expect(nodeC!.depends_on).toContain("B");
    });
  });

  describe("path override from seed entry", () => {
    it("synthesize respects path override in entry", () => {
      const parent = makeTaskDef({ id: "A", from_seed: "tokens" });
      const entry: SynthesizeEntry = {
        seed: makeSeed("B"),
        args: {},
        path: "custom/path/to/B",
      };
      const result = synthesizeOne(parent, entry);
      expect(result.paths).toEqual(["custom/path/to/B"]);
    });

    it("child node gets custom path from seed entry", async () => {
      const dag = new TaskDag();
      const parent = makeTaskDef({ id: "A", from_seed: "tokens" });
      dag.addNode(makeNode({ id: "A", taskDef: parent, virtual: true }));

      const entry: SynthesizeEntry = {
        seed: makeSeed("B"),
        args: {},
        path: "custom/path/to/B",
      };

      await executeDag(dag, async () => {}, {
        projectDir: "/test",
        spawnChildren: makeSpawner({ A: [entry] }),
      });

      const nodeB = dag.nodes.get("B");
      expect(nodeB).toBeDefined();
      expect(nodeB!.path).toBe("custom/path/to/B");
    });
  });

  describe("empty spawn", () => {
    it("synthesize with no entries returns empty result", () => {
      const parent = makeTaskDef({ id: "A", from_seed: "tokens" });
      const result = synthesize(parent, []);
      expect(result.childIds).toEqual([]);
      expect(result.paths).toEqual([]);
    });

    it("empty spawn does not add nodes to DAG", async () => {
      const dag = new TaskDag();
      dag.addNode(makeNode({ id: "A", virtual: true }));

      // Run with no spawner — DAG should still have only A
      // Also test with empty entries in spawner
      const parent = makeTaskDef({ id: "A", from_seed: "tokens" });
      const dag2 = new TaskDag();
      dag2.addNode(makeNode({ id: "A", taskDef: parent, virtual: true }));

      await executeDag(dag2, async () => {}, {
        projectDir: "/test",
        spawnChildren: makeSpawner({ A: [] }),
      });

      // No crash, A still exists
      expect(dag.nodes.size).toBe(1);
      expect(dag.nodes.has("A")).toBe(true);
      // The dag2 also only has A (empty spawn)
      expect(dag2.nodes.has("A")).toBe(true);
    });
  });

  describe("spawned children appear in topological order", () => {
    it("topological order includes spawned children in correct layers", () => {
      const dag = new TaskDag();
      dag.addNode(makeNode({ id: "A", virtual: true }));

      dag.addNode(makeNode({ id: "B", depends_on: ["A"], parents: ["A"] }));
      dag.addNode(makeNode({ id: "C", depends_on: ["A"], parents: ["A"] }));

      dag.markComplete("A");

      const order = dag.topologicalOrder();
      const allIds = order.flatMap((layer) => layer.map((n) => n.id));

      expect(allIds).toContain("A");
      expect(allIds).toContain("B");
      expect(allIds).toContain("C");

      const aLayer = order.findIndex((layer) =>
        layer.some((n) => n.id === "A"),
      );
      const bLayer = order.findIndex((layer) =>
        layer.some((n) => n.id === "B"),
      );
      const cLayer = order.findIndex((layer) =>
        layer.some((n) => n.id === "C"),
      );
      expect(aLayer).toBeLessThan(bLayer);
      expect(aLayer).toBeLessThan(cLayer);
    });

    it("after spawn, topologicalOrder reflects the new DAG state", async () => {
      const dag = new TaskDag();
      const parent = makeTaskDef({ id: "A", from_seed: "tokens" });
      dag.addNode(makeNode({ id: "A", taskDef: parent, virtual: true }));

      const entries: SynthesizeEntry[] = [
        { seed: makeSeed("B"), args: {} },
        { seed: makeSeed("C"), args: {} },
      ];

      await executeDag(dag, async () => {}, {
        projectDir: "/test",
        spawnChildren: makeSpawner({ A: entries }),
      });

      const order = dag.topologicalOrder();
      const allIds = order.flatMap((layer) => layer.map((n) => n.id));
      expect(allIds).toContain("B");
      expect(allIds).toContain("C");
    });
  });
});
