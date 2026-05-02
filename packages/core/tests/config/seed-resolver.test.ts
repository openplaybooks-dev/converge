import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadSeedLibrary, resolveSeed } from "../../src/runtime/seed-resolver.ts";

describe("loadSeedLibrary", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `seed-lib-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("loads .seed.md files from a directory", () => {
    writeFileSync(join(tmpDir, "per-verb.seed.md"), [
      "---",
      "name: per-verb",
      "kind: nodejs",
      "---",
      "ctx.spawn({ id: 'run' });",
    ].join("\n"));
    writeFileSync(join(tmpDir, "migrate.seed.md"), [
      "---",
      "name: migrate-children",
      "kind: nodejs",
      "---",
      "ctx.spawn({ id: 'child' });",
    ].join("\n"));

    const lib = loadSeedLibrary(tmpDir);

    expect(lib.byName.size).toBe(2);
    expect(lib.byName.has("per-verb")).toBe(true);
    expect(lib.byName.has("migrate-children")).toBe(true);
    expect(lib.byName.get("per-verb")!.definition.kind).toBe("nodejs");
  });

  it("returns empty library for nonexistent directory", () => {
    const lib = loadSeedLibrary(join(tmpDir, "nope"));

    expect(lib.byName.size).toBe(0);
  });

  it("skips unparseable files", () => {
    writeFileSync(join(tmpDir, "good.seed.md"), [
      "---",
      "name: good",
      "kind: shell",
      "---",
      "echo ok",
    ].join("\n"));
    writeFileSync(join(tmpDir, "bad.seed.md"), "not valid markdown at all");

    const lib = loadSeedLibrary(tmpDir);

    expect(lib.byName.size).toBe(1);
    expect(lib.byName.has("good")).toBe(true);
  });

  it("skips non-.seed.md files", () => {
    writeFileSync(join(tmpDir, "good.seed.md"), [
      "---",
      "name: good",
      "kind: shell",
      "---",
      "echo ok",
    ].join("\n"));
    writeFileSync(join(tmpDir, "README.md"), "# docs");
    writeFileSync(join(tmpDir, "script.js"), "console.log(1);");

    const lib = loadSeedLibrary(tmpDir);

    expect(lib.byName.size).toBe(1);
  });

  it("indexes by path and name", () => {
    const filePath = join(tmpDir, "my.seed.md");
    writeFileSync(filePath, [
      "---",
      "name: my-seed",
      "kind: shell",
      "---",
      "echo hi",
    ].join("\n"));

    const lib = loadSeedLibrary(tmpDir);

    expect(lib.byName.get("my-seed")!.path).toBe(filePath);
    expect(lib.byPath.get(filePath)!.name).toBe("my-seed");
  });
});

describe("resolveSeed", () => {
  it("resolves a seed by name", () => {
    const lib = loadSeedLibrary("/nonexistent");
    const result = resolveSeed("anything", lib);

    expect(result).toBeNull();
  });

  it("returns entry when seed exists", () => {
    const lib = {
      byName: new Map(),
      byPath: new Map(),
    };
    const entry = {
      name: "test",
      path: "/tmp/test.seed.md",
      definition: {
        name: "test",
        kind: "nodejs" as const,
        args: {},
        preview_manifest: false,
      },
    };
    lib.byName.set("test", entry);

    const result = resolveSeed("test", lib);
    expect(result).toBe(entry);
  });
});
