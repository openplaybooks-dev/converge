/**
 * Result / Learn / Interrupted writers — RFC 0048 attempt.json updates.
 *
 * `writeResultSnapshot`, `generateLearnMd`, and `generateInterruptedMd` no
 * longer write CHECK.result.md / TASK.result.md / LEARN.md / INTERRUPTED.md.
 * They update `attempt.json` as the single source of truth.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtemp,
  rm,
  writeFile,
  mkdir,
  readFile,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { writeResultSnapshot } from "../../src/task/lifecycle/result-snapshot.ts";
import { generateLearnMd } from "../../src/task/lifecycle/learn.ts";
import {
  writeAttemptContext,
  type TaskAttemptContext,
} from "../../src/task/lifecycle/attempt-context.ts";

async function plantAttemptCtx(
  wipDir: string,
  overrides: Partial<TaskAttemptContext> = {},
): Promise<TaskAttemptContext> {
  await mkdir(wipDir, { recursive: true });
  await mkdir(join(wipDir, "data"), { recursive: true });
  await mkdir(join(wipDir, "logs"), { recursive: true });
  const ctx: TaskAttemptContext = {
    taskId: "01-build",
    playbook: "demo",
    attempt: 1,
    status: "ready",
    taskSourcePath: "playbooks/demo/tasks/01-build/TASK.md",
    inputs: [],
    outputs: [{ path: "out/foo.txt", exists: false }],
    checks: [
      { id: "lint", description: "lint", cmd: "true" },
      { id: "test", description: "test", cmd: "false" },
    ],
    skills: [],
    retryHints: [],
    logs: { events: "events.jsonl" },
    ...overrides,
  };
  await writeAttemptContext(wipDir, ctx);
  return ctx;
}

describe("writeResultSnapshot — RFC 0048 attempt.json updates", () => {
  let projectDir: string;
  let wipDir: string;

  beforeEach(async () => {
    projectDir = await mkdtemp(join(tmpdir(), "converge-res-"));
    wipDir = join(projectDir, ".converge", "journal", "tasks", "epic1", "tasks", "01-build", "attempts", "01");
  });

  afterEach(async () => {
    await rm(projectDir, { recursive: true, force: true });
  });

  it("updates attempt.json status, completedAt, and durationMs on success", async () => {
    await plantAttemptCtx(wipDir);
    await writeResultSnapshot(wipDir, projectDir, "success", 1234, 1);

    const raw = await readFile(join(wipDir, "attempt.json"), "utf-8");
    const ctx: TaskAttemptContext = JSON.parse(raw);
    expect(ctx.status).toBe("success");
    expect(ctx.completedAt).toBeTruthy();
    expect(ctx.durationMs).toBe(1234);
  });

  it("records check results on attempt.json with pass/fail and exit code", async () => {
    await plantAttemptCtx(wipDir);
    await writeResultSnapshot(wipDir, projectDir, "success", 100, 1);

    const raw = await readFile(join(wipDir, "attempt.json"), "utf-8");
    const ctx: TaskAttemptContext = JSON.parse(raw);
    const lint = ctx.checks.find((c) => c.id === "lint");
    const test = ctx.checks.find((c) => c.id === "test");
    expect(lint?.passed).toBe(true);
    expect(lint?.exitCode).toBe(0);
    expect(test?.passed).toBe(false);
    expect(test?.exitCode).not.toBe(0);
  });

  it("records output existence and size on attempt.json", async () => {
    const expectedFile = join(projectDir, "out", "foo.txt");
    await mkdir(join(projectDir, "out"), { recursive: true });
    await writeFile(expectedFile, "hello world", "utf-8");
    await plantAttemptCtx(wipDir);

    await writeResultSnapshot(wipDir, projectDir, "success", 100, 1);

    const raw = await readFile(join(wipDir, "attempt.json"), "utf-8");
    const ctx: TaskAttemptContext = JSON.parse(raw);
    const foo = ctx.outputs.find((o) => o.path === "out/foo.txt");
    expect(foo?.exists).toBe(true);
    expect(foo?.sizeBytes).toBeGreaterThan(0);
  });

  it("does not write CHECK.result.md or TASK.result.md", async () => {
    await plantAttemptCtx(wipDir);
    await writeResultSnapshot(wipDir, projectDir, "success", 100, 1);
    expect(existsSync(join(wipDir, "CHECK.result.md"))).toBe(false);
    expect(existsSync(join(wipDir, "TASK.result.md"))).toBe(false);
  });

  it("does not write data/check-results.json or data/output-results.json", async () => {
    await plantAttemptCtx(wipDir);
    await writeResultSnapshot(wipDir, projectDir, "success", 100, 1);
    expect(existsSync(join(wipDir, "data", "check-results.json"))).toBe(false);
    expect(existsSync(join(wipDir, "data", "output-results.json"))).toBe(false);
  });

  it("marks the attempt as failed when any check fails", async () => {
    await plantAttemptCtx(wipDir);
    await writeResultSnapshot(wipDir, projectDir, "failed", 100, 1);
    const raw = await readFile(join(wipDir, "attempt.json"), "utf-8");
    const ctx: TaskAttemptContext = JSON.parse(raw);
    expect(ctx.status).toBe("failed");
  });

  it("marks the attempt as blocked and skips running checks", async () => {
    await plantAttemptCtx(wipDir, {
      status: "blocked",
      inputs: [{ pattern: "in/missing", count: 0, samples: [] }],
    });
    await writeResultSnapshot(wipDir, projectDir, "blocked", 0, 1);
    const raw = await readFile(join(wipDir, "attempt.json"), "utf-8");
    const ctx: TaskAttemptContext = JSON.parse(raw);
    expect(ctx.status).toBe("blocked");
    // Checks should not have been run (no passed/fail flags set).
    for (const c of ctx.checks) {
      expect(c.passed).toBeUndefined();
    }
  });
});

describe("generateLearnMd — RFC 0048 retry hints", () => {
  let projectDir: string;
  let wipDir: string;

  beforeEach(async () => {
    projectDir = await mkdtemp(join(tmpdir(), "converge-learn-"));
    wipDir = join(projectDir, ".converge", "journal", "tasks", "epic1", "tasks", "01-build", "attempts", "01");
  });

  afterEach(async () => {
    await rm(projectDir, { recursive: true, force: true });
  });

  it("appends a retry hint per failing check to attempt.json", async () => {
    await plantAttemptCtx(wipDir);
    await writeResultSnapshot(wipDir, projectDir, "failed", 100, 1);
    await generateLearnMd(wipDir, projectDir, 1);

    const raw = await readFile(join(wipDir, "attempt.json"), "utf-8");
    const ctx: TaskAttemptContext = JSON.parse(raw);
    const failedHints = ctx.retryHints.filter(
      (h) => h.kind === "check-failed",
    );
    expect(failedHints.length).toBeGreaterThan(0);
    expect(failedHints[0].target).toBe("test");
  });

  it("appends a retry hint per missing output to attempt.json", async () => {
    await plantAttemptCtx(wipDir, {
      outputs: [{ path: "out/foo.txt", exists: false }],
    });
    await writeResultSnapshot(wipDir, projectDir, "failed", 100, 1);
    await generateLearnMd(wipDir, projectDir, 1);

    const raw = await readFile(join(wipDir, "attempt.json"), "utf-8");
    const ctx: TaskAttemptContext = JSON.parse(raw);
    const missingHints = ctx.retryHints.filter(
      (h) => h.kind === "missing-output",
    );
    expect(missingHints.length).toBe(1);
    expect(missingHints[0].target).toBe("out/foo.txt");
  });

  it("preserves prior retry hints and appends new ones", async () => {
    await plantAttemptCtx(wipDir, {
      retryHints: [
        {
          kind: "loop",
          target: "agent",
          message: "loop detected",
          sourceAttempt: 1,
        },
      ],
    });
    await writeResultSnapshot(wipDir, projectDir, "failed", 100, 1);
    await generateLearnMd(wipDir, projectDir, 1);

    const raw = await readFile(join(wipDir, "attempt.json"), "utf-8");
    const ctx: TaskAttemptContext = JSON.parse(raw);
    expect(ctx.retryHints.length).toBeGreaterThanOrEqual(2);
    expect(ctx.retryHints[0].kind).toBe("loop");
  });

  it("does not write LEARN.md", async () => {
    await plantAttemptCtx(wipDir);
    await writeResultSnapshot(wipDir, projectDir, "failed", 100, 1);
    await generateLearnMd(wipDir, projectDir, 1);
    expect(existsSync(join(wipDir, "LEARN.md"))).toBe(false);
  });

  it("is a no-op when there is no attempt.json", async () => {
    await mkdir(wipDir, { recursive: true });
    await generateLearnMd(wipDir, projectDir, 1);
    expect(existsSync(join(wipDir, "attempt.json"))).toBe(false);
  });
});
