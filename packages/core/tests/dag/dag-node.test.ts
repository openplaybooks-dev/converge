import { describe, it, expect } from "vitest";
import "../../src/dag/dag-node.ts";
import type { DagNode, DagNodeStatus } from "../../src/dag/dag-node.ts";

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

const validNode: DagNode = {
  id: "node-1",
  parents: [],
  children: [],
  depends_on: [],
  depended_on_by: [],
  taskDef: makeTaskDef(),
  path: "/some/task.md",
  status: "pending",
  virtual: false,
};

describe("DagNodeStatus", () => {
  it("accepts all defined status values", () => {
    const statuses: DagNodeStatus[] = [
      "pending",
      "ready",
      "running",
      "complete",
      "failed",
    ];
    expect(statuses).toHaveLength(5);
  });
});

describe("DagNode", () => {
  it("has all required fields with correct types", () => {
    const node: DagNode = validNode;
    expect(typeof node.id).toBe("string");
    expect(Array.isArray(node.parents)).toBe(true);
    expect(Array.isArray(node.children)).toBe(true);
    expect(Array.isArray(node.depends_on)).toBe(true);
    expect(Array.isArray(node.depended_on_by)).toBe(true);
    expect(typeof node.path).toBe("string");
    expect(typeof node.virtual).toBe("boolean");
  });

  it("defaults to virtual: false for concrete nodes", () => {
    const concrete: DagNode = { ...validNode, virtual: false };
    expect(concrete.virtual).toBe(false);
  });

  it("marks seeded nodes as virtual: true", () => {
    const seeded: DagNode = { ...validNode, virtual: true };
    expect(seeded.virtual).toBe(true);
  });

  it("has status field that matches DagNodeStatus", () => {
    const node: DagNode = validNode;
    const status: DagNodeStatus = node.status;
    expect(status).toBe("pending");
  });

  it("supports structural typing — object literal with all fields compiles", () => {
    const node: DagNode = {
      id: "inline-node",
      parents: ["parent-1"],
      children: ["child-1", "child-2"],
      depends_on: ["dep-1"],
      depended_on_by: [],
      taskDef: makeTaskDef({ id: "inline-def" }),
      path: "/inline/path.md",
      status: "ready",
      virtual: false,
    };
    expect(node.parents).toEqual(["parent-1"]);
    expect(node.children).toEqual(["child-1", "child-2"]);
    expect(node.status).toBe("ready");
  });
});
