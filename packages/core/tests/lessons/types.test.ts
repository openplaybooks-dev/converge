/**
 * RFC 0010 — Typed lessons tests.
 */
import { describe, it, expect } from "vitest";
import {
  parseLessonLine,
  lessonAppliesTo,
  selectLessons,
  renderLessonsBlock,
  type Lesson,
} from "../../src/lessons/types.ts";

describe("parseLessonLine", () => {
  it("parses an avoid lesson", () => {
    const l = parseLessonLine('{"kind":"avoid","pattern":"onPressed: null","reason":"check fails","scope":"task:001"}');
    expect(l).toEqual({
      kind: "avoid",
      pattern: "onPressed: null",
      reason: "check fails",
      scope: "task:001",
    });
  });

  it("parses a prefer lesson with optional reason", () => {
    const l = parseLessonLine('{"kind":"prefer","approach":"a","over":"b","scope":"playbook:default"}');
    expect(l).toEqual({ kind: "prefer", approach: "a", over: "b", reason: undefined, scope: "playbook:default" });
  });

  it("parses a fact lesson with arbitrary value", () => {
    const l = parseLessonLine('{"kind":"fact","key":"truncates-at-8k","value":true,"scope":"provider:claude"}');
    expect(l).toEqual({ kind: "fact", key: "truncates-at-8k", value: true, scope: "provider:claude" });
  });

  it("parses a remember lesson", () => {
    const l = parseLessonLine('{"kind":"remember","key":"x","scope":"skill:stitch-flutter","expiresAfterRuns":5}');
    expect(l).toEqual({ kind: "remember", key: "x", scope: "skill:stitch-flutter", expiresAfterRuns: 5 });
  });

  it("returns null for blank lines, malformed JSON, and unknown kinds", () => {
    expect(parseLessonLine("")).toBeNull();
    expect(parseLessonLine("not json")).toBeNull();
    expect(parseLessonLine('{"kind":"weird","scope":"global"}')).toBeNull();
  });

  it("rejects entries with missing required fields", () => {
    expect(parseLessonLine('{"kind":"avoid","scope":"global"}')).toBeNull();
    expect(parseLessonLine('{"kind":"prefer","approach":"x","scope":"global"}')).toBeNull();
    expect(parseLessonLine('{"kind":"fact","scope":"global"}')).toBeNull();
  });

  it("rejects malformed scope strings", () => {
    expect(parseLessonLine('{"kind":"fact","key":"k","value":1,"scope":"bogus"}')).toBeNull();
    expect(parseLessonLine('{"kind":"fact","key":"k","value":1,"scope":"playbook:"}')).toBeNull();
  });
});

describe("lessonAppliesTo", () => {
  const lessons: Record<string, Lesson> = {
    global: { kind: "fact", key: "k", value: 1, scope: "global" },
    playbook: { kind: "fact", key: "k", value: 1, scope: "playbook:default" },
    task: { kind: "fact", key: "k", value: 1, scope: "task:001-home" },
    skill: { kind: "fact", key: "k", value: 1, scope: "skill:stitch-flutter" },
    provider: { kind: "fact", key: "k", value: 1, scope: "provider:claude" },
  };

  const ctx = {
    playbook: "default",
    taskId: "001-home",
    skills: ["stitch-flutter"],
    provider: "claude",
  };

  it("applies global lessons to every context", () => {
    expect(lessonAppliesTo(lessons.global, ctx)).toBe(true);
  });

  it("applies playbook lesson only when name matches", () => {
    expect(lessonAppliesTo(lessons.playbook, ctx)).toBe(true);
    expect(lessonAppliesTo(lessons.playbook, { ...ctx, playbook: "other" })).toBe(false);
  });

  it("applies task lesson only when id matches", () => {
    expect(lessonAppliesTo(lessons.task, ctx)).toBe(true);
    expect(lessonAppliesTo(lessons.task, { ...ctx, taskId: "002" })).toBe(false);
  });

  it("applies skill lesson when context.skills includes the name", () => {
    expect(lessonAppliesTo(lessons.skill, ctx)).toBe(true);
    expect(lessonAppliesTo(lessons.skill, { ...ctx, skills: ["other"] })).toBe(false);
    expect(lessonAppliesTo(lessons.skill, { ...ctx, skills: undefined })).toBe(false);
  });

  it("applies provider lesson when name matches", () => {
    expect(lessonAppliesTo(lessons.provider, ctx)).toBe(true);
    expect(lessonAppliesTo(lessons.provider, { ...ctx, provider: "minimax" })).toBe(false);
  });
});

describe("selectLessons + renderLessonsBlock", () => {
  it("filters by scope and preserves input order", () => {
    const ls: Lesson[] = [
      { kind: "avoid", pattern: "x", reason: "y", scope: "global" },
      { kind: "avoid", pattern: "z", reason: "w", scope: "task:other" },
      { kind: "fact", key: "k", value: 1, scope: "playbook:default" },
    ];
    const selected = selectLessons(ls, { playbook: "default", taskId: "001" });
    expect(selected.map((l) => l.scope)).toEqual(["global", "playbook:default"]);
  });

  it("renders empty string for empty input", () => {
    expect(renderLessonsBlock([])).toBe("");
  });

  it("renders a heading + one bullet per lesson kind", () => {
    const out = renderLessonsBlock([
      { kind: "avoid", pattern: "x", reason: "bad", scope: "global" },
      { kind: "prefer", approach: "a", over: "b", reason: "r", scope: "global" },
      { kind: "fact", key: "k", value: true, scope: "global" },
      { kind: "remember", key: "r", scope: "global" },
    ]);
    expect(out).toContain("Lessons from prior attempts:");
    expect(out).toContain("AVOID `x` — bad");
    expect(out).toContain("PREFER a over b — r");
    expect(out).toContain("FACT k = true");
    expect(out).toContain("REMEMBER r");
  });
});
