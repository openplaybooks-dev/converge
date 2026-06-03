import { describe, it, expect } from "vitest";
import { TaskDag } from "../../src/dag/task-dag.ts";
import { executeDag } from "../../src/dag/dag-runner.ts";
import type { TaskDefinition } from "../../src/config/task-definition.ts";

function makeDag(edges: [string, string[]][]): TaskDag {
  const dag = new TaskDag();
  const added = new Set<string>();
  for (const [id, children] of edges) {
    added.add(id);
    dag.addNode({
      id,
      parents: [],
      children,
      depends_on: [],
      depended_on_by: [],
      taskDef: {
        id,
        title: id,
        description: "",
        body: "",
        checks: [],
      } as TaskDefinition,
      path: `/tasks/${id}/TASK.md`,
      status: "pending",
      virtual: false,
    });
  }
  // Add any leaf nodes referenced as children but not declared as edge sources
  for (const node of dag.nodes.values()) {
    for (const childId of node.children) {
      if (!added.has(childId)) {
        added.add(childId);
        dag.addNode({
          id: childId,
          parents: [],
          children: [],
          depends_on: [],
          depended_on_by: [],
          taskDef: {
            id: childId,
            title: childId,
            description: "",
            body: "",
            checks: [],
          } as TaskDefinition,
          path: `/tasks/${childId}/TASK.md`,
          status: "pending",
          virtual: false,
        });
      }
    }
  }
  for (const node of dag.nodes.values()) {
    for (const childId of node.children) {
      const child = dag.nodes.get(childId);
      if (child) {
        if (!child.parents.includes(node.id)) child.parents.push(node.id);
        if (!child.depends_on.includes(node.id)) child.depends_on.push(node.id);
      }
    }
  }
  return dag;
}

function mockExecute(): {
  execute: (id: string) => Promise<void>;
  calls: string[];
} {
  const calls: string[] = [];
  return {
    calls,
    execute: async (id: string) => {
      calls.push(id);
    },
  };
}

describe("DAG runner", () => {
  describe("Linear A→B→C", () => {
    it("executes A before B, B before C", async () => {
      const dag = makeDag([
        ["A", ["B"]],
        ["B", ["C"]],
      ]);
      const { execute, calls } = mockExecute();

      await executeDag(
        dag,
        async (node) => {
          await execute(node.id);
        },
        { projectDir: "/test" },
      );

      expect(calls.indexOf("A")).toBeLessThan(calls.indexOf("B"));
      expect(calls.indexOf("B")).toBeLessThan(calls.indexOf("C"));
      expect(calls).toHaveLength(3);
    });
  });

  describe("Diamond A→[B,C]→D", () => {
    it("executes A first, B and C after A, D last after both B and C", async () => {
      const dag = makeDag([
        ["A", ["B", "C"]],
        ["B", ["D"]],
        ["C", ["D"]],
      ]);
      const { execute, calls } = mockExecute();

      await executeDag(
        dag,
        async (node) => {
          await execute(node.id);
        },
        { projectDir: "/test" },
      );

      expect(calls.indexOf("A")).toBe(0);
      expect(calls.indexOf("A")).toBeLessThan(calls.indexOf("B"));
      expect(calls.indexOf("A")).toBeLessThan(calls.indexOf("C"));
      expect(calls.indexOf("B")).toBeLessThan(calls.indexOf("D"));
      expect(calls.indexOf("C")).toBeLessThan(calls.indexOf("D"));
      expect(calls).toHaveLength(4);
    });
  });

  describe("Single node", () => {
    it("executes and completes a one-node DAG", async () => {
      const dag = makeDag([["X", []]]);
      const { execute, calls } = mockExecute();

      await executeDag(
        dag,
        async (node) => {
          await execute(node.id);
        },
        { projectDir: "/test" },
      );

      expect(calls).toEqual(["X"]);
      expect(dag.nodes.get("X")!.status).toBe("complete");
    });
  });

  describe("Empty DAG", () => {
    it("completes without error", async () => {
      const dag = new TaskDag();

      await executeDag(dag, async () => {}, { projectDir: "/test" });

      // Should not throw
    });
  });

  describe("Failed blocking task", () => {
    it("marks failed task as failed and does not execute downstream", async () => {
      const dag = makeDag([["A", ["B"]]]);
      const calls: string[] = [];

      await expect(
        executeDag(
          dag,
          async (node) => {
            if (node.id === "A") throw new Error("A failed");
            calls.push(node.id);
          },
          { projectDir: "/test" },
        ),
      ).rejects.toThrow("A failed");

      // DESIRED: A is marked failed, B never executed
      // CURRENT: executeDag doesn't call markFailed, so A stays 'pending'
      expect(dag.nodes.get("A")!.status).toBe("failed");
      expect(calls).not.toContain("B");
    });
  });

  describe("Failed non-blocking", () => {
    it("does not execute tasks that depend on a failed task", async () => {
      const dag = makeDag([["A", ["B", "C"]]]);
      const calls: string[] = [];

      await expect(
        executeDag(
          dag,
          async (node) => {
            if (node.id === "A") throw new Error("A failed");
            calls.push(node.id);
          },
          { projectDir: "/test" },
        ),
      ).rejects.toThrow("A failed");

      expect(dag.nodes.get("A")!.status).toBe("failed");
      expect(calls).not.toContain("B");
      expect(calls).not.toContain("C");
    });
  });

  describe("Resume from checkpoint", () => {
    it("skips already-complete nodes and starts from first pending", async () => {
      const dag = makeDag([
        ["A", ["B"]],
        ["B", ["C"]],
      ]);
      // Pre-mark A and B as complete (simulating resume)
      dag.markComplete("A");
      dag.markComplete("B");
      const { execute, calls } = mockExecute();

      await executeDag(
        dag,
        async (node) => {
          await execute(node.id);
        },
        { projectDir: "/test" },
      );

      // Only C should execute; A and B are already complete
      expect(calls).toEqual(["C"]);
    });
  });

  describe("Results returned", () => {
    it("all nodes are marked complete after successful execution", async () => {
      const dag = makeDag([
        ["A", ["B"]],
        ["B", ["C"]],
      ]);
      const { execute, calls } = mockExecute();

      await executeDag(
        dag,
        async (node) => {
          await execute(node.id);
        },
        { projectDir: "/test" },
      );

      expect(dag.nodes.get("A")!.status).toBe("complete");
      expect(dag.nodes.get("B")!.status).toBe("complete");
      expect(dag.nodes.get("C")!.status).toBe("complete");
      expect(calls).toEqual(["A", "B", "C"]);
    });

    it("failed task is tracked", async () => {
      const dag = makeDag([["A", ["B"]]]);

      await expect(
        executeDag(
          dag,
          async (node) => {
            if (node.id === "A") throw new Error("fail");
          },
          { projectDir: "/test" },
        ),
      ).rejects.toThrow("fail");

      expect(dag.nodes.get("A")!.status).toBe("failed");
    });
  });
});
