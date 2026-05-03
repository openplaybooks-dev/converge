/**
 * Manifest Reader Tests — RED phase
 *
 * Tests for readManifest.
 * The function does not exist yet; tests will fail (RED).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readManifest } from "../../../src/manifest/reader.js";

describe("readManifest", () => {
  let workDir: string;

  beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), "manifest-reader-"));
  });

  afterEach(async () => {
    await rm(workDir, { recursive: true, force: true });
  });

  it("returns null when target/ doesn't exist", async () => {
    // workDir exists but has no target/ subdirectory
    const result = await readManifest(workDir);
    expect(result).toBeNull();
  });

  it("returns null when target/manifest.json doesn't exist", async () => {
    await mkdir(join(workDir, "target"), { recursive: true });
    const result = await readManifest(workDir);
    expect(result).toBeNull();
  });

  it("throws when MANIFEST_VERSION mismatches", async () => {
    await mkdir(join(workDir, "target"), { recursive: true });
    const invalid = JSON.stringify({
      metadata: {
        playbook: "default",
        manifest_version: 999,
        generated_at: "2026-04-30T10:52:54Z",
        converge_version: "0.0.0-test",
      },
      nodes: {},
      child_map: {},
      parent_map: {},
    });
    await writeFile(join(workDir, "target", "manifest.json"), invalid, "utf-8");

    await expect(readManifest(workDir)).rejects.toThrow(/MANIFEST_VERSION/i);
  });

  it("parses a concrete node correctly", async () => {
    await mkdir(join(workDir, "target"), { recursive: true });
    const valid = JSON.stringify({
      metadata: {
        playbook: "default",
        manifest_version: 1,
        generated_at: "2026-04-30T10:52:54Z",
        converge_version: "0.0.0-test",
        frontier_count: 0,
      },
      nodes: {
        "01-define": {
          state: "concrete",
          id: "01-define",
          path: "tasks/01-define/TASK.md",
          tags: ["phase", "define"],
          depends_on: [],
          depended_on_by: [],
          seed: null,
          checks: [],
          inputs: [],
          outputs: [],
          frontmatter_hash: "sha256:aaa",
          body_hash: "sha256:bbb",
          checks_hash: "sha256:ccc",
          inputs_hash: "sha256:ddd",
          upstream_hash: "sha256:eee",
        },
      },
      child_map: {},
      parent_map: {},
    });
    await writeFile(join(workDir, "target", "manifest.json"), valid, "utf-8");

    const result = await readManifest(workDir);
    expect(result).not.toBeNull();
    const node = result!.nodes["01-define"];
    expect(node).toBeDefined();
    expect(node.state).toBe("concrete");
    expect(node.id).toBe("01-define");
    expect(node.path).toBe("tasks/01-define/TASK.md");
    expect(node.tags).toEqual(["phase", "define"]);
  });

  it("parses an expected node correctly", async () => {
    await mkdir(join(workDir, "target"), { recursive: true });
    const valid = JSON.stringify({
      metadata: {
        playbook: "default",
        manifest_version: 1,
        generated_at: "2026-04-30T10:52:54Z",
        converge_version: "0.0.0-test",
        frontier_count: 0,
      },
      nodes: {
        "03-characters/warrior": {
          state: "expected",
          id: "03-characters/warrior",
          seed_parent: "03-characters",
          predicted_from: "assets/characters-catalog.json",
          depends_on: [],
          depended_on_by: [],
          tags: [],
          checks: [],
          inputs: [],
          outputs: [],
          frontmatter_hash: "",
          body_hash: "",
          checks_hash: "",
          inputs_hash: "",
          upstream_hash: "",
        },
      },
      child_map: {},
      parent_map: {},
    });
    await writeFile(join(workDir, "target", "manifest.json"), valid, "utf-8");

    const result = await readManifest(workDir);
    expect(result).not.toBeNull();
    const node = result!.nodes["03-characters/warrior"];
    expect(node).toBeDefined();
    expect(node.state).toBe("expected");
    expect(node.seed_parent).toBe("03-characters");
    expect(node.predicted_from).toBe("assets/characters-catalog.json");
  });

  it("parses a frontier node correctly", async () => {
    await mkdir(join(workDir, "target"), { recursive: true });
    const valid = JSON.stringify({
      metadata: {
        playbook: "default",
        manifest_version: 1,
        generated_at: "2026-04-30T10:52:54Z",
        converge_version: "0.0.0-test",
        frontier_count: 1,
      },
      nodes: {
        "03-tokens/002-craft#frontier": {
          state: "frontier",
          id: "03-tokens/002-craft#frontier",
          seed_parent: "03-tokens/002-craft",
          depends_on: ["03-tokens/002-craft"],
          depended_on_by: [],
          tags: [],
          checks: [],
          inputs: [],
          outputs: [],
          frontmatter_hash: "",
          body_hash: "",
          checks_hash: "",
          inputs_hash: "",
          upstream_hash: "",
        },
      },
      child_map: {},
      parent_map: {},
    });
    await writeFile(join(workDir, "target", "manifest.json"), valid, "utf-8");

    const result = await readManifest(workDir);
    expect(result).not.toBeNull();
    const node = result!.nodes["03-tokens/002-craft#frontier"];
    expect(node).toBeDefined();
    expect(node.state).toBe("frontier");
    expect(node.seed_parent).toBe("03-tokens/002-craft");
    expect(node.depends_on).toEqual(["03-tokens/002-craft"]);
  });
});
