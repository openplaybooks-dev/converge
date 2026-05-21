import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { TaskDag } from "../../../src/dag/task-dag.js";
import { discoverStaticChildren } from "../../../src/task/discovery/static-children.js";
import type { DagNode } from "../../../src/dag/dag-node.js";

function tmpDir(suffix: string): string {
  return join(tmpdir(), `converge-test-sc-${Date.now()}-${Math.random().toString(36).slice(2)}${suffix}`);
}

function writeTaskMd(dir: string, id: string, extra: string = ""): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "TASK.md"),
    `---\nid: ${id}\ntitle: Task ${id}${extra}\n---\n\n# ${id}\n\nBody for ${id}.\n`,
    "utf-8",
  );
}

describe("discoverStaticChildren", () => {
  let dag: TaskDag;
  let idToPath: Map<string, string>;
  let rootDir: string;

  beforeEach(() => {
    dag = new TaskDag();
    idToPath = new Map();
    rootDir = tmpDir("");
  });

  afterEach(() => {
    try { rmSync(rootDir, { recursive: true, force: true }); } catch {}
  });

  function addNode(id: string, dir: string): void {
    const node: DagNode = {
      id,
      parents: [],
      children: [],
      depends_on: [],
      depended_on_by: [],
      taskDef: { id, title: id, prompt: "", inputs: [], outputs: [], checks: [], depends_on: [], blocking: true },
      path: join(dir, "TASK.md"),
      status: "pending",
      virtual: false,
    };
    dag.addNode(node);
    idToPath.set(id, node.path!);
  }

  it("discovers children in a tasks/ subdirectory", () => {
    const parentDir = join(rootDir, "01-parent");
    writeTaskMd(parentDir, "01-parent");
    const childrenDir = join(parentDir, "tasks");
    writeTaskMd(join(childrenDir, "001-child"), "001-child");
    writeTaskMd(join(childrenDir, "002-second"), "002-second");

    addNode("01-parent", parentDir);
    discoverStaticChildren(dag, idToPath);

    expect(dag.nodes.size).toBe(3);
    const parent = dag.nodes.get("01-parent")!;
    expect(parent.children).toContain("001-child");
    expect(parent.children).toContain("002-second");

    const child = dag.nodes.get("001-child")!;
    expect(child.depends_on).toContain("01-parent");
    expect(child.parents).toContain("01-parent");
  });

  it("discovers grandchildren recursively", () => {
    const grandparentDir = join(rootDir, "01-grand");
    writeTaskMd(grandparentDir, "01-grand");
    const parentDir = join(grandparentDir, "tasks", "001-parent");
    writeTaskMd(parentDir, "001-parent");
    const childDir = join(parentDir, "tasks", "001-child");
    writeTaskMd(childDir, "001-child");

    addNode("01-grand", grandparentDir);
    discoverStaticChildren(dag, idToPath);

    expect(dag.nodes.size).toBe(3);
    const gp = dag.nodes.get("01-grand")!;
    const p = dag.nodes.get("001-parent")!;
    const c = dag.nodes.get("001-child")!;

    expect(gp.children).toContain("001-parent");
    expect(p.children).toContain("001-child");
    expect(p.depends_on).toContain("01-grand");
    expect(c.depends_on).toContain("001-parent");
  });

  it("auto-chains siblings alphabetically under parent", () => {
    const parentDir = join(rootDir, "01-parent");
    writeTaskMd(parentDir, "01-parent");
    const childrenDir = join(parentDir, "tasks");
    writeTaskMd(join(childrenDir, "001-alpha"), "001-alpha");
    writeTaskMd(join(childrenDir, "002-bravo"), "002-bravo");
    writeTaskMd(join(childrenDir, "003-charlie"), "003-charlie");

    addNode("01-parent", parentDir);
    discoverStaticChildren(dag, idToPath);

    expect(dag.nodes.size).toBe(4);
    // RFC 0034: first child depends on parent; subsequent children depend on parent + previous sibling
    const alpha = dag.nodes.get("001-alpha")!;
    const bravo = dag.nodes.get("002-bravo")!;
    const charlie = dag.nodes.get("003-charlie")!;

    expect(alpha.depends_on).toEqual(["01-parent"]);
    expect(bravo.depends_on).toEqual(["01-parent", "001-alpha"]);
    expect(charlie.depends_on).toEqual(["01-parent", "002-bravo"]);
  });

  it("no-op when no children exist", () => {
    const parentDir = join(rootDir, "01-standalone");
    writeTaskMd(parentDir, "01-standalone");

    addNode("01-standalone", parentDir);
    discoverStaticChildren(dag, idToPath);

    expect(dag.nodes.size).toBe(1);
  });

  it("skips directories without TASK.md", () => {
    const parentDir = join(rootDir, "01-parent");
    writeTaskMd(parentDir, "01-parent");
    const childrenDir = join(parentDir, "tasks");
    // Create a directory without TASK.md
    mkdirSync(join(childrenDir, "001-empty"), { recursive: true });
    // Create a valid child
    writeTaskMd(join(childrenDir, "002-valid"), "002-valid");

    addNode("01-parent", parentDir);
    discoverStaticChildren(dag, idToPath);

    expect(dag.nodes.size).toBe(2);
    expect(dag.nodes.has("001-empty")).toBe(false);
    expect(dag.nodes.has("002-valid")).toBe(true);
  });

  it("skips directories that don't match \\d{2,3}- pattern", () => {
    const parentDir = join(rootDir, "01-parent");
    writeTaskMd(parentDir, "01-parent");
    const childrenDir = join(parentDir, "tasks");
    writeTaskMd(join(childrenDir, "not-a-task"), "not-a-task");

    addNode("01-parent", parentDir);
    discoverStaticChildren(dag, idToPath);

    expect(dag.nodes.size).toBe(1);
    expect(dag.nodes.has("not-a-task")).toBe(false);
  });

  it("idempotent — running twice doesn't duplicate", () => {
    const parentDir = join(rootDir, "01-parent");
    writeTaskMd(parentDir, "01-parent");
    writeTaskMd(join(parentDir, "tasks", "001-child"), "001-child");

    addNode("01-parent", parentDir);
    discoverStaticChildren(dag, idToPath);
    expect(dag.nodes.size).toBe(2);

    // Run again
    discoverStaticChildren(dag, idToPath);
    expect(dag.nodes.size).toBe(2);
  });
});
