import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RunStateManager, writeJournalManifest } from "../../../src/manifest/run-state-manager.js";
import type { Manifest, ManifestNode } from "../../../src/manifest/types.js";

function makeManifest(overrides?: Partial<Manifest>): Manifest {
  const nodeA: ManifestNode = {
    state: "concrete",
    id: "task-a",
    path: "tasks/a/TASK.md",
    depends_on: [],
    depended_on_by: ["task-b"],
    tags: [],
    checks: [],
    inputs: [],
    outputs: [],
    wbs: null,
    frontmatter_hash: "sha256:aa",
    body_hash: "sha256:bb",
    checks_hash: "sha256:cc",
    inputs_hash: "sha256:dd",
    upstream_hash: "sha256:ee",
  };

  const nodeB: ManifestNode = {
    state: "concrete",
    id: "task-b",
    path: "tasks/b/TASK.md",
    depends_on: ["task-a"],
    depended_on_by: [],
    tags: [],
    checks: [],
    inputs: [],
    outputs: [],
    wbs: null,
    frontmatter_hash: "sha256:ff",
    body_hash: "sha256:gg",
    checks_hash: "sha256:hh",
    inputs_hash: "sha256:ii",
    upstream_hash: "sha256:jj",
  };

  return {
    metadata: {
      playbook: "test-playbook",
      generated_at: "2026-05-02T00:00:00Z",
      converge_version: "0.1.0",
      frontier_count: 0,
    },
    nodes: { "task-a": nodeA, "task-b": nodeB },
    child_map: { "task-a": ["task-b"], "task-b": [] },
    parent_map: { "task-a": [], "task-b": ["task-a"] },
    ...overrides,
  };
}

describe("RunStateManager", () => {
  let workDir: string;
  let manager: RunStateManager;

  beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), "rsm-"));
    manager = new RunStateManager(workDir, makeManifest());
  });

  afterEach(async () => {
    await rm(workDir, { recursive: true, force: true });
  });

  describe("constructor", () => {
    it("initializes all manifest nodes as pending with 0 attempts", async () => {
      const snapshot = await manager.getStateSnapshot();
      expect(snapshot.results).toHaveLength(2);
      for (const r of snapshot.results) {
        expect(r.status).toBe("pending");
        expect(r.attempts).toBe(0);
        expect(r.duration_ms).toBe(0);
      }
    });

    it("sets metadata from the manifest", async () => {
      const snapshot = await manager.getStateSnapshot();
      expect(snapshot.metadata.playbook).toBe("test-playbook");
      expect(snapshot.metadata.status).toBe("running");
    });
  });

  describe("markRunning", () => {
    it("increments attempts and sets status to running", async () => {
      const attempt = await manager.markRunning("task-a");
      expect(attempt).toBe(1);

      const status = await manager.getNodeStatus("task-a");
      expect(status!.status).toBe("running");
      expect(status!.attempts).toBe(1);
      expect(status!.started_at).toBeDefined();
    });

    it("persists to disk", async () => {
      await manager.markRunning("task-a");

      const raw = await readFile(join(workDir, "runstate.json"), "utf-8");
      const parsed = JSON.parse(raw);
      expect(parsed.results.find((r: any) => r.id === "task-a").status).toBe("running");
    });

    it("increments attempts on repeated calls", async () => {
      await manager.markRunning("task-a");
      await manager.markRunning("task-a");
      const status = await manager.getNodeStatus("task-a");
      expect(status!.attempts).toBe(2);
    });
  });

  describe("markComplete", () => {
    beforeEach(async () => {
      await manager.markRunning("task-a");
    });

    it("sets status to pass with duration", async () => {
      await manager.markComplete("task-a", 1500);

      const status = await manager.getNodeStatus("task-a");
      expect(status!.status).toBe("pass");
      expect(status!.duration_ms).toBe(1500);
      expect(status!.completed_at).toBeDefined();
    });
  });

  describe("markFailed", () => {
    beforeEach(async () => {
      await manager.markRunning("task-a");
    });

    it("sets status to error with message and duration", async () => {
      await manager.markFailed("task-a", "something broke", 2300);

      const status = await manager.getNodeStatus("task-a");
      expect(status!.status).toBe("error");
      expect(status!.error_message).toBe("something broke");
      expect(status!.duration_ms).toBe(2300);
    });
  });

  describe("markSkipped", () => {
    it("sets status to skipped", async () => {
      await manager.markSkipped("task-a");

      const status = await manager.getNodeStatus("task-a");
      expect(status!.status).toBe("skipped");
    });
  });

  describe("incrementAttempt", () => {
    it("increments attempt count without changing status", async () => {
      const count = await manager.incrementAttempt("task-a");
      expect(count).toBe(1);

      const status = await manager.getNodeStatus("task-a");
      expect(status!.status).toBe("pending");
      expect(status!.attempts).toBe(1);
    });
  });

  describe("queries", () => {
    it("isComplete returns true only for pass", async () => {
      expect(await manager.isComplete("task-a")).toBe(false);
      await manager.markRunning("task-a");
      await manager.markComplete("task-a", 100);
      expect(await manager.isComplete("task-a")).toBe(true);
    });

    it("isFailed returns true only for error", async () => {
      expect(await manager.isFailed("task-a")).toBe(false);
      await manager.markRunning("task-a");
      await manager.markFailed("task-a", "fail", 100);
      expect(await manager.isFailed("task-a")).toBe(true);
    });

    it("isLocked returns true for pass, error, or skipped", async () => {
      expect(await manager.isLocked("task-a")).toBe(false);
      expect(await manager.isLocked("task-b")).toBe(false);

      await manager.markRunning("task-a");
      expect(await manager.isLocked("task-a")).toBe(false);

      await manager.markComplete("task-a", 100);
      expect(await manager.isLocked("task-a")).toBe(true);

      await manager.markRunning("task-b");
      await manager.markFailed("task-b", "oops", 50);
      expect(await manager.isLocked("task-b")).toBe(true);
    });

    it("getAttemptCount returns correct count", async () => {
      expect(await manager.getAttemptCount("task-a")).toBe(0);
      await manager.incrementAttempt("task-a");
      await manager.incrementAttempt("task-a");
      expect(await manager.getAttemptCount("task-a")).toBe(2);
    });

    it("getCompletedCount returns number of pass nodes", async () => {
      expect(await manager.getCompletedCount()).toBe(0);
      await manager.markRunning("task-a");
      await manager.markComplete("task-a", 100);
      expect(await manager.getCompletedCount()).toBe(1);
    });

    it("getFailedCount returns number of error nodes", async () => {
      expect(await manager.getFailedCount()).toBe(0);
      await manager.markRunning("task-a");
      await manager.markFailed("task-a", "err", 100);
      expect(await manager.getFailedCount()).toBe(1);
    });

    it("getNodeStatus returns undefined for unknown node", async () => {
      const result = await manager.getNodeStatus("nonexistent");
      expect(result).toBeUndefined();
    });
  });

  describe("getStateSnapshot", () => {
    it("returns a deep copy — mutation does not affect manager", async () => {
      const snap = await manager.getStateSnapshot();
      snap.results[0]!.status = "pass";

      const fresh = await manager.getNodeStatus("task-a");
      expect(fresh!.status).toBe("pending");
    });
  });
});

describe("writeJournalManifest", () => {
  let workDir: string;

  beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), "rsm-jm-"));
  });

  afterEach(async () => {
    await rm(workDir, { recursive: true, force: true });
  });

  it("writes manifest.json to the execution directory", async () => {
    const manifest = makeManifest();
    await writeJournalManifest(workDir, manifest);

    const raw = await readFile(join(workDir, "manifest.json"), "utf-8");
    const parsed = JSON.parse(raw);
    expect(parsed.metadata.playbook).toBe("test-playbook");
    expect(Object.keys(parsed.nodes)).toHaveLength(2);
  });
});
