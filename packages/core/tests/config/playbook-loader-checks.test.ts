import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  parsePlaybookYml,
  validatePlaybook,
} from "../../src/task/playbook/loader.ts";

function makePlaybook(tmp: string, yml: string): string {
  const dir = join(tmp, "default");
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(dir, "tasks"), { recursive: true });
  writeFileSync(join(dir, "playbook.yml"), yml, "utf-8");
  return dir;
}

describe("playbook loader — explicit cmd checks", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "pb-checks-"));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("accepts inline cmd checks", async () => {
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
      { id: "typecheck", type: "cmd", cmd: "pnpm typecheck" },
    ]);
  });

  it("rejects string shorthand checks", async () => {
    const dir = makePlaybook(
      tmp,
      [
        "name: pb",
        "tasks: []",
        "checks:",
        "  - test:file-exists(path=idea.md)",
      ].join("\n"),
    );
    await expect(parsePlaybookYml(dir)).rejects.toThrow(/string shorthands are removed/i);
  });

  it("rejects type:test object checks", async () => {
    const dir = makePlaybook(
      tmp,
      [
        "name: pb",
        "tasks: []",
        "checks:",
        "  - type: test",
        "    name: backend-configured",
      ].join("\n"),
    );
    await expect(parsePlaybookYml(dir)).rejects.toThrow(/type: test is removed/i);
  });

  it("validates scripts referenced by check commands", async () => {
    const dir = makePlaybook(
      tmp,
      [
        "name: pb",
        "tasks: []",
        "checks:",
        "  - id: smoke",
        "    cmd: bash scripts/smoke.sh",
      ].join("\n"),
    );
    const def = await parsePlaybookYml(dir);
    expect(validatePlaybook(def, dir).join("\n")).toContain(
      'Check "smoke" references missing script: scripts/smoke.sh',
    );

    mkdirSync(join(dir, "scripts"), { recursive: true });
    writeFileSync(join(dir, "scripts/smoke.sh"), "echo ok\n", "utf-8");
    expect(validatePlaybook(def, dir)).toEqual([]);
  });
});
