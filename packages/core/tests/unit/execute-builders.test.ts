/**
 * Tests for .execute() on the functions/builders.ts builders.
 *
 * These are the secondary builders (task() and taskDef() from functions/builders.ts)
 * used for config-oriented task creation.
 */

import { describe, it, expect } from "vitest";
import { task, taskDef } from "../../src/functions/builders.ts";

describe(".execute() on functions/builders", () => {
  describe("TaskBuilder (task())", () => {
    it("should produce TaskFnMeta via .execute() — alias for .run()", () => {
      const fn = async () => ({ success: true });

      const meta = task()
        .type("install")
        .description("Install dependencies")
        .execute(fn);

      expect(meta.type).toBe("install");
      expect(meta.description).toBe("Install dependencies");
      expect(meta.fn).toBe(fn);
    });

    it("should be equivalent to .run()", () => {
      const fn = async () => ({ success: true });

      const viaRun = task().type("test").description("Run tests").run(fn);

      const viaExecute = task()
        .type("test")
        .description("Run tests")
        .execute(fn);

      expect(viaRun.fn).toBe(fn);
      expect(viaExecute.fn).toBe(fn);
      expect(viaRun.type).toBe(viaExecute.type);
    });
  });

  describe("TaskDefBuilder (taskDef())", () => {
    it("should set runFn flag via .execute() — alias for .run()", () => {
      const fn = async () => ({ success: true });

      const config = taskDef()
        .id("my-task")
        .title("My Task")
        .execute(fn)
        .build();

      expect(config.id).toBe("my-task");
      expect(config.vars?.runFn).toBe(true);
      expect(config.fn).toBe("task-my-task");
    });

    it("should be equivalent to .run()", () => {
      const fn = async () => ({ success: true });

      const viaRun = taskDef().id("task-a").title("Task A").run(fn).build();

      const viaExecute = taskDef()
        .id("task-b")
        .title("Task B")
        .execute(fn)
        .build();

      // Both set the same internal state
      expect(viaRun.vars?.runFn).toBe(true);
      expect(viaExecute.vars?.runFn).toBe(true);
    });

    it("should chain with other methods", () => {
      const fn = async () => ({ success: true });

      const config = taskDef()
        .id("verify")
        .title("Verify")
        .deps(["build"])
        .outputs(["report.json"])
        .execute(fn)
        .build();

      expect(config.id).toBe("verify");
      expect(config.deps).toEqual(["build"]);
      expect(config.outputs).toEqual(["report.json"]);
    });
  });
});
