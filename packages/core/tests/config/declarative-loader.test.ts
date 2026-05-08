import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildDagFromPlaybook } from "../../src/config/declarative-loader";

function tmpPlaybook(files: Record<string, string>): string {
  const dir = join(tmpdir(), `converge-test-dag-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  for (const [relPath, content] of Object.entries(files)) {
    const fullPath = join(dir, relPath);
    mkdirSync(join(fullPath, ".."), { recursive: true });
    writeFileSync(fullPath, content, "utf-8");
  }
  return dir;
}

function yaml(strings: TemplateStringsArray, ...values: any[]): string {
  return String.raw(strings, ...values);
}

describe("buildDagFromPlaybook", () => {
  it("flat playbook with inline tasks", () => {
    const dir = tmpPlaybook({
      "playbook.yml": yaml`
        tasks:
          - id: A
            prompt: "Task A"
          - id: B
            prompt: "Task B"
      `,
    });
    try {
      const result = buildDagFromPlaybook(dir);
      expect(result.errors).toHaveLength(0);
      expect(result.dag.nodes.size).toBe(2);
      expect(result.dag.roots).toHaveLength(2);
      const a = result.dag.nodes.get("A")!;
      const b = result.dag.nodes.get("B")!;
      expect(a.depends_on).toEqual([]);
      expect(b.depends_on).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("nested with depends_on", () => {
    const dir = tmpPlaybook({
      "playbook.yml": yaml`
        tasks:
          - id: A
            prompt: "Root"
          - id: B
            depends_on: [A]
            prompt: "Child of A"
          - id: C
            depends_on: [A]
            prompt: "Also child of A"
          - id: D
            depends_on: [B]
            prompt: "Child of B"
      `,
    });
    try {
      const result = buildDagFromPlaybook(dir);
      expect(result.errors).toHaveLength(0);
      expect(result.dag.nodes.size).toBe(4);
      // Topological order: A first, then B and C, then D
      const layers = result.dag.topologicalOrder();
      expect(layers[0].map((n) => n.id)).toEqual(["A"]);

      const b = result.dag.nodes.get("B")!;
      expect(b.depends_on).toEqual(["A"]);
      const a = result.dag.nodes.get("A")!;
      expect(a.depended_on_by).toEqual(expect.arrayContaining(["B", "C"]));

      const d = result.dag.nodes.get("D")!;
      expect(d.depends_on).toEqual(["B"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("file reference loads external TASK.md", () => {
    const dir = tmpPlaybook({
      "playbook.yml": yaml`
        tasks:
          - id: A
            file: tasks/A/TASK.md
          - id: B
            depends_on: [A]
            file: tasks/B/TASK.md
      `,
      "tasks/A/TASK.md": [
        "---",
        "id: A",
        "---",
        "Task body for A.",
      ].join("\n"),
      "tasks/B/TASK.md": [
        "---",
        "id: B",
        "depends_on:",
        "  - A",
        "---",
        "Task body for B.",
      ].join("\n"),
    });
    try {
      const result = buildDagFromPlaybook(dir);
      expect(result.errors).toHaveLength(0);
      expect(result.dag.nodes.size).toBe(2);
      const b = result.dag.nodes.get("B")!;
      expect(b.depends_on).toEqual(["A"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("convention path finds TASK.md in tasks/ dir", () => {
    const dir = tmpPlaybook({
      "playbook.yml": yaml`
        tasks:
          - id: hello
      `,
      "tasks/hello/TASK.md": [
        "---",
        "id: hello",
        "---",
        "Write a greeting",
      ].join("\n"),
    });
    try {
      const result = buildDagFromPlaybook(dir);
      expect(result.errors).toHaveLength(0);
      expect(result.dag.nodes.size).toBe(1);
      const hello = result.dag.nodes.get("hello")!;
      // Prompt comes from TASK.md body (markdown after frontmatter)
      expect(hello.taskDef.prompt).toBe("Write a greeting");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("cycle detection", () => {
    const dir = tmpPlaybook({
      "playbook.yml": yaml`
        tasks:
          - id: A
            depends_on: [B]
          - id: B
            depends_on: [C]
          - id: C
            depends_on: [A]
      `,
    });
    try {
      const result = buildDagFromPlaybook(dir);
      const cycleError = result.errors.find((e: any) => e.type === "cycle");
      expect(cycleError).toBeDefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("missing file reference", () => {
    const dir = tmpPlaybook({
      "playbook.yml": yaml`
        tasks:
          - id: A
            file: nonexistent/TASK.md
      `,
    });
    try {
      const result = buildDagFromPlaybook(dir);
      // File not found is not an error — just a task with minimal stub
      expect(result.dag.nodes.size).toBe(1);
      const a = result.dag.nodes.get("A")!;
      expect(a.taskDef.prompt).toBe("");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("duplicate id", () => {
    const dir = tmpPlaybook({
      "playbook.yml": yaml`
        tasks:
          - id: X
          - id: X
      `,
    });
    try {
      expect(() => buildDagFromPlaybook(dir)).toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("multi-parent via depends_on", () => {
    const dir = tmpPlaybook({
      "playbook.yml": yaml`
        tasks:
          - id: A
          - id: B
          - id: C
            depends_on: [A, B]
      `,
    });
    try {
      const result = buildDagFromPlaybook(dir);
      expect(result.errors).toHaveLength(0);
      const c = result.dag.nodes.get("C")!;
      expect(c.depends_on).toEqual(expect.arrayContaining(["A", "B"]));
      const a = result.dag.nodes.get("A")!;
      expect(a.depended_on_by).toContain("C");
      const b = result.dag.nodes.get("B")!;
      expect(b.depended_on_by).toContain("C");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("depends_on creates correct execution order", () => {
    const dir = tmpPlaybook({
      "playbook.yml": yaml`
        tasks:
          - id: X
          - id: A
          - id: B
            depends_on: [A, X]
      `,
    });
    try {
      const result = buildDagFromPlaybook(dir);
      expect(result.errors).toHaveLength(0);
      const b = result.dag.nodes.get("B")!;
      expect(b.depends_on).toContain("X");
      expect(b.depends_on).toContain("A");
      const x = result.dag.nodes.get("X")!;
      expect(x.depended_on_by).toContain("B");

      // Topological order: X and A in layer 0, B in layer 1
      const layers = result.dag.topologicalOrder();
      expect(layers[0].map((n) => n.id)).toEqual(expect.arrayContaining(["X", "A"]));
      expect(layers[1].map((n) => n.id)).toEqual(["B"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("empty tasks array", () => {
    const dir = tmpPlaybook({
      "playbook.yml": "tasks: []\n",
    });
    try {
      const result = buildDagFromPlaybook(dir);
      expect(result.dag.nodes.size).toBe(0);
      expect(result.dag.roots).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("global checks are returned", () => {
    const dir = tmpPlaybook({
      "playbook.yml": yaml`
        tasks:
          - id: A
        checks:
          - id: typecheck
            cmd: tsc --noEmit
      `,
    });
    try {
      const result = buildDagFromPlaybook(dir);
      expect(result.globalChecks).toHaveLength(1);
      expect(result.globalChecks[0].id).toBe("typecheck");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("inline fields override file fields", () => {
    const dir = tmpPlaybook({
      "playbook.yml": yaml`
        tasks:
          - id: A
            file: tasks/A/TASK.md
            prompt: "Override prompt"
      `,
      "tasks/A/TASK.md": [
        "---",
        "id: A",
        "prompt: Original prompt",
        "---",
        "Task body.",
      ].join("\n"),
    });
    try {
      const result = buildDagFromPlaybook(dir);
      const a = result.dag.nodes.get("A")!;
      expect(a.taskDef.prompt).toBe("Override prompt");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("buildDagFromPlaybook — depends_on from playbook.yml", () => {
  it("reads depends_on from playbook.yml for inline tasks without TASK.md", () => {
    const dir = tmpPlaybook({
      "playbook.yml": yaml`
        tasks:
          - id: A
            prompt: "Root"
          - id: B
            depends_on: [A]
            prompt: "Child"
      `,
    });
    try {
      const result = buildDagFromPlaybook(dir);
      expect(result.errors).toHaveLength(0);
      expect(result.dag.nodes.size).toBe(2);
      const b = result.dag.nodes.get("B")!;
      expect(b.depends_on).toEqual(["A"]);
      const a = result.dag.nodes.get("A")!;
      expect(a.depended_on_by).toContain("B");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("playbook.yml depends_on is overridden by TASK.md depends_on", () => {
    const dir = tmpPlaybook({
      "playbook.yml": yaml`
        tasks:
          - id: A
          - id: B
            depends_on: [A]
            file: tasks/B/TASK.md
      `,
      "tasks/B/TASK.md": [
        "---",
        "id: B",
        "depends_on:",
        "  - A",
        "  - C",
        "---",
        "Task body.",
      ].join("\n"),
    });
    try {
      const result = buildDagFromPlaybook(dir);
      const b = result.dag.nodes.get("B")!;
      // playbook.yml entry.depends_on takes priority
      expect(b.depends_on).toEqual(["A"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("no depends_on in playbook.yml falls through to TASK.md", () => {
    const dir = tmpPlaybook({
      "playbook.yml": yaml`
        tasks:
          - id: A
          - id: B
      `,
      "tasks/B/TASK.md": [
        "---",
        "id: B",
        "depends_on:",
        "  - A",
        "---",
        "Task body.",
      ].join("\n"),
    });
    try {
      const result = buildDagFromPlaybook(dir);
      const b = result.dag.nodes.get("B")!;
      expect(b.depends_on).toEqual(["A"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
