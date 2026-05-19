/**
 * RFC 0016 — Idempotency token tests.
 */
import { describe, it, expect } from "vitest";
import {
  canonicalize,
  computeIdempotencyToken,
  IdempotencyTracker,
} from "../../src/seed/idempotency.ts";

describe("canonicalize", () => {
  it("sorts object keys lexically", () => {
    expect(canonicalize({ b: 1, a: 2 })).toBe(canonicalize({ a: 2, b: 1 }));
  });

  it("preserves array order", () => {
    expect(canonicalize([1, 2])).not.toBe(canonicalize([2, 1]));
  });

  it("collapses internal whitespace in strings", () => {
    expect(canonicalize("a   b")).toBe(canonicalize("a b"));
    expect(canonicalize("  a b  ")).toBe(canonicalize("a b"));
  });

  it("treats undefined and null equivalently", () => {
    expect(canonicalize(undefined)).toBe(canonicalize(null));
  });

  it("walks nested structures", () => {
    expect(canonicalize({ outer: { b: 1, a: 2 } }))
      .toBe(canonicalize({ outer: { a: 2, b: 1 } }));
  });
});

describe("computeIdempotencyToken", () => {
  it("is deterministic for the same inputs", () => {
    const t1 = computeIdempotencyToken({
      playbook: "default",
      templatePath: "templates/widget/TASK.md",
      vars: { name: "Card", id: "001" },
    });
    const t2 = computeIdempotencyToken({
      playbook: "default",
      templatePath: "templates/widget/TASK.md",
      vars: { id: "001", name: "Card" }, // reordered
    });
    expect(t1).toBe(t2);
    expect(t1).toMatch(/^[a-f0-9]{64}$/);
  });

  it("differs when any input differs", () => {
    const base = { playbook: "default", templatePath: "t.md", vars: { x: "1" } };
    const tBase = computeIdempotencyToken(base);
    expect(computeIdempotencyToken({ ...base, playbook: "other" })).not.toBe(tBase);
    expect(computeIdempotencyToken({ ...base, templatePath: "u.md" })).not.toBe(tBase);
    expect(computeIdempotencyToken({ ...base, vars: { x: "2" } })).not.toBe(tBase);
  });

  it("ignores whitespace-only differences in var values", () => {
    const a = computeIdempotencyToken({ playbook: "p", templatePath: "t.md", vars: { title: "A B" } });
    const b = computeIdempotencyToken({ playbook: "p", templatePath: "t.md", vars: { title: " A   B " } });
    expect(a).toBe(b);
  });

  it("treats missing vars same as empty {}", () => {
    const a = computeIdempotencyToken({ playbook: "p", templatePath: "t.md" });
    const b = computeIdempotencyToken({ playbook: "p", templatePath: "t.md", vars: {} });
    expect(a).toBe(b);
  });
});

describe("IdempotencyTracker", () => {
  it("acquire returns true on first sight, false on duplicate", () => {
    const t = new IdempotencyTracker();
    expect(t.acquire("tok-1")).toBe(true);
    expect(t.acquire("tok-1")).toBe(false);
    expect(t.size).toBe(1);
  });

  it("distinct tokens both acquire", () => {
    const t = new IdempotencyTracker();
    expect(t.acquire("a")).toBe(true);
    expect(t.acquire("b")).toBe(true);
    expect(t.size).toBe(2);
  });

  it("release lets a token re-acquire", () => {
    const t = new IdempotencyTracker();
    t.acquire("x");
    t.release("x");
    expect(t.has("x")).toBe(false);
    expect(t.acquire("x")).toBe(true);
  });

  it("snapshot returns every recorded token", () => {
    const t = new IdempotencyTracker();
    t.acquire("a", 1);
    t.acquire("b", 2);
    expect(t.snapshot()).toEqual([
      { token: "a", spawnedAt: 1 },
      { token: "b", spawnedAt: 2 },
    ]);
  });
});
