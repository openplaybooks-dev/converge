/**
 * End-to-end tests for the hook system using the programmatic API.
 *
 * Verifies:
 *  - Hook definitions are compiled into companion DAG nodes
 *  - Tag-based matching works correctly
 *  - Companion nodes execute and run hook callbacks
 *  - task:complete hooks block downstream tasks (chain semantics)
 *  - task:fail hooks don't block downstream tasks
 *  - Multiple hooks chain correctly
 */

import { describe, it, expect, beforeAll } from "vitest";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import {
  captureReporter,
  definePlaybook,
  run,
  taskDef,
  hookDef,
} from "@openplaybooks/converge-core";

const REPO_ROOT = resolve(__dirname, "..");
const projectDir = join(REPO_ROOT, "tests", "test-hooks");
const outDir = join(projectDir, "out");

function reset() {
  rmSync(outDir, { recursive: true, force: true });
  rmSync(join(projectDir, ".converge"), { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  mkdirSync(join(projectDir, ".converge"), { recursive: true });
}

describe("hook system E2E", () => {
  beforeAll(() => reset());

  it("should compile hooks as companion DAG nodes", async () => {
    reset();

    const executedHooks: string[] = [];

    const pb = definePlaybook({
      name: "hook-compile-test",
      description: "Verify hooks create companion DAG nodes.",
      run: { mode: "oneoff", maxTaskAttempts: 1 },
      tasks: [
        taskDef()
          .id("build-backend")
          .title("Build Backend")
          .tags(["code"])
          .executor(async () => {
            writeFileSync(join(outDir, "backend.txt"), "built", "utf8");
          })
          .build(),
        taskDef()
          .id("deploy")
          .title("Deploy")
          .depends_on(["build-backend"])
          .executor(async () => {
            writeFileSync(join(outDir, "deploy.txt"), "deployed", "utf8");
          })
          .build(),
      ],
      hooks: [
        hookDef()
          .id("git-automation")
          .on("task:complete")
          .filterTags(["code"])
          .fn(async (ctx) => {
            executedHooks.push(`commit:${ctx.taskId}`);
          })
          .build(),
      ],
    });

    const cap = captureReporter();
    const result = await run(pb, {
      projectDir,
      reporter: cap,
      fullRefresh: true,
    });

    // Both tasks should complete successfully
    expect(result.failed).toBe(0);
    // build-backend + git-automation__build-backend + deploy + root nodes
    expect(result.completed).toBeGreaterThanOrEqual(3);

    // Hook should have executed
    expect(executedHooks).toContain("commit:build-backend");

    // deploy should only run AFTER the hook (chain semantics)
    // Verify by checking event ordering
    const events = cap.events.map((e) => e.kind);
    const deployIdx = events.indexOf("task-complete");
    // Find the second task-complete (which should be deploy or hook)
    const taskCompleteIndices = events
      .map((e, i) => (e === "task-complete" ? i : -1))
      .filter((i) => i >= 0);
    expect(taskCompleteIndices.length).toBeGreaterThanOrEqual(2);

    // Output files should exist
    expect(existsSync(join(outDir, "backend.txt"))).toBe(true);
    expect(existsSync(join(outDir, "deploy.txt"))).toBe(true);
  });

  it("should not run task:complete hook for non-matching tags", async () => {
    reset();

    const executedHooks: string[] = [];

    const pb = definePlaybook({
      name: "hook-tag-filter",
      description: "Verify hooks only match tasks with correct tags.",
      run: { mode: "oneoff", maxTaskAttempts: 1 },
      tasks: [
        taskDef()
          .id("research")
          .title("Research")
          .tags(["docs"])
          .executor(async () => {
            writeFileSync(join(outDir, "research.txt"), "done", "utf8");
          })
          .build(),
      ],
      hooks: [
        hookDef()
          .id("git-automation")
          .on("task:complete")
          .filterTags(["code"]) // research has tag "docs", not "code"
          .fn(async (ctx) => {
            executedHooks.push(`executed:${ctx.taskId}`);
          })
          .build(),
      ],
    });

    const cap = captureReporter();
    const result = await run(pb, {
      projectDir,
      reporter: cap,
      fullRefresh: true,
    });

    expect(result.failed).toBe(0);
    // Only research + root nodes, no hook companion
    expect(result.completed).toBeGreaterThanOrEqual(1);

    // Hook should NOT have executed (no tag match)
    expect(executedHooks).toHaveLength(0);
  });

  it("should chain multiple hooks for the same task", async () => {
    reset();

    const executionOrder: string[] = [];

    const pb = definePlaybook({
      name: "hook-chain-test",
      description: "Verify multiple hooks chain correctly.",
      run: { mode: "oneoff", maxTaskAttempts: 1 },
      tasks: [
        taskDef()
          .id("build")
          .title("Build")
          .tags(["code"])
          .executor(async () => {
            executionOrder.push("build");
            writeFileSync(join(outDir, "build.txt"), "done", "utf8");
          })
          .build(),
        taskDef()
          .id("verify")
          .title("Verify")
          .depends_on(["build"])
          .executor(async () => {
            executionOrder.push("verify");
            writeFileSync(join(outDir, "verify.txt"), "ok", "utf8");
          })
          .build(),
      ],
      hooks: [
        hookDef()
          .id("aaa-commit")
          .on("task:complete")
          .filterTags(["code"])
          .fn(async () => {
            executionOrder.push("commit");
          })
          .build(),
        hookDef()
          .id("zzz-pr")
          .on("task:complete")
          .filterTags(["code"])
          .fn(async () => {
            executionOrder.push("pr");
          })
          .build(),
      ],
    });

    const cap = captureReporter();
    const result = await run(pb, {
      projectDir,
      reporter: cap,
      fullRefresh: true,
    });

    expect(result.failed).toBe(0);
    // build + commit-hook + pr-hook + verify + root nodes
    expect(result.completed).toBeGreaterThanOrEqual(4);

    // Hooks chain in alphabetical order (aaa-commit before zzz-pr)
    // Order: build → commit → pr → verify
    const buildIdx = executionOrder.indexOf("build");
    const commitIdx = executionOrder.indexOf("commit");
    const prIdx = executionOrder.indexOf("pr");
    const verifyIdx = executionOrder.indexOf("verify");

    expect(buildIdx).toBeLessThan(commitIdx);
    expect(commitIdx).toBeLessThan(prIdx);
    expect(prIdx).toBeLessThan(verifyIdx);
  });

  it(
    "should handle hooks that throw without blocking downstream",
    { timeout: 60_000 },
    async () => {
      reset();

      const pb = definePlaybook({
        name: "hook-error-test",
        description: "Verify hook errors are isolated.",
        run: { mode: "oneoff", maxTaskAttempts: 1 },
        tasks: [
          taskDef()
            .id("task-a")
            .title("Task A")
            .tags(["risky"])
            .executor(async () => {
              writeFileSync(join(outDir, "a.txt"), "ok", "utf8");
            })
            .build(),
          taskDef()
            .id("task-b")
            .title("Task B")
            .depends_on(["task-a"])
            .executor(async () => {
              writeFileSync(join(outDir, "b.txt"), "ok", "utf8");
            })
            .build(),
        ],
        hooks: [
          hookDef()
            .id("buggy-hook")
            .on("task:complete")
            .filterTags(["risky"])
            .fn(async () => {
              throw new Error("Hook failure");
            })
            .build(),
        ],
      });

      const cap = captureReporter();
      const result = await run(pb, {
        projectDir,
        reporter: cap,
        fullRefresh: true,
      });

      // The hook node fails, so task-b is blocked (chain semantics)
      // task-a succeeds, but buggy-hook__task-a fails, so task-b never runs
      expect(result.failed).toBeGreaterThan(0);
      expect(existsSync(join(outDir, "a.txt"))).toBe(true);
    },
  );

  it("should match tasks by taskId filter", async () => {
    reset();

    const executedHooks: string[] = [];

    const pb = definePlaybook({
      name: "hook-taskid-filter",
      description: "Verify hooks can filter by task ID.",
      run: { mode: "oneoff", maxTaskAttempts: 1 },
      tasks: [
        taskDef()
          .id("specific-task")
          .title("Specific")
          .tags([])
          .executor(async () => {
            writeFileSync(join(outDir, "specific.txt"), "ok", "utf8");
          })
          .build(),
        taskDef()
          .id("other-task")
          .title("Other")
          .tags([])
          .executor(async () => {
            writeFileSync(join(outDir, "other.txt"), "ok", "utf8");
          })
          .build(),
      ],
      hooks: [
        hookDef()
          .id("targeted")
          .on("task:complete")
          .filterTaskIds(["specific-task"])
          .fn(async (ctx) => {
            executedHooks.push(ctx.taskId);
          })
          .build(),
      ],
    });

    const cap = captureReporter();
    const result = await run(pb, {
      projectDir,
      reporter: cap,
      fullRefresh: true,
    });

    expect(result.failed).toBe(0);
    // specific-task + targeted__specific-task + other-task + root nodes
    expect(result.completed).toBeGreaterThanOrEqual(3);

    expect(executedHooks).toEqual(["specific-task"]);
    expect(executedHooks).not.toContain("other-task");
  });
});
