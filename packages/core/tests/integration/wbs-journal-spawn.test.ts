/**
 * Integration: SeedExecutor writes spawned children into the journal in the
 * same shape the playbook uses (mirror 1:1, `tasks/` nesting) AND the tree
 * builder discovers them correctly, including:
 *   - a user-defined child + two WBS-spawned children at the same level
 *   - a re-WBS (spawn-of-spawn) grandchild
 *
 * Also verifies seeder tasks do NOT get an `attempts/` dir.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { SeedExecutor } from "../../src/executor/seed-executor.ts";
import { TaskTree } from "../../src/task/tree/task-tree.ts";

const savedPlaybook = process.env.CONVERGE_PLAYBOOK;
let ROOT: string;

function plant(path: string, body: string) {
  mkdirSync(path.substring(0, path.lastIndexOf("/")), { recursive: true });
  writeFileSync(path, body);
}

function collectIds(tree: TaskTree): string[] {
  const out: string[] = [];
  const walk = (n: any) => {
    const id = n.unit?.id ?? n.id;
    if (id && id !== "__root__") out.push(id);
    for (const c of n.children) walk(c);
  };
  walk(tree.root);
  return out;
}

describe("WBS journal spawn + tree build", () => {
  beforeEach(() => {
    ROOT = join(tmpdir(), `converge-wbs-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    rmSync(ROOT, { recursive: true, force: true });
    mkdirSync(ROOT, { recursive: true });
    process.env.CONVERGE_PLAYBOOK = "default";
  });

  afterEach(() => {
    rmSync(ROOT, { recursive: true, force: true });
    if (savedPlaybook === undefined) delete process.env.CONVERGE_PLAYBOOK;
    else process.env.CONVERGE_PLAYBOOK = savedPlaybook;
  });

  it("writes spawned children to .converge/journal/{pb}/tasks/{parent}/tasks/{child}/TASK.md", async () => {
    const pb = join(ROOT, ".converge/playbooks/default");
    plant(join(pb, "playbook.yml"), "name: default\n");
    plant(join(pb, "tasks/parent/TASK.md"), "---\nid: parent\ntitle: Parent\n---\n");

    const executor = new SeedExecutor(
      ROOT,
      { epicId: "parent", taskId: "parent" },
      join(pb, "tasks/parent"),
      { id: "parent", title: "Parent" },
    );

    const result = await executor.run(async (ctx: any) => {
      await ctx.spawn({ id: "spawn-a", title: "Spawn A" }, { id: "spawn-a" });
      await ctx.spawn({ id: "spawn-b", title: "Spawn B" }, { id: "spawn-b" });
    }, 1);

    expect(result.spawnCount).toBe(2);

    const { existsSync } = await import("node:fs");
    const aPath = join(ROOT, ".converge/journal/default/tasks/parent/tasks/spawn-a/TASK.md");
    const bPath = join(ROOT, ".converge/journal/default/tasks/parent/tasks/spawn-b/TASK.md");
    expect(existsSync(aPath)).toBe(true);
    expect(existsSync(bPath)).toBe(true);

    // No `spawned/` segment anywhere in the tree.
    const spawnedLegacy = join(ROOT, ".converge/journal/default/tasks/parent/spawned");
    expect(existsSync(spawnedLegacy)).toBe(false);

    // Seeder task has no attempts/ dir — just wbs-input/output.json at the task root.
    const parentAttempts = join(ROOT, ".converge/journal/default/tasks/parent/attempts");
    expect(existsSync(parentAttempts)).toBe(false);
    expect(
      existsSync(
        join(ROOT, ".converge/journal/default/tasks/parent/wbs-input.json"),
      ),
    ).toBe(true);
    expect(
      existsSync(
        join(ROOT, ".converge/journal/default/tasks/parent/wbs-output.json"),
      ),
    ).toBe(true);
  });

  it("places user-defined child + 2 spawned children as siblings under the parent", async () => {
    const pb = join(ROOT, ".converge/playbooks/default");
    plant(join(pb, "playbook.yml"), "name: default\n");
    plant(join(pb, "tasks/parent/TASK.md"), "---\nid: parent\ntitle: Parent\n---\n");
    plant(
      join(pb, "tasks/parent/tasks/user-child/TASK.md"),
      "---\nid: user-child\ntitle: User child\n---\n",
    );

    const executor = new SeedExecutor(
      ROOT,
      { epicId: "parent", taskId: "parent" },
      join(pb, "tasks/parent"),
      { id: "parent", title: "Parent" },
    );
    await executor.run(async (ctx: any) => {
      await ctx.spawn({ id: "spawn-a", title: "A" }, { id: "spawn-a" });
      await ctx.spawn({ id: "spawn-b", title: "B" }, { id: "spawn-b" });
    }, 1);

    const tree = await TaskTree.load(ROOT, { name: "default", dir: ROOT } as any);
    const ids = collectIds(tree).sort();
    expect(ids).toEqual([
      "parent",
      "parent/spawn-a",
      "parent/spawn-b",
      "parent/user-child",
    ]);
  });

  it("supports re-WBS: a spawned task can itself spawn grandchildren", async () => {
    const pb = join(ROOT, ".converge/playbooks/default");
    plant(join(pb, "playbook.yml"), "name: default\n");
    plant(join(pb, "tasks/parent/TASK.md"), "---\nid: parent\ntitle: Parent\n---\n");

    // First WBS pass: parent spawns `child`
    const parentExec = new SeedExecutor(
      ROOT,
      { epicId: "parent", taskId: "parent" },
      join(pb, "tasks/parent"),
      { id: "parent", title: "Parent" },
    );
    await parentExec.run(async (ctx: any) => {
      await ctx.spawn({ id: "child", title: "Child" }, { id: "child" });
    }, 1);

    // Second WBS pass: spawned `child` runs its own WBS and spawns `grand`.
    // The child's journalTaskId is "parent/child" — spawns route to
    // journal/.../tasks/parent/tasks/child/tasks/grand/ (same shape as the
    // playbook's nested `tasks/` layout).
    const childDir = join(ROOT, ".converge/journal/default/tasks/parent/tasks/child");
    const childExec = new SeedExecutor(
      ROOT,
      { epicId: "parent", taskId: "parent/child" },
      childDir,
      { id: "child", title: "Child" },
    );
    await childExec.run(async (ctx: any) => {
      await ctx.spawn({ id: "grand", title: "Grandchild" }, { id: "grand" });
    }, 1);

    const tree = await TaskTree.load(ROOT, { name: "default", dir: ROOT } as any);
    const ids = collectIds(tree).sort();
    expect(ids).toEqual([
      "parent",
      "parent/child",
      "parent/child/grand",
    ]);
  });
});
