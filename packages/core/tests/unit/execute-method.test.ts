/**
 * Tests for the .execute() unified execution entry point.
 *
 * .execute(fn) is an alias for .executor(fn) on TaskDefinitionBuilder.
 * It sets executorFn which flows through Unit → executeInitial → ConvergeController.
 */

import { describe, it, expect } from "vitest";
import {
  taskDef,
  TaskDefinitionBuilder,
} from "../../src/config/task-definition.ts";
import type { ExecutorFn } from "../../src/config/task-definition.ts";

describe(".execute() — Unified Execution Entry Point", () => {
  const noopExecutor: ExecutorFn = async (_ctx) => {};

  it("should set executorFn via .execute()", () => {
    const task = taskDef().id("install-deps").execute(noopExecutor).build();

    expect(task.id).toBe("install-deps");
    expect(task.executorFn).toBe(noopExecutor);
  });

  it("should be equivalent to .executor()", () => {
    const fn: ExecutorFn = async (ctx) => {
      await ctx.ai.fn({ prompt: "do something" });
    };

    const viaExecute = taskDef().id("a").execute(fn).build();
    const viaExecutor = taskDef().id("b").executor(fn).build();

    expect(viaExecute.executorFn).toBe(fn);
    expect(viaExecutor.executorFn).toBe(fn);
    // Same function reference stored in the same field
    expect(viaExecute.executorFn).toBe(viaExecutor.executorFn);
  });

  it("should chain with other builder methods", () => {
    const fn: ExecutorFn = async () => {};

    const task = taskDef()
      .id("verify-pages")
      .title("Verify All Pages")
      .description("Check page rendering")
      .inputs([".stitch/SITE.md"])
      .outputs(["report.json"])
      .execute(fn)
      .build();

    expect(task.id).toBe("verify-pages");
    expect(task.title).toBe("Verify All Pages");
    expect(task.description).toBe("Check page rendering");
    expect(task.inputs).toEqual([".stitch/SITE.md"]);
    expect(task.outputs).toEqual(["report.json"]);
    expect(task.executorFn).toBe(fn);
  });

  it("should work with .converge() for convergence wrapping", () => {
    const fn: ExecutorFn = async () => {};

    const task = taskDef()
      .id("build-app")
      .outputs(["dist/bundle.js"])
      .execute(fn)
      .converge()
      .build();

    expect(task.executorFn).toBe(fn);
    expect(task.convergeConfig).toEqual({ mode: "default" });
  });

  it("should allow .execute() before or after other methods (order-independent)", () => {
    const fn: ExecutorFn = async () => {};

    // .execute() first
    const a = taskDef()
      .id("a")
      .execute(fn)
      .title("Task A")
      .outputs(["out.json"])
      .build();

    // .execute() last
    const b = taskDef()
      .id("b")
      .title("Task B")
      .outputs(["out.json"])
      .execute(fn)
      .build();

    expect(a.executorFn).toBe(fn);
    expect(b.executorFn).toBe(fn);
  });

  it("should override previous .execute() or .executor() call", () => {
    const fn1: ExecutorFn = async () => {};
    const fn2: ExecutorFn = async () => {};

    const task = taskDef()
      .id("task")
      .executor(fn1)
      .execute(fn2) // overrides
      .build();

    expect(task.executorFn).toBe(fn2);
  });

  it("should return TaskDefinitionBuilder for chaining", () => {
    const builder = taskDef().id("test");
    const result = builder.execute(noopExecutor);

    // Returns `this` for chaining
    expect(result).toBe(builder);
    expect(result).toBeInstanceOf(TaskDefinitionBuilder);
  });
});
