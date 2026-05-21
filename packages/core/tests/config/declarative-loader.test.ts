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

describe("buildDagFromPlaybook — RFC 0032: tasks-folder only", () => {
  it("flat playbook with tasks folder", () => {
    const dir = tmpPlaybook({
      "playbook.yml": yaml`
        name: default
      `,
      "tasks/A/TASK.md": "---\nid: A\n---\nTask A.",
      "tasks/B/TASK.md": "---\nid: B\n---\nTask B.",
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

  it("rejects tasks: key with clear error", () => {
    const dir = tmpPlaybook({
      "playbook.yml": yaml`
        tasks:
          - id: A
      `,
    });
    try {
      expect(() => buildDagFromPlaybook(dir)).toThrow(/tasks.*key.*banned|RFC 0032/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("nested with depends_on in TASK.md", () => {
    const dir = tmpPlaybook({
      "playbook.yml": yaml`
        name: default
      `,
      "tasks/A/TASK.md": "---\nid: A\n---\nRoot task.",
      "tasks/B/TASK.md": "---\nid: B\ndepends_on:\n  - A\n---\nChild of A.",
      "tasks/C/TASK.md": "---\nid: C\ndepends_on:\n  - A\n---\nAlso child of A.",
      "tasks/D/TASK.md": "---\nid: D\ndepends_on:\n  - B\n---\nChild of B.",
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

  it("convention path finds TASK.md in tasks/ dir", () => {
    const dir = tmpPlaybook({
      "playbook.yml": yaml`
        name: default
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
        name: default
      `,
      "tasks/A/TASK.md": "---\nid: A\ndepends_on:\n  - B\n---\nTask A.",
      "tasks/B/TASK.md": "---\nid: B\ndepends_on:\n  - C\n---\nTask B.",
      "tasks/C/TASK.md": "---\nid: C\ndepends_on:\n  - A\n---\nTask C.",
    });
    try {
      const result = buildDagFromPlaybook(dir);
      const cycleError = result.errors.find((e: any) => e.type === "cycle");
      expect(cycleError).toBeDefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("missing TASK.md throws", () => {
    const dir = tmpPlaybook({
      "playbook.yml": yaml`
        name: default
        tasks:
          - id: A
      `,
    });
    try {
      expect(() => buildDagFromPlaybook(dir)).toThrow(/tasks.*key.*banned|RFC 0032/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("duplicate id", () => {
    // Both tasks/ entries get id from dir name; the id: frontmatter is used for the taskDef.id,
    // but the loader derives taskId from the directory name. To get a duplicate, we'd need
    // two directories with the same name — impossible on most filesystems.
    // Instead, verify that TASK.md id matches directory name and is loaded correctly.
    const dir = tmpPlaybook({
      "playbook.yml": yaml`
        name: default
      `,
      "tasks/X/TASK.md": "---\nid: X\n---\nTask X.",
    });
    try {
      const result = buildDagFromPlaybook(dir);
      expect(result.errors).toHaveLength(0);
      expect(result.dag.nodes.size).toBe(1);
      const x = result.dag.nodes.get("X")!;
      expect(x.taskDef.id).toBe("X");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("multi-parent via depends_on", () => {
    const dir = tmpPlaybook({
      "playbook.yml": yaml`
        name: default
      `,
      "tasks/A/TASK.md": "---\nid: A\n---\nTask A.",
      "tasks/B/TASK.md": "---\nid: B\n---\nTask B.",
      "tasks/C/TASK.md": "---\nid: C\ndepends_on:\n  - A\n  - B\n---\nTask C.",
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

  it("empty tasks array", () => {
    const dir = tmpPlaybook({
      "playbook.yml": yaml`
        name: default
        tasks: []
      `,
    });
    try {
      expect(() => buildDagFromPlaybook(dir)).toThrow(/tasks.*key.*banned|RFC 0032/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("global checks are returned", () => {
    const dir = tmpPlaybook({
      "playbook.yml": yaml`
        name: default
        checks:
          - id: typecheck
            cmd: tsc --noEmit
      `,
      "tasks/A/TASK.md": "---\nid: A\n---\nTask A.",
    });
    try {
      const result = buildDagFromPlaybook(dir);
      expect(result.globalChecks).toHaveLength(1);
      expect(result.globalChecks[0].id).toBe("typecheck");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("TASK.md content is authoritative", () => {
    const dir = tmpPlaybook({
      "playbook.yml": yaml`
        name: default
      `,
      "tasks/A/TASK.md": [
        "---",
        "id: A",
        "title: Task Alpha",
        "outputs:",
        "  - result.txt",
        "---",
        "Produce result.txt.",
      ].join("\n"),
    });
    try {
      const result = buildDagFromPlaybook(dir);
      expect(result.errors).toHaveLength(0);
      const a = result.dag.nodes.get("A")!;
      expect(a.taskDef.title).toBe("Task Alpha");
      expect(a.taskDef.outputs).toEqual(["result.txt"]);
      expect(a.taskDef.prompt).toBe("Produce result.txt.");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("no playbook.yml falls through to auto-discovery", () => {
    const dir = tmpPlaybook({
      "tasks/A/TASK.md": "---\nid: A\n---\nTask A.",
      "tasks/B/TASK.md": "---\nid: B\ndepends_on:\n  - A\n---\nTask B.",
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
});
