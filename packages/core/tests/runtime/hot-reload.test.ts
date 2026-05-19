/**
 * RFC 0015 — Hot-reload classifier + debouncer tests.
 */
import { describe, it, expect, vi } from "vitest";
import {
  classifyEdit,
  requiresRecompile,
  EditDebouncer,
  type ParsedTaskMd,
} from "../../src/runtime/hot-reload.ts";

function md(
  frontmatter: Record<string, unknown>,
  body = "body",
): ParsedTaskMd {
  return { frontmatter, body };
}

describe("classifyEdit", () => {
  it("returns empty when nothing changed", () => {
    const a = md({ depends_on: ["x"] }, "b");
    expect(classifyEdit(a, a)).toEqual([]);
  });

  it("detects a body-only change", () => {
    expect(classifyEdit(md({}, "old"), md({}, "new"))).toEqual(["body"]);
  });

  it("detects checks/outputs changes", () => {
    expect(classifyEdit(md({ checks: [] }), md({ checks: [{ id: "x" }] })))
      .toContain("checks");
    expect(classifyEdit(md({ outputs: ["a"] }), md({ outputs: ["a", "b"] })))
      .toContain("outputs");
  });

  it("detects depends_on changes", () => {
    expect(classifyEdit(md({ depends_on: ["a"] }), md({ depends_on: ["a", "b"] })))
      .toContain("depends_on");
  });

  it("detects seed changes", () => {
    expect(classifyEdit(md({ seed: { mode: "static" } }), md({ seed: { mode: "cli" } })))
      .toContain("seed");
  });

  it("returns multiple categories when multiple things changed", () => {
    const cats = classifyEdit(
      md({ depends_on: ["a"], checks: [] }, "old"),
      md({ depends_on: ["a", "b"], checks: [{ id: "x" }] }, "new"),
    );
    expect(cats.sort()).toEqual(["body", "checks", "depends_on"]);
  });

  it("reports 'other' for unknown-key changes", () => {
    expect(classifyEdit(md({ title: "old" }), md({ title: "new" })))
      .toContain("other");
  });
});

describe("requiresRecompile", () => {
  it("returns true when seed changed", () => {
    expect(requiresRecompile(["seed", "body"])).toBe(true);
  });

  it("returns true when depends_on changed", () => {
    expect(requiresRecompile(["depends_on"])).toBe(true);
  });

  it("returns false for body/checks/outputs/other-only changes", () => {
    expect(requiresRecompile(["body"])).toBe(false);
    expect(requiresRecompile(["checks", "outputs", "other"])).toBe(false);
    expect(requiresRecompile([])).toBe(false);
  });
});

describe("EditDebouncer", () => {
  it("fires onSettled after the configured delay", async () => {
    vi.useFakeTimers();
    const onSettled = vi.fn();
    const d = new EditDebouncer<string>(500, onSettled);
    d.notify("/a.md");
    expect(onSettled).not.toHaveBeenCalled();
    vi.advanceTimersByTime(499);
    expect(onSettled).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onSettled).toHaveBeenCalledWith("/a.md");
    expect(onSettled).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("coalesces a burst into one firing per path", async () => {
    vi.useFakeTimers();
    const onSettled = vi.fn();
    const d = new EditDebouncer<string>(500, onSettled);
    d.notify("/a.md");
    vi.advanceTimersByTime(100);
    d.notify("/a.md");
    vi.advanceTimersByTime(100);
    d.notify("/a.md");
    vi.advanceTimersByTime(499);
    expect(onSettled).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onSettled).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("tracks paths independently", async () => {
    vi.useFakeTimers();
    const seen: string[] = [];
    const d = new EditDebouncer<string>(500, (p) => { seen.push(p); });
    d.notify("/a.md");
    vi.advanceTimersByTime(250);
    d.notify("/b.md");
    vi.advanceTimersByTime(250);
    expect(seen).toEqual(["/a.md"]);
    vi.advanceTimersByTime(250);
    expect(seen).toEqual(["/a.md", "/b.md"]);
    vi.useRealTimers();
  });

  it("cancel prevents firing", async () => {
    vi.useFakeTimers();
    const onSettled = vi.fn();
    const d = new EditDebouncer<string>(500, onSettled);
    d.notify("/a.md");
    d.cancel("/a.md");
    vi.advanceTimersByTime(1000);
    expect(onSettled).not.toHaveBeenCalled();
    expect(d.pendingCount).toBe(0);
    vi.useRealTimers();
  });
});
