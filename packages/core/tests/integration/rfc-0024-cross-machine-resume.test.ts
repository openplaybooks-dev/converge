/**
 * RFC 0024 — Cross-machine resume via the inventory ledger.
 *
 * Integration test for the full factory → inventory → journal layered
 * model. The scenario this locks down:
 *
 *   Machine A:
 *     1. Author a tiny playbook with two tasks (task-a → task-b).
 *     2. Drive both tasks through their full lifecycle (pending →
 *        running → pass) via the real RunStateManager.
 *     3. Verify that the inventory ledger now records "done" + a real
 *        sha256 fingerprint for each task, and that the per-task
 *        outputs have been created on disk.
 *
 *   Repo transit (the moment when .converge/journal/ is gitignored):
 *     4. Delete .converge/journal/ wholesale.
 *     5. Keep everything else: TASK.md files, declared outputs,
 *        .converge/inventory/.
 *
 *   Machine B:
 *     6. Construct a fresh RunStateManager against the same project.
 *     7. Compute fingerprints with the same algorithm the runner uses.
 *     8. Walk the change-detection predicates (status === pass,
 *        fingerprint match, outputs on disk) for every node.
 *     9. Assert all tasks land in the "cached" bucket — no body
 *        re-runs, no API calls.
 *
 *   Mutation cases (the reconcile job):
 *    10. Edit a TASK.md → that task and downstream cascade to pending.
 *    11. Delete an output file → owning task resets to pending.
 *
 * If this test ever breaks, cross-machine resume is broken — the
 * exact failure mode the mezon-bot-ai workspace exhibits today.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
  appendFileSync,
} from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { RunStateManager } from "../../src/manifest/run-state-manager.js";
import { computeFingerprint } from "../../src/run/helpers.js";
import type { Manifest, ManifestNode } from "../../src/manifest/types.js";
import type { DagNode } from "../../src/dag/dag-node.js";
import {
  readRuntimeLedgerState,
  runtimeTasksPath,
} from "../../src/task/goal/runtime-ledger.js";

const PLAYBOOK = "rfc-0024-integration";

function plant(filePath: string, body: string) {
  mkdirSync(filePath.substring(0, filePath.lastIndexOf("/")), { recursive: true });
  writeFileSync(filePath, body);
}

/** A minimal TASK.md, as a playbook would author it on disk. */
function taskMd(title: string, outputs: string[]): string {
  const yaml = [
    "---",
    `title: ${title}`,
    "checks:",
    "  - id: noop",
    "    cmd: true",
    "outputs:",
    ...outputs.map((o) => `  - ${o}`),
    "inputs: []",
    "---",
    "",
    `# ${title}`,
    "",
    `Body for ${title}.`,
  ].join("\n");
  return yaml;
}

/** Build a Manifest of two tasks A → B referencing on-disk TASK.md files. */
function makeManifest(projectDir: string): Manifest {
  const aPath = `playbooks/${PLAYBOOK}/tasks/task-a/TASK.md`;
  const bPath = `playbooks/${PLAYBOOK}/tasks/task-b/TASK.md`;
  plant(join(projectDir, aPath), taskMd("task-a", ["dist/a.txt"]));
  plant(join(projectDir, bPath), taskMd("task-b", ["dist/b.txt"]));

  const nodeA: ManifestNode = {
    state: "concrete",
    id: "task-a",
    path: aPath,
    depends_on: [],
    depended_on_by: ["task-b"],
    tags: [],
    checks: [{ id: "noop", cmd: "true" }],
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
    path: bPath,
    depends_on: ["task-a"],
    depended_on_by: [],
    tags: [],
    checks: [{ id: "noop", cmd: "true" }],
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
      playbook: PLAYBOOK,
      generated_at: "2026-05-20T00:00:00Z",
      converge_version: "0.1.0",
      frontier_count: 0,
    },
    nodes: { "task-a": nodeA, "task-b": nodeB },
    child_map: { "task-a": ["task-b"], "task-b": [] },
    parent_map: { "task-a": [], "task-b": ["task-a"] },
  };
}

/** Build a DagNode whose taskDef has the same outputs/checks/inputs as a
 *  manifest node, so computeFingerprint reads from the on-disk TASK.md. */
function dagNodeForFingerprint(projectDir: string, id: string, taskPath: string, outputs: string[]): DagNode {
  return {
    id,
    type: "normal",
    parents: [],
    children: [],
    depends_on: [],
    depended_on_by: [],
    path: join(projectDir, taskPath),
    status: "pending",
    virtual: false,
    taskDef: {
      title: id,
      description: "",
      inputs: [],
      outputs,
      checks: [{ id: "noop", cmd: "true" }],
      tags: [],
    } as any,
  };
}

/** Drive the change-detection predicates used by run/index.ts:717-729. */
function decideCached(
  projectDir: string,
  node: DagNode,
  priorStatus: string,
  priorFingerprint: string | undefined,
  currentFingerprint: string,
): { cached: boolean; reason?: string } {
  if (priorStatus !== "pass") return { cached: false, reason: "no-prior-pass" };
  if (!priorFingerprint || priorFingerprint !== currentFingerprint) {
    return { cached: false, reason: "fingerprint-mismatch" };
  }
  const outputsExist = (node.taskDef.outputs ?? []).every((output: string) =>
    existsSync(join(projectDir, output)),
  );
  if (!outputsExist) return { cached: false, reason: "output-missing" };
  return { cached: true };
}

describe("RFC 0024 — cross-machine resume integration", () => {
  let projectDir: string;
  let machineAJournal: string;
  let machineBJournal: string;

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), "rfc-0024-int-"));
    machineAJournal = join(projectDir, ".converge", "journal", PLAYBOOK);
    machineBJournal = join(projectDir, ".converge", "journal", `${PLAYBOOK}-peer`);
    mkdirSync(machineAJournal, { recursive: true });
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it("end-to-end: machine A runs → commit inventory → machine B resumes with zero re-execution", async () => {
    // ── Machine A — full execution ─────────────────────────────────
    const manifest = makeManifest(projectDir);
    const managerA = new RunStateManager(machineAJournal, manifest, undefined, projectDir);

    // Compute and set fingerprints (the runner does this in
    // run/index.ts:697-703 before any markComplete fires).
    const fpA = computeFingerprint(
      dagNodeForFingerprint(projectDir, "task-a", "playbooks/" + PLAYBOOK + "/tasks/task-a/TASK.md", ["dist/a.txt"]),
    );
    const fpB = computeFingerprint(
      dagNodeForFingerprint(projectDir, "task-b", "playbooks/" + PLAYBOOK + "/tasks/task-b/TASK.md", ["dist/b.txt"]),
    );
    managerA.setNodeFingerprint("task-a", fpA);
    managerA.setNodeFingerprint("task-b", fpB);

    // Drive both tasks through running → pass. Each markComplete
    // mirrors a "done" row + fingerprint to the inventory.
    await managerA.markRunning("task-a");
    plant(join(projectDir, "dist/a.txt"), "produced by task-a");
    await managerA.markComplete("task-a", 100);

    await managerA.markRunning("task-b");
    plant(join(projectDir, "dist/b.txt"), "produced by task-b");
    await managerA.markComplete("task-b", 100);

    // Assert: inventory has the right shape.
    const aInventory = readRuntimeLedgerState(projectDir, PLAYBOOK);
    expect(aInventory.tasks.map((t) => t.id).sort()).toEqual(["task-a", "task-b"]);
    for (const row of aInventory.tasks) {
      expect(row.status).toBe("done");
      expect(row.fingerprint).toMatch(/^sha256:/);
      expect(row.completedAt).toBeTruthy();
    }

    // ── Repo transit — wipe the journal (gitignored) ───────────────
    rmSync(machineAJournal, { recursive: true, force: true });
    expect(existsSync(machineAJournal)).toBe(false);
    // Inventory + TASK.md + outputs all survive the transit.
    expect(existsSync(runtimeTasksPath(projectDir, PLAYBOOK))).toBe(true);
    expect(existsSync(join(projectDir, "dist/a.txt"))).toBe(true);
    expect(existsSync(join(projectDir, "dist/b.txt"))).toBe(true);

    // ── Machine B — fresh manager, no journal, just inventory ──────
    mkdirSync(machineBJournal, { recursive: true });
    const managerB = new RunStateManager(machineBJournal, manifest, undefined, projectDir);

    // The hydrate path must have populated prior-pass state.
    expect(managerB.hasInventoryHydratedPriorState()).toBe(true);

    // Now exercise the same change-detection predicates run/index.ts
    // applies on every run start.
    const snapshot = await managerB.getStateSnapshot();
    const cachedIds: string[] = [];
    const resetReasons: Record<string, string> = {};
    for (const node of [
      dagNodeForFingerprint(projectDir, "task-a", "playbooks/" + PLAYBOOK + "/tasks/task-a/TASK.md", ["dist/a.txt"]),
      dagNodeForFingerprint(projectDir, "task-b", "playbooks/" + PLAYBOOK + "/tasks/task-b/TASK.md", ["dist/b.txt"]),
    ]) {
      const prior = snapshot.results.find((r) => r.id === node.id);
      const fp = computeFingerprint(node);
      const decision = decideCached(projectDir, node, prior?.status ?? "pending", prior?.fingerprint, fp);
      if (decision.cached) cachedIds.push(node.id);
      else resetReasons[node.id] = decision.reason ?? "unknown";
    }

    // The whole point of the RFC: every task is cached on machine B.
    expect(cachedIds.sort()).toEqual(["task-a", "task-b"]);
    expect(resetReasons).toEqual({});
  });

  it("edited TASK.md cascades the affected node back to pending", async () => {
    const manifest = makeManifest(projectDir);
    const managerA = new RunStateManager(machineAJournal, manifest, undefined, projectDir);
    const taskAPath = "playbooks/" + PLAYBOOK + "/tasks/task-a/TASK.md";
    const dagA = dagNodeForFingerprint(projectDir, "task-a", taskAPath, ["dist/a.txt"]);
    const fpA = computeFingerprint(dagA);
    managerA.setNodeFingerprint("task-a", fpA);
    plant(join(projectDir, "dist/a.txt"), "produced by task-a");
    await managerA.markComplete("task-a", 100);

    // Transit.
    rmSync(machineAJournal, { recursive: true, force: true });

    // Machine B edits the TASK.md before running.
    appendFileSync(
      join(projectDir, taskAPath),
      "\n\n<!-- a code review tweak on the new machine -->\n",
    );

    mkdirSync(machineBJournal, { recursive: true });
    const managerB = new RunStateManager(machineBJournal, manifest, undefined, projectDir);

    const snapshot = await managerB.getStateSnapshot();
    const prior = snapshot.results.find((r) => r.id === "task-a");
    // Hydrate brought it to "pass" — but the fingerprint check at
    // run-start will catch the mutation.
    expect(prior?.status).toBe("pass");
    expect(prior?.fingerprint).toBe(fpA);

    const newFingerprint = computeFingerprint(dagA);
    expect(newFingerprint).not.toBe(fpA);
    const decision = decideCached(projectDir, dagA, prior!.status, prior!.fingerprint, newFingerprint);
    expect(decision.cached).toBe(false);
    expect(decision.reason).toBe("fingerprint-mismatch");
  });

  it("missing output forces the owning task to re-run", async () => {
    const manifest = makeManifest(projectDir);
    const managerA = new RunStateManager(machineAJournal, manifest, undefined, projectDir);
    const taskBPath = "playbooks/" + PLAYBOOK + "/tasks/task-b/TASK.md";
    const dagB = dagNodeForFingerprint(projectDir, "task-b", taskBPath, ["dist/b.txt"]);
    const fpB = computeFingerprint(dagB);
    managerA.setNodeFingerprint("task-b", fpB);
    plant(join(projectDir, "dist/b.txt"), "produced");
    await managerA.markComplete("task-b", 100);

    rmSync(machineAJournal, { recursive: true, force: true });
    // Machine B has the inventory but not the output file (forgot to commit).
    rmSync(join(projectDir, "dist/b.txt"));

    mkdirSync(machineBJournal, { recursive: true });
    const managerB = new RunStateManager(machineBJournal, manifest, undefined, projectDir);
    const snapshot = await managerB.getStateSnapshot();
    const prior = snapshot.results.find((r) => r.id === "task-b");
    const decision = decideCached(projectDir, dagB, prior!.status, prior!.fingerprint, fpB);
    expect(decision.cached).toBe(false);
    expect(decision.reason).toBe("output-missing");
  });

  it("legacy inventory rows (no fingerprint) force a fresh run", async () => {
    // The current state of /Users/minh/Documents/mezon-bot-ai: every
    // row is status:"todo" with no fingerprint. We must treat this as
    // "no prior signal" and run from scratch, not silently skip.
    const manifest = makeManifest(projectDir);
    // Hand-write a legacy inventory row.
    const ledgerPath = runtimeTasksPath(projectDir, PLAYBOOK);
    plant(
      ledgerPath,
      JSON.stringify({
        id: "task-a",
        taskPath: "playbooks/" + PLAYBOOK + "/tasks/task-a/TASK.md",
        goalId: "inventory",
        summary: "task-a",
        status: "todo",
        source: "static",
        playbook: PLAYBOOK,
        createdAt: "2026-05-18T00:00:00Z",
        updatedAt: "2026-05-18T00:00:00Z",
      }) + "\n",
    );
    mkdirSync(machineBJournal, { recursive: true });
    const managerB = new RunStateManager(machineBJournal, manifest, undefined, projectDir);
    expect(managerB.hasInventoryHydratedPriorState()).toBe(false);
    const snapshot = await managerB.getStateSnapshot();
    expect(snapshot.results.find((r) => r.id === "task-a")?.status).toBe("pending");
  });

  it("inventory survives a renamed task without throwing", async () => {
    // task-a got renamed to task-a-renamed in the playbook. Old row
    // is in inventory; new DAG doesn't have that id. The hydrate must
    // ignore it cleanly — no exception, no DAG pollution.
    const manifest = makeManifest(projectDir);
    const ledgerPath = runtimeTasksPath(projectDir, PLAYBOOK);
    plant(
      ledgerPath,
      JSON.stringify({
        id: "task-removed",
        taskPath: "playbooks/" + PLAYBOOK + "/tasks/task-removed/TASK.md",
        goalId: "inventory",
        summary: "task-removed",
        status: "done",
        source: "static",
        playbook: PLAYBOOK,
        fingerprint: "sha256:stale",
        createdAt: "2026-05-18T00:00:00Z",
        updatedAt: "2026-05-18T00:00:00Z",
      }) + "\n",
    );
    mkdirSync(machineBJournal, { recursive: true });
    expect(
      () => new RunStateManager(machineBJournal, manifest, undefined, projectDir),
    ).not.toThrow();
  });

  it("two-machine round-trip: every status transition is mirrored to inventory", async () => {
    // Locks the factory → inventory → journal model the user
    // articulated: the inventory must hold enough state on every
    // transition that a peer machine can reconstruct the journal
    // context with no surprise gaps.
    const manifest = makeManifest(projectDir);
    const managerA = new RunStateManager(machineAJournal, manifest, undefined, projectDir);

    const dagA = dagNodeForFingerprint(projectDir, "task-a", "playbooks/" + PLAYBOOK + "/tasks/task-a/TASK.md", ["dist/a.txt"]);
    managerA.setNodeFingerprint("task-a", computeFingerprint(dagA));

    // pending → running → pass: every transition writes inventory.
    await managerA.markRunning("task-a");
    let row = readRuntimeLedgerState(projectDir, PLAYBOOK).tasks.find((t) => t.id === "task-a");
    expect(row?.status).toBe("doing");

    plant(join(projectDir, "dist/a.txt"), "x");
    await managerA.markComplete("task-a", 1);
    row = readRuntimeLedgerState(projectDir, PLAYBOOK).tasks.find((t) => t.id === "task-a");
    expect(row?.status).toBe("done");
    expect(row?.fingerprint).toBeTruthy();

    // A subsequent failure on a different task lands as "blocked".
    await managerA.markFailed("task-b", "boom", 1);
    row = readRuntimeLedgerState(projectDir, PLAYBOOK).tasks.find((t) => t.id === "task-b");
    expect(row?.status).toBe("blocked");

    // Reset of failed task: "blocked" → "todo".
    await managerA.markPending("task-b");
    row = readRuntimeLedgerState(projectDir, PLAYBOOK).tasks.find((t) => t.id === "task-b");
    expect(row?.status).toBe("todo");
  });
});
