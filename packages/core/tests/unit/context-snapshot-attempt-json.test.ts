/**
 * context-snapshot — RFC 0048.
 *
 * `attempt.json` is the source of truth. The MD files
 * (NEEDS.md / NEEDS.result.md / TASK.md / CHECK.md / task-level README.md)
 * are derived views — written by default for human inspection and crash
 * recovery, and never consulted by the agent prompt. The agent's input
 * is built from the `AIContextPacket` rendered from `attempt.json`.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtemp,
  rm,
  readFile,
  writeFile,
  mkdir,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { writeContextSnapshot } from "../../src/task/lifecycle/context-snapshot.ts";
import type { TaskAttemptContext } from "../../src/task/lifecycle/attempt-context.ts";

describe("writeContextSnapshot — attempt.json is the source of truth", () => {
  let projectDir: string;
  let attemptDir: string;

  beforeEach(async () => {
    projectDir = await mkdtemp(join(tmpdir(), "converge-proj-"));
    attemptDir = join(
      projectDir,
      ".converge",
      "journal",
      "tasks",
      "epic1",
      "tasks",
      "01-build",
      "attempts",
      "01",
    );
    await mkdir(join(projectDir, "in"), { recursive: true });
    await writeFile(join(projectDir, "in", "a.png"), "x", "utf-8");
  });

  afterEach(async () => {
    await rm(projectDir, { recursive: true, force: true });
  });

  it("writes attempt.json as the primary machine surface", async () => {
    const result = await writeContextSnapshot({
      projectDir,
      epicId: "epic1",
      taskId: "01-build",
      attemptDir,
      description: "Build the hero illustration",
      inputs: ["in/*.png"],
      outputs: ["out/foo.png"],
      checks: [{ id: "lint", description: "eslint", cmd: "pnpm lint" }],
      attemptNumber: 1,
      playbook: "demo",
      taskSourcePath: "playbooks/demo/tasks/01-build/TASK.md",
      skills: ["image-generate"],
    });
    expect(result.attemptJson).toBe(join(attemptDir, "attempt.json"));
    expect(existsSync(result.attemptJson)).toBe(true);
  });

  it("records the resolved inputs and declared outputs/checks/skills in attempt.json", async () => {
    const result = await writeContextSnapshot({
      projectDir,
      epicId: "epic1",
      taskId: "01-build",
      attemptDir,
      inputs: ["in/*.png"],
      outputs: ["out/foo.png"],
      checks: [{ id: "lint", description: "eslint", cmd: "pnpm lint" }],
      attemptNumber: 1,
      playbook: "demo",
      taskSourcePath: "playbooks/demo/tasks/01-build/TASK.md",
      skills: ["image-generate"],
    });
    const raw = await readFile(result.attemptJson, "utf-8");
    const ctx: TaskAttemptContext = JSON.parse(raw);
    expect(ctx.taskId).toBe("01-build");
    expect(ctx.playbook).toBe("demo");
    expect(ctx.taskSourcePath).toBe(
      "playbooks/demo/tasks/01-build/TASK.md",
    );
    expect(ctx.skills).toEqual(["image-generate"]);
    expect(ctx.outputs.map((o) => o.path)).toEqual(["out/foo.png"]);
    expect(ctx.checks.map((c) => c.id)).toEqual(["lint"]);
  });

  it("marks the attempt as blocked when an input has zero matches", async () => {
    const result = await writeContextSnapshot({
      projectDir,
      epicId: "epic1",
      taskId: "01-build",
      attemptDir,
      inputs: ["in/missing/*.png"],
      outputs: ["out/foo.png"],
      attemptNumber: 1,
      playbook: "demo",
    });
    const raw = await readFile(result.attemptJson, "utf-8");
    const ctx: TaskAttemptContext = JSON.parse(raw);
    expect(ctx.status).toBe("blocked");
    expect(ctx.inputs[0].count).toBe(0);
    expect(result.blocked).toBe(true);
  });

  it("returns blocked metadata in ContextSnapshotPaths", async () => {
    const result = await writeContextSnapshot({
      projectDir,
      epicId: "epic1",
      taskId: "01-build",
      attemptDir,
      inputs: ["in/missing/*.png"],
      outputs: ["out/foo.png"],
      attemptNumber: 1,
    });
    expect(result.blocked).toBe(true);
    expect(result.blockedReason).toMatch(/Missing required inputs/);
    expect(result.blockedInputs).toEqual(["in/missing/*.png"]);
  });

  it("exposes relDir for callers that need the attempt path", async () => {
    const result = await writeContextSnapshot({
      projectDir,
      epicId: "epic1",
      taskId: "01-build",
      attemptDir,
      inputs: ["in/*.png"],
      outputs: ["out/foo.png"],
      attemptNumber: 1,
    });
    expect(result.relDir).toMatch(/attempts\/01$/);
  });
});

describe("writeContextSnapshot — derived MD views", () => {
  let projectDir: string;
  let attemptDir: string;

  beforeEach(async () => {
    projectDir = await mkdtemp(join(tmpdir(), "converge-proj-"));
    attemptDir = join(
      projectDir,
      ".converge",
      "journal",
      "tasks",
      "epic1",
      "tasks",
      "01-build",
      "attempts",
      "01",
    );
    await mkdir(join(projectDir, "in"), { recursive: true });
    await writeFile(join(projectDir, "in", "a.png"), "x", "utf-8");
  });

  afterEach(async () => {
    await rm(projectDir, { recursive: true, force: true });
  });

  it("writes NEEDS.md / NEEDS.result.md / TASK.md / CHECK.md by default (writeMarkdown: true)", async () => {
    const result = await writeContextSnapshot({
      projectDir,
      epicId: "epic1",
      taskId: "01-build",
      attemptDir,
      description: "Build the hero illustration",
      inputs: ["in/*.png"],
      outputs: ["out/foo.png"],
      checks: [{ id: "lint", description: "eslint", cmd: "pnpm lint" }],
      attemptNumber: 1,
      skillBody: "Generate a hero illustration from input images.",
    });
    expect(result.needsMd).toBe(join(attemptDir, "NEEDS.md"));
    expect(result.needsResultMd).toBe(join(attemptDir, "NEEDS.result.md"));
    expect(result.taskMd).toBe(join(attemptDir, "TASK.md"));
    expect(result.checkMd).toBe(join(attemptDir, "CHECK.md"));
    expect(existsSync(result.needsMd!)).toBe(true);
    expect(existsSync(result.needsResultMd!)).toBe(true);
    expect(existsSync(result.taskMd!)).toBe(true);
    expect(existsSync(result.checkMd!)).toBe(true);
  });

  it("NEEDS.md is a derived view that mirrors the attempt.json spec", async () => {
    const result = await writeContextSnapshot({
      projectDir,
      epicId: "epic1",
      taskId: "01-build",
      attemptDir,
      description: "Build the hero illustration",
      inputs: ["in/*.png"],
      outputs: ["out/foo.png"],
      checks: [{ id: "lint", description: "eslint", cmd: "pnpm lint" }],
      attemptNumber: 1,
    });
    const md = await readFile(result.needsMd!, "utf-8");
    expect(md).toContain("# Needs: 01-build");
    expect(md).toContain("Build the hero illustration");
    expect(md).toContain("`in/*.png`");
    expect(md).toContain("`out/foo.png`");
    expect(md).toContain("**lint**");
  });

  it("NEEDS.result.md reports blocked status when an input has zero matches", async () => {
    const result = await writeContextSnapshot({
      projectDir,
      epicId: "epic1",
      taskId: "01-build",
      attemptDir,
      inputs: ["in/missing/*.png"],
      outputs: ["out/foo.png"],
      attemptNumber: 1,
    });
    const md = await readFile(result.needsResultMd!, "utf-8");
    expect(md).toContain("⛔ **NO FILES FOUND**");
    expect(md).toContain("⛔ **BLOCKED — needs not met**");
  });

  it("TASK.md contains the verbatim skill body when provided", async () => {
    const result = await writeContextSnapshot({
      projectDir,
      epicId: "epic1",
      taskId: "01-build",
      attemptDir,
      attemptNumber: 1,
      skillBody: "Generate a hero illustration from input images.",
    });
    const md = await readFile(result.taskMd!, "utf-8");
    expect(md).toContain("# Task: 01-build");
    expect(md).toContain("Generate a hero illustration from input images.");
  });

  it("CHECK.md contains the declared check commands", async () => {
    const result = await writeContextSnapshot({
      projectDir,
      epicId: "epic1",
      taskId: "01-build",
      attemptDir,
      attemptNumber: 1,
      checks: [{ id: "lint", description: "eslint", cmd: "pnpm lint" }],
    });
    const md = await readFile(result.checkMd!, "utf-8");
    expect(md).toContain("## lint");
    expect(md).toContain("`pnpm lint`");
  });

  it("writes a task-level README.md as a directory index", async () => {
    const result = await writeContextSnapshot({
      projectDir,
      epicId: "epic1",
      taskId: "01-build",
      attemptDir,
      attemptNumber: 1,
      checks: [{ id: "lint", description: "eslint", cmd: "pnpm lint" }],
    });
    const taskRoot = join(attemptDir, "..", "..");
    expect(result.taskReadme).toBe(join(taskRoot, "README.md"));
    const readme = await readFile(result.taskReadme!, "utf-8");
    expect(readme).toContain("# Task Journal: 01-build");
    expect(readme).toContain("`attempt.json`");
    expect(readme).toContain("Derived view");
  });

  it("skips all derived MD files when writeMarkdown is false", async () => {
    const result = await writeContextSnapshot({
      projectDir,
      epicId: "epic1",
      taskId: "01-build",
      attemptDir,
      inputs: ["in/*.png"],
      outputs: ["out/foo.png"],
      attemptNumber: 1,
      writeMarkdown: false,
    });
    // attempt.json is still the source of truth.
    expect(result.attemptJson).toBeTruthy();
    // MD paths are undefined.
    expect(result.needsMd).toBeUndefined();
    expect(result.taskMd).toBeUndefined();
    expect(result.checkMd).toBeUndefined();
    expect(result.taskReadme).toBeUndefined();
    // MD files do not exist on disk.
    expect(existsSync(join(attemptDir, "NEEDS.md"))).toBe(false);
    expect(existsSync(join(attemptDir, "TASK.md"))).toBe(false);
    expect(existsSync(join(attemptDir, "CHECK.md"))).toBe(false);
  });
});
