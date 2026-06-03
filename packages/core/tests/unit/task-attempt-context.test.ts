/**
 * TaskAttemptContext — RFC 0048 compact per-attempt machine surface.
 *
 * The on-disk file is `attempt.json`. The type was renamed from
 * `AttemptRecord` to `TaskAttemptContext` to avoid collision with the
 * repair-strategy `AttemptRecord` in
 * `packages/core/src/navigator/repair/types.ts:194`.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  writeAttemptContext,
  readAttemptContext,
  updateAttemptContext,
} from "../../src/task/lifecycle/attempt-context.ts";
import type {
  TaskAttemptContext,
  AttemptStatus,
  RetryHint,
} from "../../src/task/lifecycle/attempt-context.ts";

function baseContext(
  overrides: Partial<TaskAttemptContext> = {},
): TaskAttemptContext {
  return {
    taskId: "01-build-thing",
    playbook: "demo",
    attempt: 1,
    status: "ready",
    taskSourcePath: "playbooks/demo/tasks/01-build-thing/TASK.md",
    inputs: [],
    outputs: [],
    checks: [],
    skills: [],
    retryHints: [],
    logs: {},
    ...overrides,
  };
}

describe("TaskAttemptContext writer", () => {
  let attemptDir: string;

  beforeEach(async () => {
    attemptDir = await mkdtemp(join(tmpdir(), "converge-attempt-ctx-"));
  });

  afterEach(async () => {
    await rm(attemptDir, { recursive: true, force: true });
  });

  it("writes attempt.json with the full context", async () => {
    const ctx = baseContext({ skills: ["image-generate"], status: "running" });
    await writeAttemptContext(attemptDir, ctx);

    const raw = await readFile(join(attemptDir, "attempt.json"), "utf-8");
    const parsed = JSON.parse(raw);
    expect(parsed.taskId).toBe("01-build-thing");
    expect(parsed.status).toBe("running");
    expect(parsed.skills).toEqual(["image-generate"]);
  });

  it("creates the attempt directory if it does not exist", async () => {
    const nested = join(attemptDir, "wip", "deeper");
    const ctx = baseContext();
    await writeAttemptContext(nested, ctx);
    const read = await readAttemptContext(nested);
    expect(read?.taskId).toBe("01-build-thing");
  });

  it("reads back the same context that was written", async () => {
    const ctx = baseContext({
      inputs: [
        { pattern: "in/*.png", count: 2, samples: ["in/a.png", "in/b.png"] },
      ],
      outputs: [{ path: "out/foo.png", exists: true, sizeBytes: 1024 }],
    });
    await writeAttemptContext(attemptDir, ctx);
    const read = await readAttemptContext(attemptDir);
    expect(read).toEqual(ctx);
  });

  it("returns null when attempt.json does not exist", async () => {
    const read = await readAttemptContext(attemptDir);
    expect(read).toBeNull();
  });

  it("preserves unknown fields when reading (forward-compat)", async () => {
    // Some future field added to the schema should round-trip, not get
    // dropped by a strict reader. This guards against a naive class-based
    // deserializer.
    const raw = {
      ...baseContext(),
      futureField: "preserved",
    };
    await writeFile(
      join(attemptDir, "attempt.json"),
      JSON.stringify(raw),
      "utf-8",
    );
    const read = await readAttemptContext(attemptDir);
    expect((read as unknown as { futureField?: string }).futureField).toBe(
      "preserved",
    );
  });
});

describe("updateAttemptContext", () => {
  let attemptDir: string;

  beforeEach(async () => {
    attemptDir = await mkdtemp(join(tmpdir(), "converge-attempt-ctx-update-"));
  });

  afterEach(async () => {
    await rm(attemptDir, { recursive: true, force: true });
  });

  it("updates only the provided fields and preserves the rest", async () => {
    const ctx = baseContext({
      status: "running",
      durationMs: 1200,
      skills: ["image-generate"],
    });
    await writeAttemptContext(attemptDir, ctx);

    const next = await updateAttemptContext(attemptDir, {
      status: "success",
      completedAt: "2026-06-02T10:00:00.000Z",
    });

    expect(next.status).toBe("success");
    expect(next.completedAt).toBe("2026-06-02T10:00:00.000Z");
    expect(next.durationMs).toBe(1200);
    expect(next.taskId).toBe("01-build-thing");
    expect(next.skills).toEqual(["image-generate"]);
  });

  it("appends retry hints in order rather than replacing them", async () => {
    await writeAttemptContext(attemptDir, baseContext());

    const hintA: RetryHint = {
      kind: "missing-output",
      target: "out/foo.png",
      message: "expected at out/foo.png",
      sourceAttempt: 1,
    };
    const hintB: RetryHint = {
      kind: "check-failed",
      target: "check:lint",
      message: "lint exited 1",
      sourceAttempt: 1,
    };

    await updateAttemptContext(attemptDir, { retryHints: [hintA] });
    await updateAttemptContext(attemptDir, { retryHints: [hintB] });

    const read = await readAttemptContext(attemptDir);
    expect(read?.retryHints).toEqual([hintA, hintB]);
  });

  it("records failed checks via the dedicated checks update path", async () => {
    const ctx = baseContext({
      checks: [
        {
          id: "lint",
          description: "eslint",
          cmd: "pnpm lint",
          passed: true,
          exitCode: 0,
        },
        {
          id: "test",
          description: "vitest",
          cmd: "pnpm test",
          passed: false,
          exitCode: 1,
          output: "1 test failed",
        },
      ],
    });
    await writeAttemptContext(attemptDir, ctx);
    const read = await readAttemptContext(attemptDir);
    expect(read?.checks).toEqual(ctx.checks);
  });

  it("records input resolution: literal paths, glob counts, samples", async () => {
    const ctx = baseContext({
      inputs: [
        {
          pattern: "in/*.png",
          count: 3,
          samples: ["in/a.png", "in/b.png", "in/c.png"],
        },
        {
          pattern: "in/manifest.json",
          count: 1,
          samples: ["in/manifest.json"],
        },
      ],
    });
    await writeAttemptContext(attemptDir, ctx);
    const read = await readAttemptContext(attemptDir);
    expect(read?.inputs).toEqual(ctx.inputs);
  });

  it("records outputs with existence and size, no log content", async () => {
    const ctx = baseContext({
      outputs: [
        { path: "out/foo.png", exists: true, sizeBytes: 12345 },
        { path: "out/bar.png", exists: false },
      ],
      logs: {
        events: "events.jsonl",
        provider: ["provider/1.log", "provider/2.log"],
      },
    });
    await writeAttemptContext(attemptDir, ctx);
    const read = await readAttemptContext(attemptDir);
    expect(read?.outputs).toEqual(ctx.outputs);
    expect(read?.logs).toEqual(ctx.logs);
  });

  it("transitions statuses correctly: ready → running → success", async () => {
    await writeAttemptContext(
      attemptDir,
      baseContext({ status: "ready" as AttemptStatus }),
    );
    await updateAttemptContext(attemptDir, {
      status: "running",
      startedAt: "2026-06-02T09:59:00.000Z",
    });
    await updateAttemptContext(attemptDir, {
      status: "success",
      completedAt: "2026-06-02T10:00:00.000Z",
      durationMs: 60000,
    });
    const read = await readAttemptContext(attemptDir);
    expect(read?.status).toBe("success");
    expect(read?.startedAt).toBe("2026-06-02T09:59:00.000Z");
    expect(read?.completedAt).toBe("2026-06-02T10:00:00.000Z");
    expect(read?.durationMs).toBe(60000);
  });

  it("records blocked status with no retry hints", async () => {
    await writeAttemptContext(
      attemptDir,
      baseContext({ status: "blocked" as AttemptStatus }),
    );
    const read = await readAttemptContext(attemptDir);
    expect(read?.status).toBe("blocked");
    expect(read?.retryHints).toEqual([]);
  });
});
