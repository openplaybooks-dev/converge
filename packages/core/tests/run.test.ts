/**
 * Smoke tests for the public programmatic surface added in
 * `packages/core/src/{run,playbook,plan}.ts`.
 *
 * These exercise the public API without spinning up a real LLM or
 * spawning the CLI. The runtime side of `run()` does substantial
 * filesystem work (journal, manifest, fingerprints) so we let it hit
 * a tmp dir and just assert on shape, not on every byte written.
 */

import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  captureReporter,
  consoleReporter,
  definePlaybook,
  loadPlaybookFromFolder,
  taskDef,
  writePlaybookToFolder,
} from "../src/index.js";
import type { Playbook, RunEvent } from "../src/index.js";
import { appendTaskUpsert } from "../src/task/goal/runtime-ledger.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "converge-run-test-"));
  // Minimal project layout so `run()` finds .converge/ to write under.
  await mkdir(join(tmpDir, ".converge"), { recursive: true });
});

afterEach(async () => {
  if (tmpDir) await rm(tmpDir, { recursive: true, force: true });
});

describe("definePlaybook", () => {
  it("produces a Playbook with task entries derived from dependencies", () => {
    const pb = definePlaybook({
      name: "linear",
      description: "linear chain",
      tasks: [
        taskDef().id("a").title("A").executor(async () => {}).build(),
        taskDef()
          .id("b")
          .title("B")
          .depends_on(["a"])
          .executor(async () => {})
          .build(),
        taskDef()
          .id("c")
          .title("C")
          .depends_on(["b"])
          .executor(async () => {})
          .build(),
      ],
    });

    expect(pb.def.name).toBe("linear");
    expect(pb.def.tasks.map((t) => t.id)).toEqual(["a", "b", "c"]);
    expect(pb.def.tasks[0].depends_on).toBeUndefined();
    expect(pb.def.tasks[1].depends_on).toEqual(["a"]);
    expect(pb.def.tasks[2].depends_on).toEqual(["b"]);

    expect(pb.tasks.size).toBe(3);
    expect(pb.tasks.get("a")?.title).toBe("A");
  });

  it("rejects tasks without an id", () => {
    expect(() =>
      definePlaybook({
        name: "broken",
        // @ts-expect-error: deliberately omit id to verify the runtime check
        tasks: [taskDef().title("no-id").executor(async () => {}).build()],
      }),
    ).toThrow(/id/);
  });
});

describe("writePlaybookToFolder + loadPlaybookFromFolder round-trip", () => {
  it("serializes a code-defined Playbook and parses it back", async () => {
    const pb = definePlaybook({
      name: "round-trip",
      description: "writes and reads",
      run: { mode: "oneoff", maxTaskAttempts: 2, workers: 3 },
      tasks: [
        taskDef()
          .id("a")
          .title("First task")
          .description("does the thing")
          .prompt("Do A.")
          .outputs(["out/a.md"])
          .build(),
        taskDef()
          .id("b")
          .title("Second task")
          .depends_on(["a"])
          .prompt("Do B after A.")
          .outputs(["out/b.md"])
          .build(),
      ],
    });

    const target = join(tmpDir, ".converge", "playbooks", "round-trip");
    await writePlaybookToFolder(pb, target);

    expect(existsSync(join(target, "playbook.yml"))).toBe(true);
    expect(existsSync(join(target, "tasks", "a", "TASK.md"))).toBe(true);
    expect(existsSync(join(target, "tasks", "b", "TASK.md"))).toBe(true);

    const reloaded = await loadPlaybookFromFolder(target);
    expect(reloaded.def.name).toBe("round-trip");
    expect(reloaded.def.run?.mode).toBe("oneoff");
    expect(reloaded.def.run?.maxTaskAttempts).toBe(2);
    expect(reloaded.def.run?.workers).toBe(3);
    expect(reloaded.def.tasks.map((t) => t.id)).toEqual(["a", "b"]);
    expect(reloaded.def.tasks[0].depends_on).toBeUndefined();
    expect(reloaded.def.tasks[1].depends_on).toEqual(["a"]);
    expect(reloaded.dir).toBe(target);
  });
});

describe("run worker scheduling", () => {
  it("records worker leases when multiple ready tasks execute", async () => {
    const { run } = await import("../src/run/index.js");
    const pb = definePlaybook({
      name: "parallel-workers",
      run: { workers: 2, maxTaskAttempts: 1 },
      tasks: [
        taskDef()
          .id("a")
          .title("A")
          .executor(async () => {
            await new Promise((resolve) => setTimeout(resolve, 25));
          })
          .build(),
        taskDef()
          .id("b")
          .title("B")
          .executor(async () => {
            await new Promise((resolve) => setTimeout(resolve, 25));
          })
          .build(),
        taskDef()
          .id("c")
          .title("C")
          .depends_on(["a"])
          .executor(async () => {})
          .build(),
      ],
    });

    const result = await run(pb, {
      projectDir: tmpDir,
      workers: 2,
      reporter: captureReporter(),
    });

    expect(result.failed).toBe(0);

    const runstatePath = join(
      tmpDir,
      ".converge",
      "journal",
      "parallel-workers",
      "runstate.json",
    );
    const runstate = JSON.parse(readFileSync(runstatePath, "utf-8"));
    expect(runstate.dag.nodes.a.worker_id).toBe("local-1");
    expect(runstate.dag.nodes.b.worker_id).toBe("local-2");
    expect(runstate.dag.nodes.a.lease_id).toMatch(/^a-lease-/);
    expect(runstate.dag.nodes.b.lease_id).toMatch(/^b-lease-/);
    expect(runstate.dag.nodes.c.worker_id).toBeDefined();
  });
});

describe("consoleReporter / captureReporter", () => {
  it("captureReporter accumulates events", () => {
    const cap = captureReporter();
    cap.emit({ kind: "compile-start" });
    cap.emit({
      kind: "compile-complete",
      nodeCount: 3,
      cachedCount: 0,
    });
    expect(cap.events).toHaveLength(2);
    expect(cap.events[0].kind).toBe("compile-start");
  });

  it("consoleReporter does not throw on any event kind", () => {
    const reporter = consoleReporter();
    const all: RunEvent[] = [
      { kind: "run-start", playbook: "x", runId: "y", projectDir: "/tmp" },
      { kind: "compile-start" },
      { kind: "compile-complete", nodeCount: 1, cachedCount: 0 },
      { kind: "compile-error", errors: [{ type: "x", message: "y" }] },
      { kind: "task-start", taskId: "a", attempt: 1 },
      { kind: "task-cached", taskId: "a" },
      { kind: "task-skipped", taskId: "a", reason: "no body" },
      { kind: "task-complete", taskId: "a", durationMs: 12 },
      { kind: "task-failed", taskId: "a", error: "boom", durationMs: 12 },
      {
        kind: "children-spawned",
        parentId: "p",
        children: [{ id: "c1" }],
      },
      { kind: "log", level: "info", message: "hello" },
      {
        kind: "run-complete",
        completed: 1,
        failed: 0,
        durationMs: 100,
      },
      { kind: "run-aborted", reason: "abort" },
    ];
    expect(() => {
      for (const e of all) reporter.emit(e);
    }).not.toThrow();
  });
});

describe("RFC 0025 — resume + inventory hydrate must still reconcile", () => {
  // Regression for commit 46acaa701. The original RFC 0025 gate at
  // run/index.ts was `if (!opts.resume)`,
  // which meant any playbook with `run.resume: true` in playbook.yml
  // (the common case for long-running playbooks) bypassed the entire
  // change-detection block. Inventory-hydrated nodes never got their
  // fingerprints validated against the live TASK.md, never got their
  // declared outputs checked against disk, and the "reconciled (<pb>):
  // N cached · ..." summary line never printed.
  //
  // The fix: extend the gate to also run when the manager hydrated
  // prior-pass nodes from inventory:
  //   if (!opts.resume || needsHydratedReconcile)
  //
  // This test exercises `run()` end-to-end with resume:true and a
  // pre-populated inventory, then asserts the reconcile summary fires
  // in the captured reporter events. Without the fix, the summary is
  // silent and the test fails.

  it("emits the reconcile summary under resume:true when inventory hydrate populates state", async () => {
    const { run } = await import("../src/run/index.js");

    const pb = definePlaybook({
      name: "resume-recon",
      run: { resume: true, maxTaskAttempts: 1 },
      tasks: [
        taskDef()
          .id("task-a")
          .title("A")
          .executor(async () => {
            await new Promise((resolve) => setTimeout(resolve, 10));
          })
          .build(),
      ],
    });

    // Pre-seed the inventory with a "done" row for task-a so the
    // manager hydrates it on construction. The fingerprint is stale
    // by design — the test asserts the reconcile summary surfaces it.
    appendTaskUpsert(tmpDir, "resume-recon", {
      id: "task-a",
      taskPath: "tasks/task-a/TASK.md",
      goalId: "inventory",
      summary: "task-a",
      status: "done",
      source: "static",
      playbook: "resume-recon",
      fingerprint: "sha256:stale-from-an-old-run",
      completedAt: "2026-05-18T09:00:00Z",
    });

    const reporter = captureReporter();
    const result = await run(pb, {
      projectDir: tmpDir,
      reporter,
      // The CLI surfaces playbook.def.run.resume → opts.resume at
      // main.ts:1074. The bug was specifically the resume:true path
      // skipping the change-detection block entirely. Set explicitly
      // here so the test exercises that gate.
      resume: true,
    });

    // The reconcile summary line is the observable signature of the
    // hydrate-validate path running at all. Without the resume-fix
    // gate (commit 46acaa701), this event is silent under resume:true.
    const reconcileLogs = reporter.events.filter(
      (e: any) =>
        e.kind === "log" &&
        typeof e.message === "string" &&
        e.message.startsWith("reconciled (resume-recon):"),
    );
    expect(reconcileLogs.length).toBe(1);
    // The summary line carries the four bucket counts.
    const msg = (reconcileLogs[0] as any).message as string;
    expect(msg).toMatch(/\d+ cached/);
    expect(msg).toMatch(/\d+ reset \(TASK\.md changed\)/);
    expect(msg).toMatch(/\d+ reset \(output missing\)/);
    expect(msg).toMatch(/\d+ new/);

    // The run completes — the stale-fingerprint task gets re-run,
    // which is correct behaviour the fix unlocked.
    expect(result.failed).toBe(0);
  });
});
