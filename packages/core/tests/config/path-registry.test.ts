import { describe, it, expect } from "vitest";
import { PathRegistry, DuplicateIdError } from "../../src/config/path-registry.ts";

describe("PathRegistry", () => {
  it("register + resolve", () => {
    const registry = new PathRegistry();
    registry.register("task-1", "/path/to/TASK.md");
    expect(registry.resolve("task-1")).toBe("/path/to/TASK.md");
  });

  it("resolve missing returns null", () => {
    const registry = new PathRegistry();
    expect(registry.resolve("nonexistent")).toBeNull();
  });

  it("has returns true after register, false for unregistered", () => {
    const registry = new PathRegistry();
    expect(registry.has("task-1")).toBe(false);
    registry.register("task-1", "/path/to/TASK.md");
    expect(registry.has("task-1")).toBe(true);
  });

  it("idempotent re-registration", () => {
    const registry = new PathRegistry();
    registry.register("task-1", "/same/path");
    expect(() => registry.register("task-1", "/same/path")).not.toThrow();
  });

  it("duplicate id with different path throws DuplicateIdError", () => {
    const registry = new PathRegistry();
    registry.register("task-1", "/path/a");
    expect(() => registry.register("task-1", "/path/b")).toThrow(DuplicateIdError);
    try {
      registry.register("task-1", "/path/b");
    } catch (e) {
      expect(e).toBeInstanceOf(DuplicateIdError);
      expect((e as Error).message).toContain("task-1");
      expect((e as Error).message).toContain("/path/a");
      expect((e as Error).message).toContain("/path/b");
    }
  });

  it("entries iteration", () => {
    const registry = new PathRegistry();
    registry.register("a", "/a");
    registry.register("b", "/b");
    registry.register("c", "/c");
    const entries = [...registry.entries()];
    expect(entries).toHaveLength(3);
    expect(entries).toEqual(expect.arrayContaining([
      ["a", "/a"],
      ["b", "/b"],
      ["c", "/c"],
    ]));
  });

  it("empty registry", () => {
    const registry = new PathRegistry();
    expect(registry.has("anything")).toBe(false);
    expect([...registry.entries()]).toHaveLength(0);
  });
});
