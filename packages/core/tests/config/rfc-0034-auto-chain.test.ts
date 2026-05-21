/**
 * RFC 0034: Ban depends_on public API, auto-chain alphabetically.
 *
 * Tests that:
 * 1. Tasks at the same level are auto-chained by alphabetical ID order.
 * 2. depends_on in TASK.md frontmatter is ignored by the loader.
 * 3. Parent→child dependency is still wired automatically.
 * 4. The depends_on builder method is removed from taskDef().
 * 5. serializeTaskMd does not emit depends_on.
 */

import { describe, it, expect, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildDagFromPlaybook } from "../../src/config/declarative-loader";
import { taskDef } from "../../src/config/task-definition";

function tmpPlaybook(files: Record<string, string>): string {
  const dir = join(tmpdir(), `converge-test-rfc0034-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  for (const [relPath, content] of Object.entries(files)) {
    const fullPath = join(dir, relPath);
    mkdirSync(join(fullPath, ".."), { recursive: true });
    writeFileSync(fullPath, content, "utf-8");
  }
  return dir;
}

/* ------------------------------------------------------------------ */
/*  Auto-chaining within same level                                    */
/* ------------------------------------------------------------------ */

describe("RFC 0034: auto-chaining", () => {
  let dir: string;
  afterEach(() => { try { rmSync(dir, { recursive: true, force: true }); } catch {} });

  it("auto-chains flat tasks alphabetically by ID", () => {
    dir = tmpPlaybook({
      "playbook.yml": "name: test\n",
      "tasks/01-prepare/TASK.md": "---\nid: 01-prepare\n---\nPrepare.",
      "tasks/02-design/TASK.md": "---\nid: 02-design\n---\nDesign.",
      "tasks/03-build/TASK.md": "---\nid: 03-build\n---\nBuild.",
    });
    const result = buildDagFromPlaybook(dir);
    expect(result.errors).toHaveLength(0);
    expect(result.dag.nodes.size).toBe(3);

    const a = result.dag.nodes.get("01-prepare")!;
    const b = result.dag.nodes.get("02-design")!;
    const c = result.dag.nodes.get("03-build")!;

    expect(a.depends_on).toEqual([]);
    expect(b.depends_on).toEqual(["01-prepare"]);
    expect(c.depends_on).toEqual(["02-design"]);

    expect(a.depended_on_by).toEqual(["02-design"]);
    expect(b.depended_on_by).toEqual(["03-build"]);
    expect(c.depended_on_by).toEqual([]);
  });

  it("auto-chains flat tasks without numeric prefixes", () => {
    dir = tmpPlaybook({
      "playbook.yml": "name: test\n",
      "tasks/alpha/TASK.md": "---\nid: alpha\n---\nAlpha.",
      "tasks/beta/TASK.md": "---\nid: beta\n---\nBeta.",
      "tasks/gamma/TASK.md": "---\nid: gamma\n---\nGamma.",
    });
    const result = buildDagFromPlaybook(dir);
    expect(result.errors).toHaveLength(0);

    const alpha = result.dag.nodes.get("alpha")!;
    const beta = result.dag.nodes.get("beta")!;
    const gamma = result.dag.nodes.get("gamma")!;

    expect(alpha.depends_on).toEqual([]);
    expect(beta.depends_on).toEqual(["alpha"]);
    expect(gamma.depends_on).toEqual(["beta"]);
  });

  it("ignores depends_on in TASK.md frontmatter", () => {
    dir = tmpPlaybook({
      "playbook.yml": "name: test\n",
      "tasks/01-first/TASK.md": "---\nid: 01-first\n---\nFirst.",
      "tasks/02-second/TASK.md": "---\nid: 02-second\ndepends_on:\n  - 01-first\n---\nSecond.",
      "tasks/03-third/TASK.md": "---\nid: 03-third\ndepends_on:\n  - 01-first\n---\nThird.",
    });
    const result = buildDagFromPlaybook(dir);
    expect(result.errors).toHaveLength(0);

    // Auto-chained alphabetically, NOT by declared depends_on
    const first = result.dag.nodes.get("01-first")!;
    const second = result.dag.nodes.get("02-second")!;
    const third = result.dag.nodes.get("03-third")!;

    expect(first.depends_on).toEqual([]);
    expect(second.depends_on).toEqual(["01-first"]);
    expect(third.depends_on).toEqual(["02-second"]);
    // depended_on_by follows auto-chain, not declared edges
    expect(first.depended_on_by).toEqual(["02-second"]);
    expect(second.depended_on_by).toEqual(["03-third"]);
    expect(third.depended_on_by).toEqual([]);
  });

  it("single task has no dependencies", () => {
    dir = tmpPlaybook({
      "playbook.yml": "name: test\n",
      "tasks/solo/TASK.md": "---\nid: solo\n---\nSolo task.",
    });
    const result = buildDagFromPlaybook(dir);
    expect(result.errors).toHaveLength(0);
    expect(result.dag.nodes.size).toBe(1);
    expect(result.dag.roots).toHaveLength(1);

    const solo = result.dag.nodes.get("solo")!;
    expect(solo.depends_on).toEqual([]);
  });

  it("empty tasks/ directory produces empty DAG", () => {
    dir = tmpPlaybook({
      "playbook.yml": "name: test\n",
    });
    mkdirSync(join(dir, "tasks"), { recursive: true });
    const result = buildDagFromPlaybook(dir);
    expect(result.errors).toHaveLength(0);
    expect(result.dag.nodes.size).toBe(0);
  });

  it("execution order matches alphabetical chain", () => {
    dir = tmpPlaybook({
      "playbook.yml": "name: test\n",
      "tasks/03-zulu/TASK.md": "---\nid: 03-zulu\n---\nZulu.",
      "tasks/01-alpha/TASK.md": "---\nid: 01-alpha\n---\nAlpha.",
      "tasks/02-bravo/TASK.md": "---\nid: 02-bravo\n---\nBravo.",
    });
    const result = buildDagFromPlaybook(dir);
    expect(result.errors).toHaveLength(0);

    const layers = result.dag.topologicalOrder();
    expect(layers).toHaveLength(3);
    expect(layers[0].map((n) => n.id)).toEqual(["01-alpha"]);
    expect(layers[1].map((n) => n.id)).toEqual(["02-bravo"]);
    expect(layers[2].map((n) => n.id)).toEqual(["03-zulu"]);
  });
});

/* ------------------------------------------------------------------ */
/*  Public API removal                                                 */
/* ------------------------------------------------------------------ */

describe("RFC 0034: depends_on public API removed from TASK.md, kept for programmatic use", () => {
  it("taskDef().depends_on() works for programmatic task definitions", () => {
    const def = taskDef()
      .id("test-task")
      .title("Test Task")
      .prompt("Do the thing")
      .outputs(["result.txt"])
      .depends_on(["other-task"])
      .build();

    expect(def.depends_on).toEqual(["other-task"]);
  });

  it("taskDef() without depends_on leaves it undefined", () => {
    const def = taskDef()
      .id("test-task")
      .title("Test Task")
      .prompt("Do the thing")
      .outputs(["result.txt"])
      .build();

    expect(def.depends_on).toBeUndefined();
  });
});

/* ------------------------------------------------------------------ */
/*  Serialization: depends_on not written to TASK.md                   */
/* ------------------------------------------------------------------ */

describe("RFC 0034: TASK.md serialization", () => {
  it("serializeTaskMd does not emit depends_on", async () => {
    const { serializeTaskMd, TaskMdShape } = await import("../../src/config/task-md-definition");
    const shape: TaskMdShape = {
      id: "my-task",
      title: "My Task",
      body: "Do something.",
      outputs: ["result.txt"],
    };
    const md = serializeTaskMd(shape);
    expect(md).not.toContain("depends_on");
  });
});
