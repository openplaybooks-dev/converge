/**
 * Folder-playbook DAG build via the unified inventory path
 * (`buildDagFromInventory`). After the legacy `declarative-loader` was
 * removed, this is the single folder-based loader: it bootstraps `tasks.jsonl`
 * from the `tasks/` folder, then builds the DAG from the unified inventory.
 *
 * The RFC-0032 `tasks:`-key rejection that the old legacy loader enforced is
 * gone by construction — the unified loader sources tasks from the folder /
 * inventory and never reads a `tasks:` block from `playbook.yml`.
 */
import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildDagFromInventory } from "../../src/run/playbook-compile";

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

// Build through the unified inventory (single folder loader). The playbook dir
// doubles as the project root for the test; the inventory lives in a sibling
// temp dir so the bootstrap writes a fresh tasks.jsonl on each call.
function buildDag(dir: string) {
  return buildDagFromInventory(dir, join(dir, "_inventory"), "default");
}

describe("buildDagFromInventory — folder playbook (RFC 0031/0034)", () => {
  it("flat playbook with tasks folder", () => {
    const dir = tmpPlaybook({
      "playbook.yml": yaml`
        name: default
      `,
      "tasks/A/TASK.md": "---\nid: A\n---\nTask A.",
      "tasks/B/TASK.md": "---\nid: B\n---\nTask B.",
    });
    try {
      const result = buildDag(dir);
      expect(result.errors).toHaveLength(0);
      expect(result.dag.nodes.size).toBe(2);
      // RFC 0034: tasks are auto-chained alphabetically, so A is root and B depends on A
      const a = result.dag.nodes.get("A")!;
      const b = result.dag.nodes.get("B")!;
      expect(a.depends_on).toEqual([]);
      expect(b.depends_on).toEqual(["A"]);
      expect(a.depended_on_by).toEqual(["B"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("nested tasks auto-chained alphabetically (RFC 0034)", () => {
    const dir = tmpPlaybook({
      "playbook.yml": yaml`
        name: default
      `,
      "tasks/A/TASK.md": "---\nid: A\n---\nRoot task.",
      "tasks/B/TASK.md": "---\nid: B\n---\nAfter A.",
      "tasks/C/TASK.md": "---\nid: C\n---\nAfter B.",
      "tasks/D/TASK.md": "---\nid: D\n---\nAfter C.",
    });
    try {
      const result = buildDag(dir);
      expect(result.errors).toHaveLength(0);
      expect(result.dag.nodes.size).toBe(4);
      // RFC 0034: auto-chained alphabetically: A → B → C → D
      const layers = result.dag.topologicalOrder();
      expect(layers).toHaveLength(4);
      expect(layers[0].map((n) => n.id)).toEqual(["A"]);
      expect(layers[1].map((n) => n.id)).toEqual(["B"]);
      expect(layers[2].map((n) => n.id)).toEqual(["C"]);
      expect(layers[3].map((n) => n.id)).toEqual(["D"]);

      expect(result.dag.nodes.get("B")!.depends_on).toEqual(["A"]);
      expect(result.dag.nodes.get("C")!.depends_on).toEqual(["B"]);
      expect(result.dag.nodes.get("D")!.depends_on).toEqual(["C"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("ignores depends_on in TASK.md frontmatter (auto-chain wins)", () => {
    const dir = tmpPlaybook({
      "playbook.yml": yaml`
        name: default
      `,
      "tasks/01-first/TASK.md": "---\nid: 01-first\n---\nFirst.",
      "tasks/02-second/TASK.md": "---\nid: 02-second\ndepends_on:\n  - 01-first\n---\nSecond.",
      "tasks/03-third/TASK.md": "---\nid: 03-third\ndepends_on:\n  - 01-first\n---\nThird.",
    });
    try {
      const result = buildDag(dir);
      expect(result.errors).toHaveLength(0);
      expect(result.dag.nodes.get("01-first")!.depends_on).toEqual([]);
      expect(result.dag.nodes.get("02-second")!.depends_on).toEqual(["01-first"]);
      expect(result.dag.nodes.get("03-third")!.depends_on).toEqual(["02-second"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("convention path finds TASK.md in tasks/ dir; prompt from body", () => {
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
      const result = buildDag(dir);
      expect(result.errors).toHaveLength(0);
      expect(result.dag.nodes.size).toBe(1);
      const hello = result.dag.nodes.get("hello")!;
      expect(hello.taskDef.prompt).toBe("Write a greeting");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("single task id matches directory name", () => {
    const dir = tmpPlaybook({
      "playbook.yml": yaml`
        name: default
      `,
      "tasks/X/TASK.md": "---\nid: X\n---\nTask X.",
    });
    try {
      const result = buildDag(dir);
      expect(result.errors).toHaveLength(0);
      expect(result.dag.nodes.size).toBe(1);
      expect(result.dag.nodes.get("X")!.taskDef.id).toBe("X");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("global checks are carried through the inventory header", () => {
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
      const result = buildDag(dir);
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
      const result = buildDag(dir);
      expect(result.errors).toHaveLength(0);
      const a = result.dag.nodes.get("A")!;
      expect(a.taskDef.title).toBe("Task Alpha");
      expect(a.taskDef.outputs).toEqual(["result.txt"]);
      expect(a.taskDef.prompt).toBe("Produce result.txt.");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("handoff block survives the loader (RFC 0047)", () => {
    const dir = tmpPlaybook({
      "playbook.yml": "name: default\n",
      "tasks/A/TASK.md": [
        "---",
        "id: A",
        "outputs:",
        "  - out.json",
        "handoff:",
        "  artifact: out.preview.html",
        "  format: html",
        "---",
        "Body.",
      ].join("\n"),
    });
    try {
      const result = buildDag(dir);
      expect(result.errors).toHaveLength(0);
      const a = result.dag.nodes.get("A")!;
      expect(a.taskDef.handoff?.artifact).toBe("out.preview.html");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("no playbook.yml falls through to auto-discovery", () => {
    const dir = tmpPlaybook({
      "tasks/A/TASK.md": "---\nid: A\n---\nTask A.",
      "tasks/B/TASK.md": "---\nid: B\n---\nTask B.",
    });
    try {
      const result = buildDag(dir);
      expect(result.errors).toHaveLength(0);
      expect(result.dag.nodes.size).toBe(2);
      // RFC 0034: auto-chained alphabetically even without playbook.yml
      expect(result.dag.nodes.get("A")!.depends_on).toEqual([]);
      expect(result.dag.nodes.get("B")!.depends_on).toEqual(["A"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
