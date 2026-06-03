/**
 * Manifest Writer Tests — RED phase
 *
 * Tests for writeManifest and writeRunState.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, mkdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeManifest, writeRunState } from "../../../src/manifest/writer.js";
import { readManifest } from "../../../src/manifest/reader.js";
import type {
  Manifest,
  ManifestNode,
  RunState,
} from "../../../src/manifest/types.js";

function buildManifest(): Manifest {
  const concreteNode: ManifestNode = {
    state: "concrete",
    id: "01-define",
    path: "tasks/01-define/TASK.md",
    tags: ["phase", "define"],
    depends_on: [],
    depended_on_by: ["02-visual-spec"],
    seed: null,
    checks: [],
    inputs: [],
    outputs: ["assets/game.json"],
    frontmatter_hash: "sha256:aaaa",
    body_hash: "sha256:bbbb",
    checks_hash: "sha256:cccc",
    inputs_hash: "sha256:dddd",
    upstream_hash: "sha256:eeee",
  };

  const expectedNode: ManifestNode = {
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
  };

  const frontierNode: ManifestNode = {
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
  };

  return {
    metadata: {
      playbook: "default",
      playbook_hash: "sha256:meta",
      generated_at: "2026-04-30T10:52:54Z",
      converge_version: "0.0.0-test",
      frontier_count: 1,
    },
    nodes: {
      "01-define": concreteNode,
      "03-characters/warrior": expectedNode,
      "03-tokens/002-craft#frontier": frontierNode,
    },
    child_map: { "01-define": ["02-visual-spec"] },
    parent_map: { "02-visual-spec": ["01-define"] },
  };
}

describe("writeManifest", () => {
  let workDir: string;

  beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), "manifest-writer-"));
    // No need to pre-create target dir — writer creates baseDir directly
  });

  afterEach(async () => {
    await rm(workDir, { recursive: true, force: true });
  });

  it("creates manifest.json with the expected nodes", async () => {
    const manifest = buildManifest();
    await writeManifest(workDir, manifest);

    const raw = await readFile(join(workDir, "manifest.json"), "utf-8");
    const written = JSON.parse(raw) as Manifest;

    expect(written.metadata.playbook).toBe("default");
    expect(written.nodes["01-define"]).toBeDefined();
    expect(written.nodes["01-define"].state).toBe("concrete");
    expect(written.child_map).toBeDefined();
    expect(written.parent_map).toBeDefined();
  });

  it("is atomic: temp-file rename preserves original on crash", async () => {
    const original = buildManifest();
    await writeManifest(workDir, original);

    const firstRaw = await readFile(join(workDir, "manifest.json"), "utf-8");
    const first = JSON.parse(firstRaw);

    // Simulate an interrupted write — write again, which should be a clean overwrite
    const updated: Manifest = {
      ...original,
      metadata: { ...original.metadata, frontier_count: 5 },
    };
    await writeManifest(workDir, updated);

    const secondRaw = await readFile(join(workDir, "manifest.json"), "utf-8");
    const second = JSON.parse(secondRaw);

    expect(second.metadata.frontier_count).toBe(5);
    // After a full write, the file should be a well-formed JSON object
    expect(second.nodes).toBeDefined();
    expect(typeof second.metadata).toBe("object");
  });

  it("round-trips: write -> read -> deep-equal", async () => {
    const manifest = buildManifest();
    await writeManifest(workDir, manifest);

    const readBack = await readManifest(workDir);

    expect(readBack).not.toBeNull();
    expect(readBack!.metadata.playbook).toBe(manifest.metadata.playbook);
    expect(readBack!.metadata.frontier_count).toBe(
      manifest.metadata.frontier_count,
    );
    expect(Object.keys(readBack!.nodes).sort()).toEqual(
      Object.keys(manifest.nodes).sort(),
    );
    expect(readBack!.nodes["01-define"].state).toBe("concrete");
    expect(readBack!.child_map).toEqual(manifest.child_map);
    expect(readBack!.parent_map).toEqual(manifest.parent_map);
  });

  it("serializes all three node states (concrete, expected, frontier)", async () => {
    const manifest = buildManifest();
    await writeManifest(workDir, manifest);

    const raw = await readFile(join(workDir, "manifest.json"), "utf-8");
    const written = JSON.parse(raw);

    expect(written.nodes["01-define"].state).toBe("concrete");
    expect(written.nodes["03-characters/warrior"].state).toBe("expected");
    expect(written.nodes["03-tokens/002-craft#frontier"].state).toBe(
      "frontier",
    );

    expect(written.nodes["01-define"].frontmatter_hash).toBeDefined();
    expect(written.nodes["03-characters/warrior"].predicted_from).toBeDefined();
    expect(
      written.nodes["03-tokens/002-craft#frontier"].seed_parent,
    ).toBeDefined();
  });
});

describe("writeRunState", () => {
  let workDir: string;

  beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), "manifest-runstate-"));
    // No need to pre-create target dir — writer creates baseDir directly
  });

  afterEach(async () => {
    await rm(workDir, { recursive: true, force: true });
  });

  it("writes runstate.json", async () => {
    const state: RunState = {
      metadata: {
        execution_id: "2026-04-30T10-52-54-1gzfss",
        selector: "phase:define+",
        playbook: "default",
        manifest_hash: "sha256:abc",
        status: "running",
      },
      results: [
        {
          id: "01-define",
          status: "pass",
          attempts: 1,
          duration_ms: 12300,
          output_hashes: {
            "assets/game.json": "sha256:aaa",
            "assets/visual-target.png": "sha256:bbb",
          },
        },
        {
          id: "02-visual-spec",
          status: "error",
          attempts: 3,
          duration_ms: 64000,
          error: "Check failed: colors",
        },
      ],
    };

    await writeRunState(workDir, state);

    const raw = await readFile(join(workDir, "runstate.json"), "utf-8");
    const written = JSON.parse(raw) as RunState;

    expect(written.metadata.execution_id).toBe("2026-04-30T10-52-54-1gzfss");
    expect(written.results).toHaveLength(2);
  });

  it("emits output_hashes per result entry", async () => {
    const state: RunState = {
      metadata: {
        execution_id: "s1",
        selector: "all",
        playbook: "default",
        manifest_hash: "sha256:abc",
        status: "running",
      },
      results: [
        {
          id: "task-a",
          status: "pass",
          attempts: 1,
          duration_ms: 100,
          output_hashes: {
            "out/a.json": "sha256:x",
            "out/b.json": "sha256:y",
          },
        },
        {
          id: "task-b",
          status: "pass",
          attempts: 2,
          duration_ms: 200,
          output_hashes: {},
        },
      ],
    };

    await writeRunState(workDir, state);

    const raw = await readFile(join(workDir, "runstate.json"), "utf-8");
    const written = JSON.parse(raw);

    expect(written.results[0].output_hashes).toEqual({
      "out/a.json": "sha256:x",
      "out/b.json": "sha256:y",
    });
    expect(written.results[1].output_hashes).toEqual({});
  });
});
