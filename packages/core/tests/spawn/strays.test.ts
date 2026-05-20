/**
 * RFC 0024 — Stray-file detection tests.
 *
 * Anti-goals locked by the principle:
 *
 *   - A body that writes its own `spawn.plan.jsonl` (the framework's
 *     internal IR) is malformed: emits `SPAWN_MANIFEST_AUTHORED_BY_BODY`.
 *   - A body that writes a child's `TASK.md` directly is malformed: emits
 *     `SPAWN_TASKMD_AUTHORED_BY_BODY`.
 *
 * Both are caught by post-body scans of the spawn cwd.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  detectStrayManifests,
  detectStrayTaskMd,
} from "../../src/task/spawn/strays.ts";

describe("detectStrayManifests", () => {
  let spawnRoot: string;
  beforeEach(() => {
    spawnRoot = mkdtempSync(join(tmpdir(), "converge-strays-"));
  });
  afterEach(() => {
    rmSync(spawnRoot, { recursive: true, force: true });
  });

  it("returns no evidence when no stray manifest exists", () => {
    const ev = detectStrayManifests(spawnRoot);
    expect(ev).toEqual([]);
  });

  it("flags a body-authored spawn.plan.jsonl at spawn root", () => {
    writeFileSync(join(spawnRoot, "spawn.plan.jsonl"), "{}\n", "utf-8");
    const ev = detectStrayManifests(spawnRoot);
    expect(ev).toHaveLength(1);
    expect(ev[0]!.errorCode).toBe("SPAWN_MANIFEST_AUTHORED_BY_BODY");
    expect(ev[0]!.file).toBe("spawn.plan.jsonl");
  });

  it("does NOT flag spawn.plan.jsonl one level deep (that's body scratch)", () => {
    // A child dir is its own world — only the top-level scan counts.
    mkdirSync(join(spawnRoot, "real"), { recursive: true });
    writeFileSync(
      join(spawnRoot, "real", "spawn.yml"),
      "template: t\n",
      "utf-8",
    );
    writeFileSync(
      join(spawnRoot, "real", "spawn.plan.jsonl"),
      "{}\n",
      "utf-8",
    );
    const ev = detectStrayManifests(spawnRoot);
    expect(ev).toEqual([]);
  });
});

describe("detectStrayTaskMd", () => {
  let spawnRoot: string;
  beforeEach(() => {
    spawnRoot = mkdtempSync(join(tmpdir(), "converge-strays-"));
  });
  afterEach(() => {
    rmSync(spawnRoot, { recursive: true, force: true });
  });

  it("returns no evidence when no child writes its own TASK.md", () => {
    mkdirSync(join(spawnRoot, "real"), { recursive: true });
    writeFileSync(
      join(spawnRoot, "real", "spawn.yml"),
      "template: t\n",
      "utf-8",
    );
    const ev = detectStrayTaskMd(spawnRoot);
    expect(ev).toEqual([]);
  });

  it("flags a body that wrote <id>/TASK.md instead of spawn.yml", () => {
    mkdirSync(join(spawnRoot, "hero-spec"), { recursive: true });
    writeFileSync(
      join(spawnRoot, "hero-spec", "TASK.md"),
      "---\nid: hero-spec\n---\n# bespoke contract\n",
      "utf-8",
    );
    writeFileSync(
      join(spawnRoot, "hero-spec", "spawn.yml"),
      "template: t\n",
      "utf-8",
    );

    const ev = detectStrayTaskMd(spawnRoot);
    expect(ev).toHaveLength(1);
    expect(ev[0]!.id).toBe("hero-spec");
    expect(ev[0]!.errorCode).toBe("SPAWN_TASKMD_AUTHORED_BY_BODY");
    expect(ev[0]!.file).toBe("hero-spec/TASK.md");
  });

  it("does NOT flag the framework-generated EXPANDED.md", () => {
    mkdirSync(join(spawnRoot, "real"), { recursive: true });
    writeFileSync(
      join(spawnRoot, "real", "spawn.yml"),
      "template: t\n",
      "utf-8",
    );
    writeFileSync(
      join(spawnRoot, "real", "EXPANDED.md"),
      "---\nid: real\n---\n",
      "utf-8",
    );
    const ev = detectStrayTaskMd(spawnRoot);
    expect(ev).toEqual([]);
  });

  it("skips _-prefixed directories", () => {
    mkdirSync(join(spawnRoot, "_scratch"), { recursive: true });
    writeFileSync(
      join(spawnRoot, "_scratch", "TASK.md"),
      "x",
      "utf-8",
    );
    const ev = detectStrayTaskMd(spawnRoot);
    expect(ev).toEqual([]);
  });
});
