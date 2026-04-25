/**
 * WbsExecutor writes per-seeder debug artifacts at the task root (NOT inside
 * an attempts/ dir — seeders don't have attempts):
 *   .converge/journal/{pb}/tasks/{parent}/wbs-input.json
 *   .converge/journal/{pb}/tasks/{parent}/wbs-output.json
 *
 * The input snapshot captures what the WBS script sees in `ctx`; the output
 * captures what it produced (spawned tasks + goals) and the exit status.
 * Retries overwrite the same two files; history lives in events.jsonl.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { WbsExecutor } from "../../src/executor/wbs-executor.ts";

const savedPlaybook = process.env.CONVERGE_PLAYBOOK;
let ROOT: string;

function plant(path: string, body: string) {
  mkdirSync(path.substring(0, path.lastIndexOf("/")), { recursive: true });
  writeFileSync(path, body);
}

function taskDir(root: string): string {
  return join(root, ".converge/journal/default/tasks/epic-1");
}

function readJson(p: string): any {
  return JSON.parse(readFileSync(p, "utf-8"));
}

describe("WbsExecutor — wbs-input.json / wbs-output.json debug artifacts", () => {
  beforeEach(() => {
    ROOT = join(
      tmpdir(),
      `converge-wbs-debug-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    rmSync(ROOT, { recursive: true, force: true });
    mkdirSync(ROOT, { recursive: true });

    const pb = join(ROOT, ".converge/playbooks/default");
    plant(join(pb, "playbook.yml"), "name: default\n");
    plant(join(pb, "tasks/epic-1/TASK.md"), "---\nid: epic-1\ntitle: Parent\n---\n");

    process.env.CONVERGE_PLAYBOOK = "default";
  });

  afterEach(() => {
    rmSync(ROOT, { recursive: true, force: true });
    if (savedPlaybook === undefined) delete process.env.CONVERGE_PLAYBOOK;
    else process.env.CONVERGE_PLAYBOOK = savedPlaybook;
  });

  it("writes wbs-input.json capturing vars, taskMeta, and ctx surface", async () => {
    const parentDir = join(ROOT, ".converge/playbooks/default/tasks/epic-1");
    const exec = new WbsExecutor(
      ROOT,
      { epicId: "epic-1", taskId: "epic-1" },
      parentDir,
      { id: "epic-1", title: "Parent", vars: { foo: "bar", n: 42 } },
    );
    await exec.run(
      async (ctx: any) => {
        await ctx.spawn({ id: "child", title: "Child" }, { id: "child" });
      },
      1,
    );

    const input = readJson(join(taskDir(ROOT), "wbs-input.json"));
    expect(input.attemptNumber).toBe(1);
    expect(input.playbookName).toBe("default");
    expect(input.vars).toEqual({ foo: "bar", n: 42 });
    expect(input.taskMeta).toEqual({ id: "epic-1", title: "Parent" });
    expect(input.journalCtx).toEqual({ epicId: "epic-1", taskId: "epic-1" });
    // Exposes which ctx methods the script can call — convenience for debugging.
    expect(input.ctxMethods).toEqual(
      expect.arrayContaining(["log", "spawn", "spawnGoal", "artifact", "ai.ask", "plan.getPlanPath"]),
    );

    // Seeder tasks do NOT create an `attempts/` dir — attempts belong to leaves.
    expect(existsSync(join(taskDir(ROOT), "attempts"))).toBe(false);
  });

  it("writes wbs-output.json with status=success, spawned tasks, and goals", async () => {
    const parentDir = join(ROOT, ".converge/playbooks/default/tasks/epic-1");
    const exec = new WbsExecutor(
      ROOT,
      { epicId: "epic-1", taskId: "epic-1" },
      parentDir,
      { id: "epic-1", title: "Parent" },
    );
    await exec.run(
      async (ctx: any) => {
        await ctx.spawn({ id: "child-a", title: "A" }, { id: "child-a" });
        await ctx.spawn({ id: "child-b", title: "B" }, { id: "child-b" });
      },
      1,
    );

    const output = readJson(join(taskDir(ROOT), "wbs-output.json"));
    expect(output.status).toBe("success");
    expect(output.spawnCount).toBe(2);
    expect(output.spawnedTasks.map((t: any) => t.id).sort()).toEqual(["child-a", "child-b"]);
    expect(output.spawnedGoals).toEqual([]);
    expect(typeof output.durationMs).toBe("number");
    expect(typeof output.startedAt).toBe("string");
    expect(typeof output.completedAt).toBe("string");
  });

  it("writes wbs-output.json with status=error and the thrown error on failure", async () => {
    const parentDir = join(ROOT, ".converge/playbooks/default/tasks/epic-1");
    const exec = new WbsExecutor(
      ROOT,
      { epicId: "epic-1", taskId: "epic-1" },
      parentDir,
      { id: "epic-1", title: "Parent" },
    );
    await exec.run(
      async (_ctx: any) => {
        throw new Error("boom");
      },
      1,
    );

    const output = readJson(join(taskDir(ROOT), "wbs-output.json"));
    expect(output.status).toBe("error");
    expect(output.spawnCount).toBe(0);
    expect(output.error?.message).toBe("boom");
    expect(output.error?.name).toBe("Error");
    // Stack is captured but trimmed, not the full raw string.
    expect(typeof output.error?.stack === "string" || output.error?.stack === undefined).toBe(true);
  });

  it("routes wbs-input/output.json to the CHILD task dir when a spawned child runs its own WBS", async () => {
    // Mirror the production flow: after the root seeder spawns `epic-1/child`,
    // the child's own WBS run should write its debug artifacts at the child's
    // journal dir (journal/{pb}/tasks/epic-1/tasks/child/), not at the root.
    const childDir = join(
      ROOT,
      ".converge/journal/default/tasks/epic-1/tasks/child",
    );
    const childExec = new WbsExecutor(
      ROOT,
      { epicId: "epic-1", taskId: "epic-1/child" },
      childDir,
      { id: "child", title: "Child" },
    );
    await childExec.run(async (ctx: any) => {
      await ctx.spawn({ id: "grand", title: "Grand" }, { id: "grand" });
    }, 1);

    // Child's debug artifacts live next to the child's TASK.md — same level as
    // the child's execution context.
    expect(existsSync(join(childDir, "wbs-input.json"))).toBe(true);
    expect(existsSync(join(childDir, "wbs-output.json"))).toBe(true);
    expect(existsSync(join(childDir, "wbs.json"))).toBe(true);

    const input = readJson(join(childDir, "wbs-input.json"));
    expect(input.journalCtx).toEqual({ epicId: "epic-1", taskId: "epic-1/child" });
    expect(input.taskMeta.id).toBe("child");

    // And no leaking to sibling/parent dirs:
    expect(existsSync(join(taskDir(ROOT), "attempts"))).toBe(false);
    expect(existsSync(join(childDir, "attempts"))).toBe(false);
  });

  it("writes wbs-output.json with status=zero-spawn when the script seeds nothing", async () => {
    const parentDir = join(ROOT, ".converge/playbooks/default/tasks/epic-1");
    const exec = new WbsExecutor(
      ROOT,
      { epicId: "epic-1", taskId: "epic-1" },
      parentDir,
      { id: "epic-1", title: "Parent" },
    );
    await exec.run(async (_ctx: any) => {
      /* no spawn */
    }, 1);

    const outputPath = join(taskDir(ROOT), "wbs-output.json");
    expect(existsSync(outputPath)).toBe(true);
    const output = readJson(outputPath);
    expect(output.status).toBe("zero-spawn");
    expect(output.spawnCount).toBe(0);
    expect(output.error?.name).toBe("WbsZeroSpawnError");
  });
});
