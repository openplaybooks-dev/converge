/**
 * RFC 0024 — Invocation discovery tests.
 *
 * `discoverInvocations(spawnRoot)` walks the spawn cwd one level deep and
 * for every `<id>/spawn.yml` produces a `DiscoveredInvocation`. Files other
 * than `spawn.yml` are ignored as scratch. Directories whose name starts
 * with `_` are skipped entirely. Stray manifests and stray TASK.md files
 * surface as separate per-file errors (handled in strays.test.ts).
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
import { discoverInvocations } from "../../src/task/spawn/discover.ts";

function writeSpawn(
  spawnRoot: string,
  id: string,
  content: string,
): void {
  const dir = join(spawnRoot, id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "spawn.yml"), content, "utf-8");
}

describe("discoverInvocations", () => {
  let spawnRoot: string;

  beforeEach(() => {
    spawnRoot = mkdtempSync(join(tmpdir(), "converge-discover-"));
  });

  afterEach(() => {
    rmSync(spawnRoot, { recursive: true, force: true });
  });

  it("returns empty when spawn root does not exist", () => {
    const missing = join(spawnRoot, "nope");
    const { invocations, evidence } = discoverInvocations(missing);
    expect(invocations).toEqual([]);
    expect(evidence).toEqual([]);
  });

  it("returns empty when spawn root is empty", () => {
    const { invocations, evidence } = discoverInvocations(spawnRoot);
    expect(invocations).toEqual([]);
    expect(evidence).toEqual([]);
  });

  it("discovers a single invocation", () => {
    writeSpawn(spawnRoot, "hero-spec", "template: asset-spec\nparams:\n  assetId: hero\n");

    const { invocations, evidence } = discoverInvocations(spawnRoot);
    expect(evidence).toEqual([]);
    expect(invocations).toHaveLength(1);
    const inv = invocations[0]!;
    expect(inv.id).toBe("hero-spec");
    expect(inv.spawnYmlPath.endsWith("/hero-spec/spawn.yml")).toBe(true);
    expect(inv.invocation.template).toBe("asset-spec");
    expect(inv.invocation.params).toEqual({ assetId: "hero" });
  });

  it("discovers multiple invocations and sorts by id", () => {
    writeSpawn(spawnRoot, "c", "template: t\n");
    writeSpawn(spawnRoot, "a", "template: t\n");
    writeSpawn(spawnRoot, "b", "template: t\n");

    const { invocations } = discoverInvocations(spawnRoot);
    expect(invocations.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  it("parses depends_on as a list", () => {
    writeSpawn(
      spawnRoot,
      "wire",
      "template: asset-wire\ndepends_on:\n  - hero-spec\n  - hero-generate\nparams: {}\n",
    );

    const { invocations } = discoverInvocations(spawnRoot);
    expect(invocations[0]!.invocation.depends_on).toEqual([
      "hero-spec",
      "hero-generate",
    ]);
  });

  it("skips directories whose name starts with _", () => {
    writeSpawn(spawnRoot, "_scratch", "template: t\n");
    writeSpawn(spawnRoot, "real", "template: t\n");

    const { invocations } = discoverInvocations(spawnRoot);
    expect(invocations.map((i) => i.id)).toEqual(["real"]);
  });

  it("ignores top-level files (not children)", () => {
    writeFileSync(join(spawnRoot, "stray.txt"), "x", "utf-8");
    writeFileSync(join(spawnRoot, "spawn.yml"), "template: t\n", "utf-8");
    writeSpawn(spawnRoot, "real", "template: t\n");

    const { invocations, evidence } = discoverInvocations(spawnRoot);
    expect(invocations.map((i) => i.id)).toEqual(["real"]);
    expect(evidence).toEqual([]);
  });

  it("ignores subdirectories without spawn.yml", () => {
    mkdirSync(join(spawnRoot, "empty-dir"), { recursive: true });
    writeSpawn(spawnRoot, "real", "template: t\n");
    const { invocations } = discoverInvocations(spawnRoot);
    expect(invocations.map((i) => i.id)).toEqual(["real"]);
  });

  it("does not recurse into nested directories", () => {
    // Nested spawner-child's spawn.yml lives in its own task dir, not here.
    mkdirSync(join(spawnRoot, "outer", "inner"), { recursive: true });
    writeFileSync(
      join(spawnRoot, "outer", "inner", "spawn.yml"),
      "template: t\n",
      "utf-8",
    );
    // outer/ itself has no spawn.yml so it's not a child.
    const { invocations } = discoverInvocations(spawnRoot);
    expect(invocations).toEqual([]);
  });

  it("surfaces malformed YAML as evidence with a parse-error code", () => {
    writeSpawn(spawnRoot, "bad", "template: t\n  - this is not valid: yaml\n  : x\n");
    const { invocations, evidence } = discoverInvocations(spawnRoot);
    expect(invocations).toHaveLength(0);
    expect(evidence).toHaveLength(1);
    expect(evidence[0]!.id).toBe("bad");
    expect(evidence[0]!.errorCode).toBe("invalid-yaml");
  });

  it("surfaces missing-template (no template: key) as evidence", () => {
    writeSpawn(spawnRoot, "empty-inv", "params: {}\n");
    const { invocations, evidence } = discoverInvocations(spawnRoot);
    expect(invocations).toHaveLength(0);
    expect(evidence).toHaveLength(1);
    expect(evidence[0]!.errorCode).toBe("missing-template");
  });
});
