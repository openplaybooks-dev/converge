import { describe, it, expect } from "vitest";
import { TaskDag } from "../../src/dag/task-dag.ts";
import { executeDag } from "../../src/dag/dag-runner.ts";
import type { DagNode } from "../../src/dag/dag-node.ts";
import type { TaskDefinition } from "../../src/config/task-definition.ts";
import type { SeedMdDefinition } from "../../src/config/seed-md-definition.ts";
import { synthesize, type SynthesizeEntry } from "../../src/runtime/child-synthesizer.ts";

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
  return { name, description: `Seed for ${name}`, kind: "nodejs", args: {}, ...overrides };
}

function makeSpawner(entriesMap: Record<string, SynthesizeEntry[]>) {
  return async () => {
    const allChildren: Array<{ id: string; taskDef: TaskDefinition; path?: string }> = [];
    for (const [parentId, entries] of Object.entries(entriesMap)) {
      const parent = makeTaskDef({ id: parentId, from_seed: parentId });
      const result = synthesize(parent, entries);
      for (let i = 0; i < result.childIds.length; i++) {
        allChildren.push({
          id: result.childIds[i],
          taskDef: makeTaskDef({ id: result.childIds[i] }),
        });
      }
    }
    return allChildren;
  };
}

/**
 * Split a container into diverge + converge nodes.
 * Used by the DAG construction to create a forward-only DAG.
 */
function splitContainer(dag: TaskDag, baseId: string, options: {
  taskDef: TaskDefinition;
  children?: string[];
  path?: string;
}): { divergeId: string; convergeId: string } {
  const divergeId = `${baseId}-diverge`;
  const convergeId = `${baseId}-converge`;
  const taskDef = options.taskDef as any;
  const hasBody = !!(taskDef?.body || taskDef?.prompt);

  // Diverge node: runs seed, spawns children
  dag.addNode(makeNode({
    id: divergeId,
    taskDef: makeTaskDef({ id: divergeId, from_seed: taskDef?.from_seed }),
    children: options.children ?? [],
    path: options.path ?? `/tasks/${baseId}/TASK.md`,
  }));

  if (hasBody) {
    // Converge node: runs body after children complete
    dag.addNode(makeNode({
      id: convergeId,
      taskDef: makeTaskDef({ id: convergeId, body: taskDef?.body, prompt: taskDef?.prompt }),
      depends_on: options.children ? [...options.children] : [],
      path: options.path ?? `/tasks/${baseId}/TASK.md`,
    }));
  }

  return { divergeId, convergeId };
}

describe("split-node (diverge + converge)", () => {
  it("container with body produces diverge and converge nodes", () => {
    const dag = new TaskDag();
    const taskDef = makeTaskDef({
      id: "A",
      body: "## Convergence\nIntegrate results.",
      from_seed: "items",
    });

    const { divergeId, convergeId } = splitContainer(dag, "A", {
      taskDef,
      children: ["B", "C"],
    });

    expect(dag.nodes.has(divergeId)).toBe(true);
    expect(dag.nodes.has(convergeId)).toBe(true);

    const diverge = dag.nodes.get(divergeId)!;
    const converge = dag.nodes.get(convergeId)!;

    // Converge depends on children
    expect(converge.depends_on).toContain("B");
    expect(converge.depends_on).toContain("C");
    // Diverge has children listed
    expect(diverge.children).toContain("B");
    expect(diverge.children).toContain("C");
  });

  it("pure container (no body) produces only diverge node", () => {
    const dag = new TaskDag();
    const taskDef = makeTaskDef({ id: "A", body: "", from_seed: "items" });

    const { divergeId, convergeId } = splitContainer(dag, "A", {
      taskDef,
      children: ["B"],
    });

    expect(dag.nodes.has(divergeId)).toBe(true);
    // No converge node for pure container
    expect(dag.nodes.get(convergeId)?.taskDef?.body).toBeFalsy();
  });

  it("converge runs after children, not before", async () => {
    const dag = new TaskDag();

    // Diverge: spawns B and C
    const { divergeId, convergeId } = splitContainer(dag, "A", {
      taskDef: makeTaskDef({
        id: "A",
        body: "## Convergence\nIntegrate B and C outputs.",
        from_seed: "items",
      }),
    });

    // Children B and C — pre-added, diverge already ran (simulated: from_seed not set here)
    dag.addNode(makeNode({
      id: "B",
      taskDef: makeTaskDef({ id: "B", body: "Produce B output" }),
      depends_on: [divergeId],
    }));
    dag.addNode(makeNode({
      id: "C",
      taskDef: makeTaskDef({ id: "C", body: "Produce C output" }),
      depends_on: [divergeId],
    }));

    // Converge depends on B and C
    const converge = dag.nodes.get(convergeId)!;
    converge.depends_on = ["B", "C"];

    const executionOrder: string[] = [];

    await executeDag(
      dag,
      async (node) => {
        executionOrder.push(node.id);
      },
      {
        projectDir: "/test",
        spawnChildren: async () => [], // children already in DAG
      },
    );

    // Diverge must run before children
    expect(executionOrder.indexOf(divergeId)).toBeLessThan(executionOrder.indexOf("B"));
    expect(executionOrder.indexOf(divergeId)).toBeLessThan(executionOrder.indexOf("C"));

    // Converge must run after children
    expect(executionOrder.indexOf("B")).toBeLessThan(executionOrder.indexOf(convergeId));
    expect(executionOrder.indexOf("C")).toBeLessThan(executionOrder.indexOf(convergeId));

    // All complete
    expect(dag.nodes.get(divergeId)!.status).toBe("complete");
    expect(dag.nodes.get(convergeId)!.status).toBe("complete");
    expect(dag.nodes.get("B")!.status).toBe("complete");
    expect(dag.nodes.get("C")!.status).toBe("complete");
  });

  it("execution flows forward only — no node re-executes", async () => {
    const dag = new TaskDag();

    const { divergeId, convergeId } = splitContainer(dag, "A", {
      taskDef: makeTaskDef({
        id: "A",
        body: "## Convergence\nIntegrate.",
        from_seed: "items",
      }),
    });

    // Children pre-added (already spawned)
    dag.addNode(makeNode({
      id: "B", taskDef: makeTaskDef({ id: "B" }), depends_on: [divergeId],
    }));
    dag.addNode(makeNode({
      id: "C", taskDef: makeTaskDef({ id: "C" }), depends_on: [divergeId],
    }));

    const converge = dag.nodes.get(convergeId)!;
    converge.depends_on = ["B", "C"];

    const executions = new Map<string, number>();

    await executeDag(
      dag,
      async (node) => {
        executions.set(node.id, (executions.get(node.id) ?? 0) + 1);
      },
      {
        projectDir: "/test",
        spawnChildren: async () => [], // children already in DAG
      },
    );

    // Each node executes exactly once — no re-queue, no push-back
    expect(executions.get(divergeId)).toBe(1);
    expect(executions.get(convergeId)).toBe(1);
    expect(executions.get("B")).toBe(1);
    expect(executions.get("C")).toBe(1);
  });

  it("root playbook gets diverge and converge nodes", () => {
    const dag = new TaskDag();

    // Root container (the playbook itself)
    const { divergeId, convergeId } = splitContainer(dag, "root", {
      taskDef: makeTaskDef({
        id: "root",
        body: "## Convergence\nValidate all tasks, write final output.",
      }),
      children: ["01-prepare-converge", "02-build-converge"],
    });

    // Top-level tasks also split
    splitContainer(dag, "01-prepare", {
      taskDef: makeTaskDef({ id: "01-prepare", body: "Prepare artifacts." }),
      children: [],
    });
    splitContainer(dag, "02-build", {
      taskDef: makeTaskDef({ id: "02-build", body: "Build output." }),
      children: [],
    });

    // Root-converge depends on top-level converge nodes
    const rootConverge = dag.nodes.get(convergeId)!;
    rootConverge.depends_on = ["01-prepare-converge", "02-build-converge"];

    const rootDiverge = dag.nodes.get(divergeId)!;
    expect(rootDiverge.children).toContain("01-prepare-converge");
    expect(rootDiverge.children).toContain("02-build-converge");

    // Root-converge waits for all top-level converges
    expect(rootConverge.depends_on).toContain("01-prepare-converge");
    expect(rootConverge.depends_on).toContain("02-build-converge");

    // Root-diverge has no deps (runs first)
    expect(rootDiverge.depends_on).toEqual([]);
  });

  it("downstream tasks depend on converge node, not diverge", () => {
    const dag = new TaskDag();

    const { convergeId } = splitContainer(dag, "01-prepare", {
      taskDef: makeTaskDef({ id: "01-prepare", body: "Prepare." }),
      children: ["catalog"],
    });

    // Downstream task depends on converge (the output), not diverge (the seed)
    dag.addNode(makeNode({
      id: "02-build",
      taskDef: makeTaskDef({ id: "02-build", body: "Build." }),
      depends_on: [convergeId],
    }));

    const downstream = dag.nodes.get("02-build")!;
    expect(downstream.depends_on).toContain(convergeId);
    expect(downstream.depends_on).not.toContain("01-prepare-diverge");
    expect(downstream.depends_on).not.toContain("01-prepare");
  });
});

describe("crash recovery with split nodes", () => {
  /**
   * Simulate interrupt + resume:
   * 1. Build DAG with split container
   * 2. Run partially (diverge + some children complete)
   * 3. Snapshot DAG state
   * 4. Build fresh DAG (simulates re-compile on resume)
   * 5. Restore completed nodes from snapshot
   * 6. Continue execution
   * 7. Verify converge runs and everything completes
   */
  it("resumes after interrupt — converge runs after restored children", async () => {
    // ── First run (interrupted mid-way) ──────────────────────
    const dag1 = new TaskDag();

    const { divergeId, convergeId } = splitContainer(dag1, "A", {
      taskDef: makeTaskDef({
        id: "A",
        body: "## Convergence\nIntegrate B and C outputs.",
        from_seed: "items",
      }),
    });

    // Pre-add children — simulate seed having already run
    dag1.addNode(makeNode({
      id: "B", taskDef: makeTaskDef({ id: "B", body: "Produce B" }),
      depends_on: [divergeId],
      parents: [divergeId],
    }));
    dag1.addNode(makeNode({
      id: "C", taskDef: makeTaskDef({ id: "C", body: "Produce C" }),
      depends_on: [divergeId],
      parents: [divergeId],
    }));

    const converge1 = dag1.nodes.get(convergeId)!;
    converge1.depends_on = ["B", "C"];
    converge1.parents = [divergeId];

    // Mark diverge as complete (seed already ran)
    dag1.markComplete(divergeId);

    // Run — B and C execute, then converge
    const run1Order: string[] = [];
    await executeDag(
      dag1,
      async (node) => { run1Order.push(node.id); },
      { projectDir: "/test", spawnChildren: async () => [] },
    );

    // Full run: B, C, then converge
    expect(dag1.nodes.get(divergeId)!.status).toBe("complete");
    expect(dag1.nodes.get("B")!.status).toBe("complete");
    expect(dag1.nodes.get("C")!.status).toBe("complete");
    expect(dag1.nodes.get(convergeId)!.status).toBe("complete");
    expect(run1Order).toEqual(["B", "C", convergeId]);

    // ── Simulate interrupt after diverge and B complete, before C ──
    const dag2 = new TaskDag();
    const ids = splitContainer(dag2, "A", {
      taskDef: makeTaskDef({
        id: "A",
        body: "## Convergence\nIntegrate B and C outputs.",
        from_seed: "items",
      }),
    });
    const dId = ids.divergeId;
    const cId = ids.convergeId;

    dag2.addNode(makeNode({
      id: "B", taskDef: makeTaskDef({ id: "B", body: "Produce B" }),
      depends_on: [dId], parents: [dId],
    }));
    dag2.addNode(makeNode({
      id: "C", taskDef: makeTaskDef({ id: "C", body: "Produce C" }),
      depends_on: [dId], parents: [dId],
    }));

    const converge2 = dag2.nodes.get(cId)!;
    converge2.depends_on = ["B", "C"];
    converge2.parents = [dId];

    // Simulate: diverge complete, B complete, C still pending
    dag2.markComplete(dId);
    dag2.markComplete("B");
    // C remains pending

    // ── Resume: run from this state ──────────────────────────
    const run2Order: string[] = [];
    await executeDag(
      dag2,
      async (node) => { run2Order.push(node.id); },
      { projectDir: "/test", spawnChildren: async () => [] },
    );

    // Only C and converge should execute (diverge and B already complete)
    expect(run2Order).toEqual(["C", cId]);
    expect(dag2.nodes.get(dId)!.status).toBe("complete");
    expect(dag2.nodes.get("B")!.status).toBe("complete");
    expect(dag2.nodes.get("C")!.status).toBe("complete");
    expect(dag2.nodes.get(cId)!.status).toBe("complete");
  });

  it("resume with restored children wires converge deps", async () => {
    // Simulates: children were spawned in prior run, persisted to
    // runstate.json. On resume, fresh DAG has diverge+converge but
    // not the children. Children are restored from runstate.
    const dag = new TaskDag();

    // Fresh DAG: only diverge and converge (children were dynamic)
    const { divergeId, convergeId } = splitContainer(dag, "A", {
      taskDef: makeTaskDef({
        id: "A",
        body: "## Convergence\nIntegrate results.",
        from_seed: "items",
      }),
    });

    // Simulate restoring spawned children from runstate
    // (these wouldn't be in the fresh DAG)
    dag.addNode(makeNode({
      id: "B",
      taskDef: makeTaskDef({ id: "B", body: "Produce B" }),
      depends_on: [divergeId],
      parents: [divergeId],
    }));
    dag.addNode(makeNode({
      id: "C",
      taskDef: makeTaskDef({ id: "C", body: "Produce C" }),
      depends_on: [divergeId],
      parents: [divergeId],
    }));

    // The converge node must be wired to the restored children
    const converge = dag.nodes.get(convergeId)!;
    converge.depends_on = ["B", "C"];
    converge.parents = [divergeId];

    // Mark diverge and B as complete (from prior run)
    dag.markComplete(divergeId);
    dag.markComplete("B");

    const order: string[] = [];
    await executeDag(
      dag,
      async (node) => { order.push(node.id); },
      { projectDir: "/test", spawnChildren: async () => [] },
    );

    // C runs, then converge
    expect(order).toEqual(["C", convergeId]);
    expect(dag.nodes.get(convergeId)!.status).toBe("complete");
  });
});
