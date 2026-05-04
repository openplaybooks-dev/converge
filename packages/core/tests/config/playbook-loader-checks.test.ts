import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parsePlaybookYml } from "../../src/task/playbook/loader.ts";

function makePlaybook(tmp: string, yml: string): string {
  const dir = join(tmp, "default");
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(dir, "tasks"), { recursive: true });
  writeFileSync(join(dir, "playbook.yml"), yml, "utf-8");
  return dir;
}

describe("playbook loader — parseChecks test refs", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "pb-checks-"));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("accepts inline cmd checks (no regression)", async () => {
    const dir = makePlaybook(
      tmp,
      [
        "name: pb",
        "tasks: []",
        "checks:",
        "  - id: typecheck",
        "    cmd: pnpm typecheck",
      ].join("\n"),
    );
    const def = await parsePlaybookYml(dir);
    expect(def.checks).toEqual([
      { id: "typecheck", cmd: "pnpm typecheck" },
    ]);
  });

  it("accepts test-ref string shorthand", async () => {
    const dir = makePlaybook(
      tmp,
      [
        "name: pb",
        "tasks: []",
        "checks:",
        "  - test:file-exists(path=idea.md)",
      ].join("\n"),
    );
    const def = await parsePlaybookYml(dir);
    expect(def.checks).toHaveLength(1);
    expect(def.checks![0]).toMatchObject({
      id: "test:file-exists",
      type: "test",
      name: "file-exists",
      args: { path: "idea.md" },
    });
  });

  it("accepts test-ref object form", async () => {
    const dir = makePlaybook(
      tmp,
      [
        "name: pb",
        "tasks: []",
        "checks:",
        "  - type: test",
        "    name: backend-configured",
        "    args:",
        "      skill: image-generate",
      ].join("\n"),
    );
    const def = await parsePlaybookYml(dir);
    expect(def.checks).toHaveLength(1);
    expect(def.checks![0]).toMatchObject({
      id: "test:backend-configured",
      type: "test",
      name: "backend-configured",
      args: { skill: "image-generate" },
    });
  });

  it("accepts test-ref with explicit id and description", async () => {
    const dir = makePlaybook(
      tmp,
      [
        "name: pb",
        "tasks: []",
        "checks:",
        "  - id: image-backend-configured",
        "    description: An image-generate backend is selected",
        "    type: test",
        "    name: backend-configured",
        "    args:",
        "      skill: image-generate",
      ].join("\n"),
    );
    const def = await parsePlaybookYml(dir);
    expect(def.checks![0]).toMatchObject({
      id: "image-backend-configured",
      description: "An image-generate backend is selected",
      type: "test",
      name: "backend-configured",
      args: { skill: "image-generate" },
    });
  });

  it("propagates description on inline cmd checks", async () => {
    const dir = makePlaybook(
      tmp,
      [
        "name: pb",
        "tasks: []",
        "checks:",
        "  - id: typecheck",
        "    description: All packages typecheck",
        "    cmd: pnpm typecheck",
      ].join("\n"),
    );
    const def = await parsePlaybookYml(dir);
    expect(def.checks![0]).toMatchObject({
      id: "typecheck",
      description: "All packages typecheck",
      cmd: "pnpm typecheck",
    });
  });

  it("accepts shorthand without args", async () => {
    const dir = makePlaybook(
      tmp,
      [
        "name: pb",
        "tasks: []",
        "checks:",
        "  - test:budget-initialized",
      ].join("\n"),
    );
    const def = await parsePlaybookYml(dir);
    expect(def.checks![0]).toMatchObject({
      type: "test",
      name: "budget-initialized",
      args: {},
    });
  });

  it("mixes inline and test-ref entries", async () => {
    const dir = makePlaybook(
      tmp,
      [
        "name: pb",
        "tasks: []",
        "checks:",
        "  - id: lint",
        "    cmd: pnpm lint",
        "  - test:file-exists(path=idea.md)",
        "  - type: test",
        "    name: budget-initialized",
      ].join("\n"),
    );
    const def = await parsePlaybookYml(dir);
    expect(def.checks).toHaveLength(3);
    expect(def.checks![0].id).toBe("lint");
    expect(def.checks![1].name).toBe("file-exists");
    expect(def.checks![2].name).toBe("budget-initialized");
  });

  it("rejects malformed shorthand", async () => {
    const dir = makePlaybook(
      tmp,
      [
        "name: pb",
        "tasks: []",
        "checks:",
        '  - "test:freshness(path)"',
      ].join("\n"),
    );
    await expect(parsePlaybookYml(dir)).rejects.toThrow(/key=val/);
  });

  it("rejects type:test object missing name", async () => {
    const dir = makePlaybook(
      tmp,
      [
        "name: pb",
        "tasks: []",
        "checks:",
        '  - type: test',
      ].join("\n"),
    );
    await expect(parsePlaybookYml(dir)).rejects.toThrow(/must have a "name" field/);
  });
});
