/**
 * RFC 0049 — compile enumerates the nested `tasks/` tree.
 *
 * `bootstrapInventoryFromDisk` and `syncStaticTasksFromDisk` walk
 * `tasks/<id>/tasks/<child>/.../TASK.md` and emit one row per task with
 * `parent` set when nested and a per-parent-group sibling chain
 * (RFC 0034). These tests verify the inventory shape only.
 */
import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  bootstrapInventoryFromDisk,
  syncStaticTasksFromDisk,
} from "../../../src/run/playbook-compile";
import type { UnifiedRuntimeTask } from "../../../src/task/goal/unified-tasks";

function tmpPlaybook(files: Record<string, string>): string {
  const dir = join(
    tmpdir(),
    `converge-inv-nested-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(dir, { recursive: true });
  for (const [relPath, content] of Object.entries(files)) {
    const fullPath = join(dir, relPath);
    mkdirSync(join(fullPath, ".."), { recursive: true });
    writeFileSync(fullPath, content, "utf-8");
  }
  return dir;
}

function readInventory(dir: string): {
  header: Record<string, unknown>;
  tasks: UnifiedRuntimeTask[];
} {
  const tasksFile = join(dir, "_inventory", "tasks.jsonl");
  const raw = readFileSync(tasksFile, "utf-8");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  expect(lines.length).toBeGreaterThan(0);
  const header = JSON.parse(lines[0]);
  expect(header.kind).toBe("playbook");
  const tasks: UnifiedRuntimeTask[] = lines.slice(1).map((l) => JSON.parse(l));
  return { header, tasks };
}

describe("bootstrapInventoryFromDisk — nested tasks (RFC 0049 Phase A)", () => {
  it("single nested child: top-level + child rows", () => {
    const dir = tmpPlaybook({
      "playbook.yml": "name: default\n",
      "tasks/01-parent/TASK.md": "---\nid: 01-parent\n---\nParent.",
      "tasks/01-parent/tasks/02-child/TASK.md": "---\nid: 02-child\n---\nChild.",
    });
    try {
      bootstrapInventoryFromDisk(dir, join(dir, "_inventory"), "default");
      const { tasks } = readInventory(dir);
      expect(tasks).toHaveLength(2);

      const parent = tasks.find((t) => t.id === "01-parent")!;
      const child = tasks.find((t) => t.id === "02-child")!;
      expect(parent).toBeDefined();
      expect(child).toBeDefined();
      expect(parent.parent).toBeUndefined();
      expect(child.parent).toBe("01-parent");
      expect(parent.depends_on).toEqual([]);
      expect(child.depends_on).toEqual([]);
      expect(parent.taskRef).toEqual({ kind: "static", dir: "tasks/01-parent" });
      expect(child.taskRef).toEqual({
        kind: "static",
        dir: "tasks/01-parent/tasks/02-child",
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("two siblings under one parent: RFC 0034 chain per parent group", () => {
    const dir = tmpPlaybook({
      "playbook.yml": "name: default\n",
      "tasks/01-parent/TASK.md": "---\nid: 01-parent\n---\nP.",
      "tasks/01-parent/tasks/01-alpha/TASK.md": "---\nid: 01-alpha\n---\nA.",
      "tasks/01-parent/tasks/02-bravo/TASK.md": "---\nid: 02-bravo\n---\nB.",
    });
    try {
      bootstrapInventoryFromDisk(dir, join(dir, "_inventory"), "default");
      const { tasks } = readInventory(dir);
      expect(tasks).toHaveLength(3);
      const alpha = tasks.find((t) => t.id === "01-alpha")!;
      const bravo = tasks.find((t) => t.id === "02-bravo")!;
      expect(alpha.parent).toBe("01-parent");
      expect(bravo.parent).toBe("01-parent");
      expect(alpha.depends_on).toEqual([]); // first
      expect(bravo.depends_on).toEqual(["01-alpha"]); // chained to prev sibling
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("two levels of nesting: each level gets its own parent + chain", () => {
    const dir = tmpPlaybook({
      "playbook.yml": "name: default\n",
      "tasks/01-parent/TASK.md": "---\nid: 01-parent\n---\nP.",
      "tasks/01-parent/tasks/01-child/TASK.md": "---\nid: 01-child\n---\nC.",
      "tasks/01-parent/tasks/01-child/tasks/01-grandchild/TASK.md":
        "---\nid: 01-grandchild\n---\nG.",
    });
    try {
      bootstrapInventoryFromDisk(dir, join(dir, "_inventory"), "default");
      const { tasks } = readInventory(dir);
      expect(tasks).toHaveLength(3);
      const parent = tasks.find((t) => t.id === "01-parent")!;
      const child = tasks.find((t) => t.id === "01-child")!;
      const grand = tasks.find((t) => t.id === "01-grandchild")!;
      expect(parent.parent).toBeUndefined();
      expect(child.parent).toBe("01-parent");
      expect(grand.parent).toBe("01-child");
      // Each is a singleton in its group, so all chains are empty.
      expect(parent.depends_on).toEqual([]);
      expect(child.depends_on).toEqual([]);
      expect(grand.depends_on).toEqual([]);
      expect(grand.taskRef).toEqual({
        kind: "static",
        dir: "tasks/01-parent/tasks/01-child/tasks/01-grandchild",
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("mixed top-level and nested: top-level chain preserved, nested has parent", () => {
    const dir = tmpPlaybook({
      "playbook.yml": "name: default\n",
      "tasks/01-a/TASK.md": "---\nid: 01-a\n---\nA.",
      "tasks/01-a/tasks/02-b/TASK.md": "---\nid: 02-b\n---\nB.",
      "tasks/03-c/TASK.md": "---\nid: 03-c\n---\nC.",
    });
    try {
      bootstrapInventoryFromDisk(dir, join(dir, "_inventory"), "default");
      const { tasks } = readInventory(dir);
      expect(tasks).toHaveLength(3);
      const a = tasks.find((t) => t.id === "01-a")!;
      const b = tasks.find((t) => t.id === "02-b")!;
      const c = tasks.find((t) => t.id === "03-c")!;
      // Top-level chain: 01-a (root) → 03-c (next top-level sibling).
      expect(a.parent).toBeUndefined();
      expect(a.depends_on).toEqual([]);
      expect(c.parent).toBeUndefined();
      expect(c.depends_on).toEqual(["01-a"]);
      // Nested row: parent=01-a, no chain (singleton in its group).
      expect(b.parent).toBe("01-a");
      expect(b.depends_on).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("taskRef.dir uses the on-disk relative path (not just the basename)", () => {
    const dir = tmpPlaybook({
      "playbook.yml": "name: default\n",
      "tasks/01-a/TASK.md": "---\nid: 01-a\n---\nA.",
      "tasks/01-a/tasks/02-b/TASK.md": "---\nid: 02-b\n---\nB.",
    });
    try {
      bootstrapInventoryFromDisk(dir, join(dir, "_inventory"), "default");
      const { tasks } = readInventory(dir);
      const nested = tasks.find((t) => t.id === "02-b")!;
      expect(nested.taskRef).toEqual({
        kind: "static",
        dir: "tasks/01-a/tasks/02-b",
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("kebab-case nested id is accepted inside a tasks/ wrapper", () => {
    const dir = tmpPlaybook({
      "playbook.yml": "name: default\n",
      "tasks/01-setup/TASK.md": "---\nid: 01-setup\n---\nSetup.",
      "tasks/01-setup/tasks/work-showcase/TASK.md":
        "---\nid: work-showcase\n---\nShowcase.",
    });
    try {
      bootstrapInventoryFromDisk(dir, join(dir, "_inventory"), "default");
      const { tasks } = readInventory(dir);
      expect(tasks).toHaveLength(2);
      const showcase = tasks.find((t) => t.id === "work-showcase")!;
      expect(showcase.parent).toBe("01-setup");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("skips `seeds`/`templates`/`_*` directories at every level", () => {
    const dir = tmpPlaybook({
      "playbook.yml": "name: default\n",
      "tasks/01-parent/TASK.md": "---\nid: 01-parent\n---\nP.",
      "tasks/01-parent/seeds/something/TASK.md": "---\nid: something\n---\nSeed.",
      "tasks/01-parent/templates/something/TASK.md":
        "---\nid: something\n---\nTemplate.",
      "tasks/01-parent/_hidden/TASK.md": "---\nid: _hidden\n---\nHidden.",
    });
    try {
      bootstrapInventoryFromDisk(dir, join(dir, "_inventory"), "default");
      const { tasks } = readInventory(dir);
      // Only `01-parent` should be discovered.
      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe("01-parent");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("header is built from playbook.yml", () => {
    const dir = tmpPlaybook({
      "playbook.yml": "name: nested-test\ndescription: A test\n",
      "tasks/01-a/TASK.md": "---\nid: 01-a\n---\nA.",
    });
    try {
      bootstrapInventoryFromDisk(dir, join(dir, "_inventory"), "default");
      const { header } = readInventory(dir);
      expect(header.name).toBe("nested-test");
      expect(header.description).toBe("A test");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("syncStaticTasksFromDisk — nested additions (RFC 0049 Phase A)", () => {
  it("appends a new nested task not already in the inventory", () => {
    const dir = tmpPlaybook({
      "playbook.yml": "name: default\n",
      "tasks/01-parent/TASK.md": "---\nid: 01-parent\n---\nP.",
      "tasks/01-parent/tasks/01-child/TASK.md": "---\nid: 01-child\n---\nC.",
    });
    try {
      const invDir = join(dir, "_inventory");
      mkdirSync(invDir, { recursive: true });
      writeFileSync(
        join(invDir, "tasks.jsonl"),
        [
          JSON.stringify({
            kind: "playbook",
            schemaVersion: 1,
            name: "default",
            createdAt: "2025-01-01T00:00:00Z",
            updatedAt: "2025-01-01T00:00:00Z",
          }),
          JSON.stringify({
            kind: "task",
            id: "01-parent",
            taskRef: { kind: "static", dir: "tasks/01-parent" },
            depends_on: [],
            status: "todo",
            source: "static",
            playbook: "default",
            createdAt: "2025-01-01T00:00:00Z",
            updatedAt: "2025-01-01T00:00:00Z",
          }),
        ].join("\n") + "\n",
        "utf-8",
      );

      syncStaticTasksFromDisk(dir, invDir, "default");
      const { tasks } = readInventory(dir);
      expect(tasks).toHaveLength(2);
      const child = tasks.find((t) => t.id === "01-child")!;
      expect(child.parent).toBe("01-parent");
      expect(child.depends_on).toEqual([]); // sync is append-only, no chain
      expect(child.taskRef).toEqual({
        kind: "static",
        dir: "tasks/01-parent/tasks/01-child",
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("preserves the existing header and known rows verbatim", () => {
    const dir = tmpPlaybook({
      "playbook.yml": "name: default\n",
      "tasks/01-parent/TASK.md": "---\nid: 01-parent\n---\nP.",
      "tasks/01-parent/tasks/01-child/TASK.md": "---\nid: 01-child\n---\nC.",
    });
    try {
      const invDir = join(dir, "_inventory");
      mkdirSync(invDir, { recursive: true });
      const originalHeader = {
        kind: "playbook",
        schemaVersion: 1,
        name: "PRESERVED",
        createdAt: "1999-12-31T23:59:59Z",
        updatedAt: "1999-12-31T23:59:59Z",
      };
      writeFileSync(
        join(invDir, "tasks.jsonl"),
        [
          JSON.stringify(originalHeader),
          JSON.stringify({
            kind: "task",
            id: "01-parent",
            taskRef: { kind: "static", dir: "tasks/01-parent" },
            depends_on: [],
            status: "todo",
            source: "static",
            playbook: "PRESERVED",
            createdAt: "1999-12-31T23:59:59Z",
            updatedAt: "1999-12-31T23:59:59Z",
          }),
        ].join("\n") + "\n",
        "utf-8",
      );

      syncStaticTasksFromDisk(dir, invDir, "default");
      const raw = readFileSync(join(invDir, "tasks.jsonl"), "utf-8");
      const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
      const header = JSON.parse(lines[0]);
      // Original header survives the rewrite.
      expect(header.name).toBe("PRESERVED");
      expect(header.createdAt).toBe("1999-12-31T23:59:59Z");
      // Order: header, then existing row, then new rows.
      const ids = lines.slice(1).map((l) => JSON.parse(l).id);
      expect(ids).toEqual(["01-parent", "01-child"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("does not re-emit rows for already-known ids", () => {
    const dir = tmpPlaybook({
      "playbook.yml": "name: default\n",
      "tasks/01-parent/TASK.md": "---\nid: 01-parent\n---\nP.",
      "tasks/01-parent/tasks/01-child/TASK.md": "---\nid: 01-child\n---\nC.",
    });
    try {
      const invDir = join(dir, "_inventory");
      mkdirSync(invDir, { recursive: true });
      const makeRow = (id: string) =>
        JSON.stringify({
          kind: "task",
          id,
          taskRef: {
            kind: "static",
            dir: id === "01-parent" ? "tasks/01-parent" : "tasks/01-parent/tasks/01-child",
          },
          parent: id === "01-parent" ? undefined : "01-parent",
          depends_on: [],
          status: "todo",
          source: "static",
          playbook: "default",
          createdAt: "2025-01-01T00:00:00Z",
          updatedAt: "2025-01-01T00:00:00Z",
        });
      writeFileSync(
        join(invDir, "tasks.jsonl"),
        [
          JSON.stringify({
            kind: "playbook",
            schemaVersion: 1,
            name: "default",
            createdAt: "2025-01-01T00:00:00Z",
            updatedAt: "2025-01-01T00:00:00Z",
          }),
          makeRow("01-parent"),
          makeRow("01-child"),
        ].join("\n") + "\n",
        "utf-8",
      );

      syncStaticTasksFromDisk(dir, invDir, "default");
      const raw = readFileSync(join(invDir, "tasks.jsonl"), "utf-8");
      const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
      // No new rows; just header + the 2 existing rows.
      expect(lines).toHaveLength(3);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("preserves legacy rows the strict parser would skip (root-* sentinels)", () => {
    const dir = tmpPlaybook({
      "playbook.yml": "name: default\n",
      "tasks/01-parent/TASK.md": "---\nid: 01-parent\n---\nP.",
    });
    try {
      const invDir = join(dir, "_inventory");
      mkdirSync(invDir, { recursive: true });
      const legacySentinel = JSON.stringify({
        id: "root-converge",
        type: "converge",
        depends_on: ["01-parent"],
      });
      writeFileSync(
        join(invDir, "tasks.jsonl"),
        [
          JSON.stringify({
            kind: "playbook",
            schemaVersion: 1,
            name: "default",
            createdAt: "2025-01-01T00:00:00Z",
            updatedAt: "2025-01-01T00:00:00Z",
          }),
          legacySentinel,
          JSON.stringify({
            kind: "task",
            id: "01-parent",
            taskRef: { kind: "static", dir: "tasks/01-parent" },
            depends_on: [],
            status: "todo",
            source: "static",
            playbook: "default",
            createdAt: "2025-01-01T00:00:00Z",
            updatedAt: "2025-01-01T00:00:00Z",
          }),
        ].join("\n") + "\n",
        "utf-8",
      );

      syncStaticTasksFromDisk(dir, invDir, "default");
      const raw = readFileSync(join(invDir, "tasks.jsonl"), "utf-8");
      // The legacy sentinel line survives the rewrite.
      expect(raw).toContain('"id":"root-converge"');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("no-op when no new tasks exist on disk", () => {
    const dir = tmpPlaybook({
      "playbook.yml": "name: default\n",
      "tasks/01-parent/TASK.md": "---\nid: 01-parent\n---\nP.",
    });
    try {
      const invDir = join(dir, "_inventory");
      mkdirSync(invDir, { recursive: true });
      const originalContent =
        JSON.stringify({
          kind: "playbook",
          schemaVersion: 1,
          name: "default",
          createdAt: "2025-01-01T00:00:00Z",
          updatedAt: "2025-01-01T00:00:00Z",
        }) +
        "\n" +
        JSON.stringify({
          kind: "task",
          id: "01-parent",
          taskRef: { kind: "static", dir: "tasks/01-parent" },
          depends_on: [],
          status: "todo",
          source: "static",
          playbook: "default",
          createdAt: "2025-01-01T00:00:00Z",
          updatedAt: "2025-01-01T00:00:00Z",
        }) +
        "\n";
      writeFileSync(join(invDir, "tasks.jsonl"), originalContent, "utf-8");

      syncStaticTasksFromDisk(dir, invDir, "default");
      const after = readFileSync(join(invDir, "tasks.jsonl"), "utf-8");
      expect(after).toBe(originalContent);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("bootstrapInventoryFromDisk — idempotent / no-op", () => {
  it("does not overwrite an existing inventory", () => {
    const dir = tmpPlaybook({
      "playbook.yml": "name: default\n",
      "tasks/01/TASK.md": "---\nid: 01\n---\nA.",
    });
    try {
      const invDir = join(dir, "_inventory");
      mkdirSync(invDir, { recursive: true });
      const preexisting = "SENTINEL CONTENT — DO NOT OVERWRITE\n";
      writeFileSync(join(invDir, "tasks.jsonl"), preexisting, "utf-8");

      bootstrapInventoryFromDisk(dir, invDir, "default");
      const after = readFileSync(join(invDir, "tasks.jsonl"), "utf-8");
      // Bootstrap must not touch the file when it already exists.
      expect(after).toBe(preexisting);
      expect(existsSync(join(invDir, "tasks.jsonl"))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("no-op when there is no tasks/ directory", () => {
    const dir = tmpPlaybook({
      "playbook.yml": "name: default\n",
    });
    try {
      const invDir = join(dir, "_inventory");
      mkdirSync(invDir, { recursive: true });
      bootstrapInventoryFromDisk(dir, invDir, "default");
      expect(existsSync(join(invDir, "tasks.jsonl"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
