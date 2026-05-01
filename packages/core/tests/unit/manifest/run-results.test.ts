/**
 * Run Results Tests — RED phase
 *
 * Tests for writeRunResults + readRunResults round-trip.
 * readRunResults does not exist yet; tests will fail (RED).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { writeManifest, writeRunResults } from "../../../src/manifest/writer.js";
import { readManifest, readRunResults } from "../../../src/manifest/reader.js";
import type { Manifest, RunResults, RunResult, ManifestNode } from "../../../src/manifest/types.js";

function buildManifest(sessionSelector: string): Manifest {
  const concreteNode: ManifestNode = {
    state: "concrete",
    id: "01-define",
    path: "tasks/01-define/TASK.md",
    tags: ["phase", "define"],
    depends_on: [],
    depended_on_by: ["02-visual-spec"],
    wbs: null,
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
    wbs_parent: "03-characters",
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
    },
    child_map: { "01-define": ["02-visual-spec"] },
    parent_map: { "02-visual-spec": ["01-define"] },
  };
}

function sha256(content: string): string {
  return `sha256:${createHash("sha256").update(content).digest("hex")}`;
}

describe("writeRunResults + readRunResults", () => {
  let workDir: string;

  beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), "run-results-"));
    await mkdir(join(workDir, "target"), { recursive: true });
  });

  afterEach(async () => {
    await rm(workDir, { recursive: true, force: true });
  });

  it("emits a JSON object with metadata.session_id, metadata.selector, and results[]", async () => {
    const results: RunResults = {
      metadata: {
        session_id: "2026-04-30T10-52-54-1gzfss",
        selector: "phase:define+",
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

    await writeRunResults(workDir, results);

    const readBack = await readRunResults(workDir);

    expect(readBack).not.toBeNull();
    expect(readBack!.metadata.session_id).toBe("2026-04-30T10-52-54-1gzfss");
    expect(readBack!.metadata.selector).toBe("phase:define+");
    expect(readBack!.results).toHaveLength(2);
  });

  it("round-trips: write -> read -> deep-equal", async () => {
    const results: RunResults = {
      metadata: {
        session_id: "s1",
        selector: "all",
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
          status: "error",
          attempts: 2,
          duration_ms: 200,
          error: "something went wrong",
        },
      ],
    };

    await writeRunResults(workDir, results);

    const readBack = await readRunResults(workDir);

    expect(readBack).not.toBeNull();
    expect(readBack!.metadata).toEqual(results.metadata);
    expect(readBack!.results).toHaveLength(results.results.length);

    for (let i = 0; i < results.results.length; i++) {
      const orig = results.results[i]!;
      const round = readBack!.results[i]!;
      expect(round.id).toBe(orig.id);
      expect(round.status).toBe(orig.status);
      expect(round.attempts).toBe(orig.attempts);
      expect(round.duration_ms).toBe(orig.duration_ms);
      if (orig.output_hashes) {
        expect(round.output_hashes).toEqual(orig.output_hashes);
      }
      if (orig.error) {
        expect(round.error).toBe(orig.error);
      }
    }
  });

  it("each result carries id, status, attempts, duration_ms, optional output_hashes", async () => {
    const results: RunResults = {
      metadata: { session_id: "s1", selector: "all" },
      results: [
        {
          id: "task-a",
          status: "pass",
          attempts: 1,
          duration_ms: 100,
          output_hashes: { "out/a.json": "sha256:x" },
        },
        {
          id: "task-b",
          status: "pass",
          attempts: 2,
          duration_ms: 200,
        },
      ],
    };

    await writeRunResults(workDir, results);

    const readBack = await readRunResults(workDir);

    expect(readBack!.results[0]!.id).toBe("task-a");
    expect(readBack!.results[0]!.status).toBe("pass");
    expect(readBack!.results[0]!.attempts).toBe(1);
    expect(readBack!.results[0]!.duration_ms).toBe(100);
    expect(readBack!.results[0]!.output_hashes).toEqual({ "out/a.json": "sha256:x" });

    expect(readBack!.results[1]!.id).toBe("task-b");
    expect(readBack!.results[1]!.output_hashes).toBeUndefined();
  });

  it("output hashes are content-addressed: same content → same hash", async () => {
    const content = JSON.stringify({ health: 100, mana: 50 });
    const hash1 = sha256(content);
    const hash2 = sha256(content);

    // Same content must produce identical hash
    expect(hash1).toBe(hash2);

    const results: RunResults = {
      metadata: { session_id: "s1", selector: "all" },
      results: [
        {
          id: "task-a",
          status: "pass",
          attempts: 1,
          duration_ms: 100,
          output_hashes: {
            "player.json": hash1,
          },
        },
      ],
    };

    await writeRunResults(workDir, results);

    const readBack = await readRunResults(workDir);
    expect(readBack!.results[0]!.output_hashes!["player.json"]).toBe(hash1);
    // Same content hashed again yields same result
    expect(readBack!.results[0]!.output_hashes!["player.json"]).toBe(hash2);
  });

  it("output hashes are content-addressed: different content → different hash", async () => {
    const hashA = sha256(JSON.stringify({ x: 1 }));
    const hashB = sha256(JSON.stringify({ x: 2 }));

    // Different content must produce different hashes
    expect(hashA).not.toBe(hashB);

    const results: RunResults = {
      metadata: { session_id: "s1", selector: "all" },
      results: [
        {
          id: "task-a",
          status: "pass",
          attempts: 1,
          duration_ms: 100,
          output_hashes: {
            "a.json": hashA,
            "b.json": hashB,
          },
        },
      ],
    };

    await writeRunResults(workDir, results);

    const readBack = await readRunResults(workDir);
    expect(readBack!.results[0]!.output_hashes!["a.json"]).toBe(hashA);
    expect(readBack!.results[0]!.output_hashes!["b.json"]).toBe(hashB);
    expect(readBack!.results[0]!.output_hashes!["a.json"]).not.toBe(
      readBack!.results[0]!.output_hashes!["b.json"],
    );
  });
});
