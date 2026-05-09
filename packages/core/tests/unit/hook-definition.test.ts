/**
 * Tests for the hookDef() builder and HookDefinition types.
 */

import { describe, it, expect } from "vitest";
import { hookDef } from "../../src/hooks/hook-definition.ts";

describe("hookDef builder", () => {
  it("should build a minimal hook definition with filterTags", () => {
    const hook = hookDef()
      .id("git-automation")
      .on("task:complete")
      .filterTags(["code"])
      .fn(async () => {})
      .build();

    expect(hook.id).toBe("git-automation");
    expect(hook.on).toBe("task:complete");
    expect(hook.filter.tags).toEqual(["code"]);
    expect(hook.blocking).toBeUndefined(); // defaults vary by event
  });

  it("should build a hook with filterTaskIds", () => {
    const hook = hookDef()
      .id("notify")
      .on("task:fail")
      .filterTaskIds(["build-backend"])
      .fn(async () => {})
      .blocking(false)
      .build();

    expect(hook.filter.taskIds).toEqual(["build-backend"]);
    expect(hook.blocking).toBe(false);
    expect(hook.on).toBe("task:fail");
  });

  it("should support task:start event", () => {
    const hook = hookDef()
      .id("pre-setup")
      .on("task:start")
      .filterTags(["setup"])
      .fn(async () => {})
      .build();

    expect(hook.on).toBe("task:start");
  });

  it("should store config for built-in factories", () => {
    const hook = hookDef()
      .id("git")
      .on("task:complete")
      .filterTags(["code"])
      .fn(async () => {})
      .config({ messageTemplate: "feat: {taskTitle}" })
      .build();

    expect(hook.config).toEqual({ messageTemplate: "feat: {taskTitle}" });
  });

  it("should throw when id is missing", () => {
    expect(() =>
      hookDef().on("task:complete").filterTags(["code"]).fn(async () => {}).build(),
    ).toThrow("requires an id");
  });

  it("should throw when event is missing", () => {
    expect(() =>
      hookDef().id("test").filterTags(["code"]).fn(async () => {}).build(),
    ).toThrow("requires an event");
  });

  it("should throw when fn is missing", () => {
    expect(() =>
      hookDef().id("test").on("task:complete").filterTags(["code"]).build(),
    ).toThrow("requires a function");
  });

  it("should throw when filter is empty", () => {
    expect(() =>
      hookDef().id("test").on("task:complete").fn(async () => {}).build(),
    ).toThrow("requires a filter");
  });

  it("should accept a title", () => {
    const hook = hookDef()
      .id("git")
      .title("Git Automation")
      .on("task:complete")
      .filterTags(["code"])
      .fn(async () => {})
      .build();

    expect(hook.title).toBe("Git Automation");
  });
});
