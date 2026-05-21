/**
 * RFC 0024 — Portable resume via the inventory ledger.
 *
 * These tests lock the three contracts that make cross-machine resume
 * work:
 *   1. Every runtime status transition is mirrored to the inventory.
 *   2. When runstate.json is absent, the manager hydrates prior-pass
 *      state from the inventory ledger.
 *   3. The hydrated state survives a round-trip: write on machine A,
 *      read on machine B with no journal directory present.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RunStateManager } from "../../../src/manifest/run-state-manager.js";
import type { Manifest, ManifestNode } from "../../../src/manifest/types.js";
import {
  appendTaskUpsert,
  readRuntimeLedgerState,
  runtimeTasksPath,
} from "../../../src/task/goal/runtime-ledger.js";

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
    outputs: ["dist/a.txt"],
    seed: null,
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
    outputs: ["dist/b.txt"],
    seed: null,
    frontmatter_hash: "sha256:ff",
    body_hash: "sha256:gg",
    checks_hash: "sha256:hh",
    inputs_hash: "sha256:ii",
    upstream_hash: "sha256:jj",
  };
  return {
    metadata: {
      playbook: "rfc-0024-test",
      generated_at: "2026-05-20T00:00:00Z",
      converge_version: "0.1.0",
      frontier_count: 0,
    },
    nodes: { "task-a": nodeA, "task-b": nodeB },
    child_map: { "task-a": ["task-b"], "task-b": [] },
    parent_map: { "task-a": [], "task-b": ["task-a"] },
    ...overrides,
  };
}

describe("RFC 0024 — portable resume via inventory", () => {
  let projectDir: string;
  let executionDir: string;

  beforeEach(async () => {
    projectDir = await mkdtemp(join(tmpdir(), "rfc-0024-"));
    executionDir = join(projectDir, ".converge", "journal", "rfc-0024-test");
    await mkdir(executionDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(projectDir, { recursive: true, force: true });
  });

  describe("inventory mirrors every runtime status transition", () => {
    it("writes 'doing' on markRunning", async () => {
      const mgr = new RunStateManager(executionDir, makeManifest(), undefined, projectDir);
      await mgr.markRunning("task-a", { workerId: "worker-1" });
      const state = readRuntimeLedgerState(projectDir, "rfc-0024-test");
      const row = state.tasks.find((t) => t.id === "task-a");
      expect(row?.status).toBe("doing");
    });

    it("writes 'done' + fingerprint + completedAt on markCached", async () => {
      const mgr = new RunStateManager(executionDir, makeManifest(), undefined, projectDir);
      mgr.setNodeFingerprint("task-a", "sha256:fp-a");
      await mgr.markCached("task-a", "sha256:fp-a", {
        duration_ms: 1234,
        output_hashes: undefined,
        attempts_detail: [],
      } as any);
      const state = readRuntimeLedgerState(projectDir, "rfc-0024-test");
      const row = state.tasks.find((t) => t.id === "task-a");
      expect(row?.status).toBe("done");
      expect(row?.fingerprint).toBe("sha256:fp-a");
      expect(row?.completedAt).toBeTruthy();
    });

    it("writes 'done' + fingerprint on markComplete", async () => {
      const mgr = new RunStateManager(executionDir, makeManifest(), undefined, projectDir);
      mgr.setNodeFingerprint("task-a", "sha256:complete-fp");
      await mgr.markComplete("task-a", 42);
      const state = readRuntimeLedgerState(projectDir, "rfc-0024-test");
      const row = state.tasks.find((t) => t.id === "task-a");
      expect(row?.status).toBe("done");
      expect(row?.fingerprint).toBe("sha256:complete-fp");
    });

    it("writes 'blocked' on markFailed", async () => {
      const mgr = new RunStateManager(executionDir, makeManifest(), undefined, projectDir);
      await mgr.markFailed("task-a", "boom", 99);
      const state = readRuntimeLedgerState(projectDir, "rfc-0024-test");
      const row = state.tasks.find((t) => t.id === "task-a");
      expect(row?.status).toBe("blocked");
    });

    it("writes 'dropped' on markSkipped", async () => {
      const mgr = new RunStateManager(executionDir, makeManifest(), undefined, projectDir);
      await mgr.markSkipped("task-a");
      const state = readRuntimeLedgerState(projectDir, "rfc-0024-test");
      const row = state.tasks.find((t) => t.id === "task-a");
      expect(row?.status).toBe("dropped");
    });

    it("publishes 'done' even when fingerprint is unset (regression: spawned children)", async () => {
      // Earlier versions demoted "done" → "doing" when node.fingerprint
      // was missing. That broke spawned children whose fingerprints are
      // set at apply-time (renderedHash in metadata), not via
      // setNodeFingerprint — markComplete would fire correctly but the
      // inventory row would stick at "doing" forever even though the
      // work succeeded. The cross-machine resume hydrate already skips
      // rows without a fingerprint (see hydrateFromInventory), so a
      // degraded done-without-fingerprint row is harmless: it can't be
      // hydrated by peers but it doesn't lie about being done locally.
      const mgr = new RunStateManager(executionDir, makeManifest(), undefined, projectDir);
      await mgr.markComplete("task-a", 42);
      const state = readRuntimeLedgerState(projectDir, "rfc-0024-test");
      const row = state.tasks.find((t) => t.id === "task-a");
      expect(row?.status).toBe("done");
    });
  });

  describe("hydration when runstate.json is absent", () => {
    it("rehydrates 'done' rows to in-memory 'pass'", async () => {
      // Seed the inventory directly (simulates a teammate who committed
      // their .converge/inventory/ but whose .converge/journal/ is gitignored).
      appendTaskUpsert(projectDir, "rfc-0024-test", {
        id: "task-a",
        taskPath: "tasks/a/TASK.md",
        goalId: "inventory",
        summary: "task-a",
        status: "done",
        source: "static",
        playbook: "rfc-0024-test",
        outputs: ["dist/a.txt"],
        fingerprint: "sha256:hydrated-fp",
        completedAt: "2026-05-18T12:00:00Z",
      });

      // Fresh execution dir — no runstate.json present.
      const peerExecDir = join(projectDir, ".converge", "journal", "rfc-0024-test-peer");
      await mkdir(peerExecDir, { recursive: true });
      const mgr = new RunStateManager(peerExecDir, makeManifest(), undefined, projectDir);
      const snapshot = await mgr.getStateSnapshot();
      const a = snapshot.results.find((r) => r.id === "task-a");
      expect(a?.status).toBe("pass");
      expect(a?.fingerprint).toBe("sha256:hydrated-fp");
      expect(a?.completed_at).toBe("2026-05-18T12:00:00Z");
      // Untouched task stays pending.
      const b = snapshot.results.find((r) => r.id === "task-b");
      expect(b?.status).toBe("pending");
    });

    it("skips rows without a fingerprint (legacy inventories)", async () => {
      // The four committed mezon-bot-ai inventories today have status:"todo"
      // for everything and no fingerprint — we must not pretend they are
      // resumable.
      appendTaskUpsert(projectDir, "rfc-0024-test", {
        id: "task-a",
        taskPath: "tasks/a/TASK.md",
        goalId: "inventory",
        summary: "task-a",
        status: "done",
        source: "static",
        playbook: "rfc-0024-test",
        // No fingerprint.
      });
      const peerExecDir = join(projectDir, ".converge", "journal", "rfc-0024-test-peer");
      await mkdir(peerExecDir, { recursive: true });
      const mgr = new RunStateManager(peerExecDir, makeManifest(), undefined, projectDir);
      const snapshot = await mgr.getStateSnapshot();
      const a = snapshot.results.find((r) => r.id === "task-a");
      expect(a?.status).toBe("pending");
    });

    it("ignores rows whose id is not in the current DAG", async () => {
      // Renamed/removed tasks must not throw or pollute the DAG.
      appendTaskUpsert(projectDir, "rfc-0024-test", {
        id: "task-removed",
        taskPath: "tasks/removed/TASK.md",
        goalId: "inventory",
        summary: "task-removed",
        status: "done",
        source: "static",
        playbook: "rfc-0024-test",
        fingerprint: "sha256:stale",
      });
      const peerExecDir = join(projectDir, ".converge", "journal", "rfc-0024-test-peer");
      await mkdir(peerExecDir, { recursive: true });
      expect(
        () => new RunStateManager(peerExecDir, makeManifest(), undefined, projectDir),
      ).not.toThrow();
    });

    it("does not hydrate when runstate.json is present", async () => {
      // Local resume path: runstate.json wins, inventory is ignored
      // (the local journal is more detailed and may know about retries
      // the inventory does not record).
      const mgr1 = new RunStateManager(executionDir, makeManifest(), undefined, projectDir);
      // Persist a real runstate.json by marking and persisting.
      await mgr1.markPending("task-a");
      expect(existsSync(join(executionDir, "runstate.json"))).toBe(true);
      // Now seed inventory with a "done" + fingerprint.
      appendTaskUpsert(projectDir, "rfc-0024-test", {
        id: "task-a",
        taskPath: "tasks/a/TASK.md",
        goalId: "inventory",
        summary: "task-a",
        status: "done",
        source: "static",
        playbook: "rfc-0024-test",
        fingerprint: "sha256:should-not-win",
      });
      // Construct a fresh manager — runstate.json should win.
      const mgr2 = new RunStateManager(executionDir, makeManifest(), undefined, projectDir);
      const snapshot = await mgr2.getStateSnapshot();
      const a = snapshot.results.find((r) => r.id === "task-a");
      // markPending set this to "pending"; if inventory had hydrated,
      // it would now be "pass".
      expect(a?.status).toBe("pending");
    });
  });

  describe("hasInventoryHydratedPriorState", () => {
    it("returns false when nothing was hydrated", async () => {
      const mgr = new RunStateManager(executionDir, makeManifest(), undefined, projectDir);
      expect(mgr.hasInventoryHydratedPriorState()).toBe(false);
    });

    it("returns true after hydration from inventory", async () => {
      appendTaskUpsert(projectDir, "rfc-0024-test", {
        id: "task-a",
        taskPath: "tasks/a/TASK.md",
        goalId: "inventory",
        summary: "task-a",
        status: "done",
        source: "static",
        playbook: "rfc-0024-test",
        fingerprint: "sha256:fp",
      });
      const peerExecDir = join(projectDir, ".converge", "journal", "rfc-0024-test-peer");
      await mkdir(peerExecDir, { recursive: true });
      const mgr = new RunStateManager(peerExecDir, makeManifest(), undefined, projectDir);
      expect(mgr.hasInventoryHydratedPriorState()).toBe(true);
    });
  });

  describe("done-row preservation guard (RFC 0024 §publishInventoryStatus)", () => {
    it("markRunning does NOT overwrite a done row with matching fingerprint", async () => {
      // Seed inventory with a previously-passed task whose fingerprint
      // matches the current TASK.md fingerprint.
      appendTaskUpsert(projectDir, "rfc-0024-test", {
        id: "task-a",
        taskPath: "tasks/a/TASK.md",
        goalId: "inventory",
        summary: "task-a",
        status: "done",
        source: "static",
        playbook: "rfc-0024-test",
        fingerprint: "sha256:matching-fp",
        completedAt: "2026-05-18T12:00:00Z",
      });
      // Construct a fresh manager (hydrates from inventory); then a
      // subsequent run decides to re-execute the task (selector change,
      // missing output, whatever). markRunning fires.
      const peerExecDir = join(projectDir, ".converge", "journal", "rfc-0024-test-peer");
      await mkdir(peerExecDir, { recursive: true });
      const mgr = new RunStateManager(peerExecDir, makeManifest(), undefined, projectDir);
      mgr.setNodeFingerprint("task-a", "sha256:matching-fp");
      await mgr.markRunning("task-a");
      // Inventory must still show "done" — re-running a task does not
      // erase the prior-pass record.
      const state = readRuntimeLedgerState(projectDir, "rfc-0024-test");
      const row = state.tasks.find((t) => t.id === "task-a");
      expect(row?.status).toBe("done");
      expect(row?.fingerprint).toBe("sha256:matching-fp");
    });

    it("markRunning DOES overwrite a done row whose fingerprint no longer matches (TASK.md edited)", async () => {
      // Stale done row: prior fingerprint differs from current.
      appendTaskUpsert(projectDir, "rfc-0024-test", {
        id: "task-a",
        taskPath: "tasks/a/TASK.md",
        goalId: "inventory",
        summary: "task-a",
        status: "done",
        source: "static",
        playbook: "rfc-0024-test",
        fingerprint: "sha256:stale-fp",
      });
      const peerExecDir = join(projectDir, ".converge", "journal", "rfc-0024-test-peer");
      await mkdir(peerExecDir, { recursive: true });
      const mgr = new RunStateManager(peerExecDir, makeManifest(), undefined, projectDir);
      mgr.setNodeFingerprint("task-a", "sha256:new-fp-after-edit");
      await mgr.markRunning("task-a");
      const state = readRuntimeLedgerState(projectDir, "rfc-0024-test");
      const row = state.tasks.find((t) => t.id === "task-a");
      expect(row?.status).toBe("doing");
    });

    it("markComplete overwrites done idempotently with new fingerprint", async () => {
      // The terminal-transition cases (done, blocked) are always allowed,
      // even when prior was done — re-running successfully should refresh
      // the row with the latest fingerprint and completedAt.
      appendTaskUpsert(projectDir, "rfc-0024-test", {
        id: "task-a",
        taskPath: "tasks/a/TASK.md",
        goalId: "inventory",
        summary: "task-a",
        status: "done",
        source: "static",
        playbook: "rfc-0024-test",
        fingerprint: "sha256:old-fp",
        completedAt: "2026-05-18T12:00:00Z",
      });
      const peerExecDir = join(projectDir, ".converge", "journal", "rfc-0024-test-peer");
      await mkdir(peerExecDir, { recursive: true });
      const mgr = new RunStateManager(peerExecDir, makeManifest(), undefined, projectDir);
      mgr.setNodeFingerprint("task-a", "sha256:new-fp");
      await mgr.markComplete("task-a", 99);
      const state = readRuntimeLedgerState(projectDir, "rfc-0024-test");
      const row = state.tasks.find((t) => t.id === "task-a");
      expect(row?.status).toBe("done");
      expect(row?.fingerprint).toBe("sha256:new-fp");
    });

    it("markFailed overwrites done with blocked (genuine failure)", async () => {
      appendTaskUpsert(projectDir, "rfc-0024-test", {
        id: "task-a",
        taskPath: "tasks/a/TASK.md",
        goalId: "inventory",
        summary: "task-a",
        status: "done",
        source: "static",
        playbook: "rfc-0024-test",
        fingerprint: "sha256:fp",
      });
      const peerExecDir = join(projectDir, ".converge", "journal", "rfc-0024-test-peer");
      await mkdir(peerExecDir, { recursive: true });
      const mgr = new RunStateManager(peerExecDir, makeManifest(), undefined, projectDir);
      mgr.setNodeFingerprint("task-a", "sha256:fp");
      await mgr.markFailed("task-a", "boom", 10);
      const state = readRuntimeLedgerState(projectDir, "rfc-0024-test");
      const row = state.tasks.find((t) => t.id === "task-a");
      expect(row?.status).toBe("blocked");
    });
  });

  describe("RFC 0025 resume-mode reconcile (regression 46acaa701)", () => {
    // The bug being locked: when a playbook declares `run.resume: true`
    // in playbook.yml (the common case for long-running playbooks), the
    // runner used to skip the change-detection block at run/index.ts:701
    // entirely. RFC 0025 hydrate populated in-memory nodes from the
    // inventory, but no fingerprint match or output existence check
    // ever fired — so a peer-machine resume with edited TASK.md or
    // deleted outputs silently skipped tasks that needed redo.
    //
    // The fix at run/index.ts is: the change-detection gate becomes
    // `if ((!opts.resume && !opts.fullRefresh) || needsHydratedReconcile)`,
    // where `needsHydratedReconcile = hasInventoryHydratedPriorState()`.
    // We can't easily call `run()` from a unit test (heavyweight), so
    // we exercise the seam: hasInventoryHydratedPriorState must remain
    // true after hydrate, regardless of any subsequent operations on
    // the manager.

    it("hasInventoryHydratedPriorState stays true after setNodeFingerprint", async () => {
      // setNodeFingerprint is called from run/index.ts:706 right before
      // change-detection. If it accidentally resets node.status, the
      // hydrate signal would be lost and the resume gate would slam
      // shut. Lock the invariant.
      appendTaskUpsert(projectDir, "rfc-0024-test", {
        id: "task-a",
        taskPath: "tasks/a/TASK.md",
        goalId: "inventory",
        summary: "task-a",
        status: "done",
        source: "static",
        playbook: "rfc-0024-test",
        fingerprint: "sha256:hydrated",
      });
      const peerExecDir = join(projectDir, ".converge", "journal", "rfc-0024-test-peer-r");
      await mkdir(peerExecDir, { recursive: true });
      const mgr = new RunStateManager(peerExecDir, makeManifest(), undefined, projectDir);
      expect(mgr.hasInventoryHydratedPriorState()).toBe(true);
      // Simulate the run-time call site that previously broke things.
      mgr.setNodeFingerprint("task-a", "sha256:hydrated");
      mgr.setNodeFingerprint("task-b", "sha256:fresh");
      expect(mgr.hasInventoryHydratedPriorState()).toBe(true);
    });

    it("inventoryHydratedAsPrevState carries pass+fingerprint for the reconcile loop", async () => {
      // The reconcile loop at run/index.ts:720-766 reads
      // `prevState.dag.nodes[node.id]` and checks `.status === "pass"`
      // and `.fingerprint`. If `inventoryHydratedAsPrevState` returns
      // a snapshot with those fields stripped, no node would match
      // and every hydrated row would silently fall through as "new".
      appendTaskUpsert(projectDir, "rfc-0024-test", {
        id: "task-a",
        taskPath: "tasks/a/TASK.md",
        goalId: "inventory",
        summary: "task-a",
        status: "done",
        source: "static",
        playbook: "rfc-0024-test",
        fingerprint: "sha256:fp-a",
        completedAt: "2026-05-18T09:21:00Z",
      });
      const peerExecDir = join(projectDir, ".converge", "journal", "rfc-0024-test-peer-prev");
      await mkdir(peerExecDir, { recursive: true });
      const mgr = new RunStateManager(peerExecDir, makeManifest(), undefined, projectDir);
      const prev = mgr.inventoryHydratedAsPrevState();
      const nodeA = prev.dag.nodes["task-a"];
      expect(nodeA?.status).toBe("pass");
      expect(nodeA?.fingerprint).toBe("sha256:fp-a");
      expect(nodeA?.completed_at).toBe("2026-05-18T09:21:00Z");
    });

    it("hydrate followed by markCached preserves the done invariant", async () => {
      // The end-to-end of RFC 0025 under --resume: hydrate sets node
      // to pass+fingerprint; the runner's change-detection loop sees
      // a match, calls markCached, which persists. Crucially, the
      // inventory row must remain "done" — not get downgraded to
      // doing/dropped during the marking ceremony.
      appendTaskUpsert(projectDir, "rfc-0024-test", {
        id: "task-a",
        taskPath: "tasks/a/TASK.md",
        goalId: "inventory",
        summary: "task-a",
        status: "done",
        source: "static",
        playbook: "rfc-0024-test",
        fingerprint: "sha256:fp-a",
      });
      const peerExecDir = join(projectDir, ".converge", "journal", "rfc-0024-test-peer-cache");
      await mkdir(peerExecDir, { recursive: true });
      const mgr = new RunStateManager(peerExecDir, makeManifest(), undefined, projectDir);
      mgr.setNodeFingerprint("task-a", "sha256:fp-a");
      await mgr.markCached("task-a", "sha256:fp-a", {
        duration_ms: 0,
        output_hashes: undefined,
        attempts_detail: [],
      } as any);
      const inv = readRuntimeLedgerState(projectDir, "rfc-0024-test");
      const row = inv.tasks.find((t) => t.id === "task-a");
      expect(row?.status).toBe("done");
    });
  });

  describe("inventory file shape", () => {
    it("each row is a single JSON line", async () => {
      const mgr = new RunStateManager(executionDir, makeManifest(), undefined, projectDir);
      mgr.setNodeFingerprint("task-a", "sha256:fp-a");
      await mgr.markCached("task-a", "sha256:fp-a", {
        duration_ms: 0,
        output_hashes: undefined,
        attempts_detail: [],
      } as any);
      const raw = await readFile(runtimeTasksPath(projectDir, "rfc-0024-test"), "utf-8");
      const lines = raw.split("\n").filter((l) => l.length > 0);
      for (const line of lines) {
        expect(() => JSON.parse(line)).not.toThrow();
      }
    });
  });
});
