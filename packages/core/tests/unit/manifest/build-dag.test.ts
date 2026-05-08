import { describe, it, expect } from "vitest";
import { buildDagFromManifest } from "../../../src/manifest/build-dag.js";

describe("buildDagFromManifest", () => {
  it("builds DAG from a manifest with flat nodes", () => {
    const manifest = {
      nodes: {
        "01-prepare": {
          state: "concrete",
          depends_on: [],
          path: "/tmp/tasks/01-prepare",
          checks: [],
          inputs: [],
          outputs: [],
        },
        "02-build": {
          state: "concrete",
          depends_on: ["01-prepare"],
          path: "/tmp/tasks/02-build",
          checks: [],
          inputs: [],
          outputs: [],
        },
      },
      parent_map: {
        "01-prepare": [],
        "02-build": ["01-prepare"],
      },
      child_map: {
        "01-prepare": ["02-build"],
        "02-build": [],
      },
    };

    const { dag, errors } = buildDagFromManifest(manifest);
    expect(errors).toHaveLength(0);
    expect(dag.nodes.size).toBe(2);

    const build = dag.nodes.get("02-build")!;
    expect(build.depends_on).toEqual(["01-prepare"]);
    expect(build.depended_on_by).toEqual([]);

    const prepare = dag.nodes.get("01-prepare")!;
    expect(prepare.depends_on).toEqual([]);
    expect(prepare.depended_on_by).toEqual(["02-build"]);
  });

  it("builds DAG with nested parent-child relationships", () => {
    const manifest = {
      nodes: {
        "01-prepare": {
          state: "concrete",
          depends_on: [],
          path: "/tmp/tasks/01-prepare",
          checks: [],
          inputs: [],
          outputs: [],
        },
        "001-prd": {
          state: "concrete",
          depends_on: ["01-prepare"],
          path: "/tmp/tasks/01-prepare/tasks/001-prd",
          checks: [],
          inputs: [],
          outputs: [],
        },
      },
      parent_map: {
        "01-prepare": [],
        "001-prd": ["01-prepare"],
      },
      child_map: {
        "01-prepare": ["001-prd"],
        "001-prd": [],
      },
    };

    const { dag, errors } = buildDagFromManifest(manifest);
    expect(errors).toHaveLength(0);
    expect(dag.nodes.size).toBe(2);

    const child = dag.nodes.get("001-prd")!;
    expect(child.depends_on).toEqual(["01-prepare"]);

    const parent = dag.nodes.get("01-prepare")!;
    expect(parent.depended_on_by).toEqual(["001-prd"]);
  });

  it("marks frontier nodes as virtual", () => {
    const manifest = {
      nodes: {
        "01-seed-parent": {
          state: "frontier",
          depends_on: [],
          seed: "per-token",
          checks: [],
          inputs: [],
          outputs: [],
        },
      },
      parent_map: { "01-seed-parent": [] },
      child_map: { "01-seed-parent": [] },
    };

    const { dag } = buildDagFromManifest(manifest);
    const node = dag.nodes.get("01-seed-parent")!;
    expect(node.virtual).toBe(true);
    expect(node.status).toBe("pending");
  });

  it("propagates task properties from manifest", () => {
    const manifest = {
      nodes: {
        "task-1": {
          state: "concrete",
          depends_on: [],
          path: "/tasks/task-1",
          title: "My Title",
          description: "Does something",
          inputs: ["input.md"],
          outputs: ["output.md"],
          checks: [{ id: "check-1", cmd: "test -f output.md" }],
          tags: ["fast"],
        },
      },
      parent_map: { "task-1": [] },
      child_map: { "task-1": [] },
    };

    const { dag } = buildDagFromManifest(manifest);
    const node = dag.nodes.get("task-1")!;
    expect(node.taskDef.title).toBe("My Title");
    expect(node.taskDef.description).toBe("Does something");
    expect(node.taskDef.inputs).toEqual(["input.md"]);
    expect(node.taskDef.outputs).toEqual(["output.md"]);
    expect(node.taskDef.checks).toHaveLength(1);
    expect(node.taskDef.tags).toEqual(["fast"]);
    expect(node.path).toBe("/tasks/task-1");
  });

  it("skips duplicate IDs", () => {
    const manifest = {
      nodes: {
        "dup": { state: "concrete", depends_on: [], checks: [], inputs: [], outputs: [] },
      },
      parent_map: { "dup": [] },
      child_map: { "dup": [] },
    };

    const { dag, errors } = buildDagFromManifest(manifest);
    expect(errors).toHaveLength(0);
    expect(dag.nodes.size).toBe(1);
  });

  it("returns empty DAG for empty manifest", () => {
    const manifest = { nodes: {}, parent_map: {}, child_map: {} };
    const { dag, errors } = buildDagFromManifest(manifest);
    expect(errors).toHaveLength(0);
    expect(dag.nodes.size).toBe(0);
  });
});
