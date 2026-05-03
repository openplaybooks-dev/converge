/**
 * Integration: SeedExecutor writes spawned children FLAT into the execution
 * tasks root (not nested inside the parent). Also verifies seed.json records
 * correct writeToPath and that deep seeding (re-seed) works recursively flat.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { SeedExecutor } from "../../src/executor/seed-executor.ts";

const savedPlaybook = process.env.CONVERGE_PLAYBOOK;
let ROOT: string;

function plant(path: string, body: string) {
  mkdirSync(path.substring(0, path.lastIndexOf("/")), { recursive: true });
  writeFileSync(path, body);
}

describe("Seed journal spawn — flat layout", () => {
  beforeEach(() => {
    ROOT = join(tmpdir(), `converge-seed-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    rmSync(ROOT, { recursive: true, force: true });
    mkdirSync(ROOT, { recursive: true });
    process.env.CONVERGE_PLAYBOOK = "default";
  });

  afterEach(() => {
    rmSync(ROOT, { recursive: true, force: true });
    if (savedPlaybook === undefined) delete process.env.CONVERGE_PLAYBOOK;
    else process.env.CONVERGE_PLAYBOOK = savedPlaybook;
  });

  it("writes spawned children flat at .converge/journal/{pb}/tasks/{child}/TASK.md", async () => {
    const pb = join(ROOT, ".converge/playbooks/default");
    plant(join(pb, "playbook.yml"), "name: default\n");
    plant(join(pb, "tasks/parent/TASK.md"), "---\nid: parent\ntitle: Parent\n---\n");

    const executor = new SeedExecutor(
      ROOT,
      { epicId: "default", taskId: "parent" },
      join(pb, "tasks/parent"),
      { id: "parent", title: "Parent" },
    );

    const result = await executor.run(async (ctx: any) => {
      await ctx.spawn({ id: "spawn-a", title: "Spawn A" }, { id: "spawn-a" });
      await ctx.spawn({ id: "spawn-b", title: "Spawn B" }, { id: "spawn-b" });
    }, 1);

    expect(result.spawnCount).toBe(2);

    // Children are FLAT — at tasks/ root, not nested inside parent
    const aPath = join(ROOT, ".converge/journal/default/tasks/spawn-a/TASK.md");
    const bPath = join(ROOT, ".converge/journal/default/tasks/spawn-b/TASK.md");
    expect(existsSync(aPath)).toBe(true);
    expect(existsSync(bPath)).toBe(true);

    // No nested spawn under parent
    const nestedA = join(ROOT, ".converge/journal/default/tasks/parent/tasks/spawn-a/TASK.md");
    expect(existsSync(nestedA)).toBe(false);

    // seed.json at parent's journal dir with correct flat writeToPath
    const seedJsonPath = join(ROOT, ".converge/journal/default/tasks/parent/seed.json");
    expect(existsSync(seedJsonPath)).toBe(true);
    const seedData = JSON.parse(readFileSync(seedJsonPath, "utf-8"));
    expect(seedData.spawnCount).toBe(2);
    expect(seedData.subtasks).toHaveLength(2);
    for (const st of seedData.subtasks) {
      expect(st.writeToPath).not.toContain("parent/tasks/");
      expect(st.writeToPath).toMatch(/tasks\/spawn-[ab]\/TASK\.md$/);
    }
  });

  it("supports re-seed: a spawned child can itself spawn grandchildren flat", async () => {
    const pb = join(ROOT, ".converge/playbooks/default");
    plant(join(pb, "playbook.yml"), "name: default\n");
    plant(join(pb, "tasks/parent/TASK.md"), "---\nid: parent\ntitle: Parent\n---\n");

    // First seed pass: parent spawns child flat
    const parentExec = new SeedExecutor(
      ROOT,
      { epicId: "default", taskId: "parent" },
      join(pb, "tasks/parent"),
      { id: "parent", title: "Parent" },
    );
    await parentExec.run(async (ctx: any) => {
      await ctx.spawn({ id: "child", title: "Child" }, { id: "child" });
    }, 1);

    // Child TASK.md is flat
    const childTaskPath = join(ROOT, ".converge/journal/default/tasks/child/TASK.md");
    expect(existsSync(childTaskPath)).toBe(true);

    // Second seed pass: child spawns grandchild.
    // In the flat layout, the child's journal taskId is "child" and its
    // journal directory is tasks/child/.  taskFilePath must be a directory
    // (the SeedExecutor probes it for template siblings).
    const childDir = join(ROOT, ".converge/journal/default/tasks/child");
    const childExec = new SeedExecutor(
      ROOT,
      { epicId: "default", taskId: "child" },
      childDir,
      { id: "child", title: "Child" },
    );
    await childExec.run(async (ctx: any) => {
      await ctx.spawn({ id: "grand", title: "Grandchild" }, { id: "grand" });
    }, 1);

    // Grandchild is flat — NOT nested under child or parent
    const grandPath = join(ROOT, ".converge/journal/default/tasks/grand/TASK.md");
    expect(existsSync(grandPath)).toBe(true);
    const nestedGrand = join(ROOT, ".converge/journal/default/tasks/child/tasks/grand/TASK.md");
    expect(existsSync(nestedGrand)).toBe(false);

    // seed.json at child's journal dir
    const childSeedJson = join(childDir, "seed.json");
    expect(existsSync(childSeedJson)).toBe(true);
    const seedData = JSON.parse(readFileSync(childSeedJson, "utf-8"));
    expect(seedData.subtasks[0].writeToPath).toMatch(/tasks\/grand\/TASK\.md$/);
    expect(seedData.subtasks[0].writeToPath).not.toContain("child/tasks/");
  });
});
