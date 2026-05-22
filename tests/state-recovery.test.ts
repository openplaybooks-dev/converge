/**
 * State Recovery Integration Tests (TDD)
 *
 * Simulates real-world playbook state corruption scenarios and verifies
 * that `converge reconcile` systematically repairs each one, leaving the
 * playbook ready for `converge run --resume`.
 *
 * Scenarios tested:
 *   1. Zombie runstate — 0 DAG nodes, status "running"
 *   2. Stale inventory — tasks marked "done" but outputs missing on disk
 *   3. Null depends_on — broken arrays causing "not iterable" crash
 *   4. Outputs exist but tasks not cached — reconcile marks as pass
 *   5. Missing journal task dirs — reconcile creates them with evidence
 *   6. Complete state corruption — garbage JSON, reconcile rebuilds from scratch
 *   7. Mixed static + spawned tasks — both handled correctly
 *   8. run --resume after reconcile — skips cached, runs pending
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  readdirSync,
} from "node:fs";
import { mkdir, rm } from "node:fs/promises";

// Import reconcile internals for direct testing (avoid CLI parsing overhead)
import {
  reconcileCommand,
  type ReconcileResult,
} from "../packages/cli/src/commands-reconcile.ts";

const FIXTURE_ROOT = join(tmpdir(), "converge-state-recovery");

/**
 * Helper: create a minimal playbook fixture with N tasks.
 * Each task gets a TASK.md with id, outputs, and checks.
 */
async function createPlaybookFixture(
  testDir: string,
  playbookName: string,
  tasks: Array<{
    id: string;
    title: string;
    outputs: string[];
    depends_on?: string[];
    hasOutputsOnDisk?: boolean;
  }>,
): Promise<string> {
  const playbookDir = join(
    testDir,
    ".converge",
    "playbooks",
    playbookName,
  );
  mkdirSync(playbookDir, { recursive: true });

  // playbook.yml
  writeFileSync(
    join(playbookDir, "playbook.yml"),
    `name: ${playbookName}\ntasks:\n${tasks.map((t) => `  - ${t.id}`).join("\n")}`,
  );

  // tasks/**/TASK.md
  for (const task of tasks) {
    const taskDir = join(playbookDir, "tasks", task.id);
    mkdirSync(taskDir, { recursive: true });

    const taskContent = `---
id: ${task.id}
title: ${task.title}
description: Test task ${task.id}
outputs:
${task.outputs.map((o) => `  - ${o}`).join("\n")}
checks:
  - id: output-exists
    cmd: test -f ${task.outputs[0] || "/dev/null"}
depends_on:
${(task.depends_on || []).map((d) => `  - ${d}`).join("\n")}
---

# ${task.title}

Task body for ${task.id}.
`;
    writeFileSync(join(taskDir, "TASK.md"), taskContent);

    // Optionally create output files on disk
    if (task.hasOutputsOnDisk !== false) {
      for (const output of task.outputs) {
        const outPath = join(testDir, output);
        if (!existsSync(dirname(outPath))) {
          mkdirSync(dirname(outPath), { recursive: true });
        }
        writeFileSync(outPath, `output for ${task.id}: ${output}`);
      }
    }
  }

  return playbookDir;
}

/**
 * Helper: create broken runstate.json scenarios
 */
function createBrokenRunstate(
  testDir: string,
  playbookName: string,
  scenario: string,
): string {
  const journalDir = join(
    testDir,
    ".converge",
    "journal",
    playbookName,
  );
  mkdirSync(journalDir, { recursive: true });

  const rsPath = join(journalDir, "runstate.json");

  const scenarios: Record<string, string> = {
    zombie: JSON.stringify(
      {
        metadata: {
          status: "running",
          playbook: playbookName,
          generated_at: "2026-01-01T00:00:00Z",
        },
        dag: { nodes: {} },
      },
      null,
      2,
    ),
    null_depends_on: JSON.stringify(
      {
        metadata: {
          status: "running",
          playbook: playbookName,
          generated_at: "2026-01-01T00:00:00Z",
        },
        dag: {
          nodes: {
            "task-01": {
              id: "task-01",
              status: "pass",
              depends_on: null,
              depended_on_by: null,
            },
            "task-02": {
              id: "task-02",
              status: "pending",
              depends_on: ["task-01"],
              depended_on_by: [],
            },
          },
        },
      },
      null,
      2,
    ),
    garbage_json: "THIS IS NOT JSON {{{ broken }}}",
    stale_running: JSON.stringify(
      {
        metadata: {
          status: "running",
          playbook: playbookName,
          generated_at: "2026-01-01T00:00:00Z",
        },
        dag: {
          nodes: {
            "task-01": {
              id: "task-01",
              status: "pass",
              depends_on: [],
              depended_on_by: [],
            },
            "task-02": {
              id: "task-02",
              status: "running",
              depends_on: ["task-01"],
              depended_on_by: [],
            },
          },
        },
      },
      null,
      2,
    ),
  };

  writeFileSync(rsPath, scenarios[scenario] || scenarios["zombie"]);
  return rsPath;
}

/**
 * Helper: create broken inventory (legacy format, stale entries)
 */
function createBrokenInventory(
  testDir: string,
  playbookName: string,
  scenario: string,
): string {
  const invDir = join(
    testDir,
    ".converge",
    "inventory",
    playbookName,
  );
  mkdirSync(invDir, { recursive: true });

  const invPath = join(invDir, "tasks.jsonl");

  const scenarios: Record<string, string> = {
    legacy_no_kind: [
      JSON.stringify({
        id: "task-01",
        status: "done",
        source: "static",
        outputs: ["output-01.txt"],
        playbook: playbookName,
      }),
      JSON.stringify({
        id: "task-02",
        status: "done",
        source: "static",
        outputs: ["output-02.txt"],
        playbook: playbookName,
      }),
    ].join("\n"),
    stale_done_missing_outputs: [
      JSON.stringify({
        id: "task-01",
        status: "done",
        source: "static",
        outputs: ["output-01.txt"],
        playbook: playbookName,
      }),
      JSON.stringify({
        id: "task-02",
        status: "done",
        source: "static",
        outputs: ["does-not-exist.txt", "also-missing.txt"],
        playbook: playbookName,
      }),
    ].join("\n"),
    empty_file: "",
  };

  writeFileSync(invPath, scenarios[scenario] || "");
  return invPath;
}

describe("State Recovery — Scenario 1: Zombie Runstate", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(FIXTURE_ROOT, "zombie-" + Date.now());
    mkdirSync(testDir, { recursive: true });

    await createPlaybookFixture(testDir, "test-pb", [
      { id: "task-01", title: "Task 1", outputs: ["output-01.txt"], hasOutputsOnDisk: true },
      { id: "task-02", title: "Task 2", outputs: ["output-02.txt"], hasOutputsOnDisk: true },
    ]);

    createBrokenRunstate(testDir, "test-pb", "zombie");
    createBrokenInventory(testDir, "test-pb", "legacy_no_kind");
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("detects zombie runstate (0 DAG nodes, status running) and deletes it", async () => {
    const result = await reconcileCommand({
      dir: testDir,
      playbook: "test-pb",
    });

    expect(result.cleanedRunstate).toBe(true);
  });

  it("rebuilds runstate from source after cleaning zombie", async () => {
    const result = await reconcileCommand({
      dir: testDir,
      playbook: "test-pb",
    });

    // Should have discovered tasks from playbook
    expect(result.dagNodes).toBeGreaterThan(0);
    // Should have marked tasks with outputs as cached
    expect(result.cachedTasks.length).toBeGreaterThan(0);
    // Should have written runstate.json
    const rsPath = join(
      testDir,
      ".converge",
      "journal",
      "test-pb",
      "runstate.json",
    );
    expect(existsSync(rsPath)).toBe(true);

    const rs = JSON.parse(readFileSync(rsPath, "utf-8"));
    expect(rs.metadata.status).not.toBe("running");
    expect(rs.dag.nodes).toBeDefined();
    expect(Object.keys(rs.dag.nodes).length).toBeGreaterThan(0);
  });

  it("produces a runstate with no null arrays (fixes depends_on / depended_on_by)", async () => {
    await reconcileCommand({
      dir: testDir,
      playbook: "test-pb",
    });

    const rsPath = join(
      testDir,
      ".converge",
      "journal",
      "test-pb",
      "runstate.json",
    );
    const rs = JSON.parse(readFileSync(rsPath, "utf-8"));

    for (const [tid, node] of Object.entries(rs.dag.nodes)) {
      expect(
        Array.isArray((node as any).depends_on),
        `${tid} depends_on should be an array`,
      ).toBe(true);
      expect(
        Array.isArray((node as any).depended_on_by),
        `${tid} depended_on_by should be an array`,
      ).toBe(true);
    }
  });
});

describe("State Recovery — Scenario 2: Stale Inventory Entries", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(FIXTURE_ROOT, "stale-inv-" + Date.now());
    mkdirSync(testDir, { recursive: true });

    await createPlaybookFixture(testDir, "test-pb", [
      { id: "task-01", title: "Task 1", outputs: ["output-01.txt"], hasOutputsOnDisk: true },
      { id: "task-02", title: "Task 2", outputs: ["output-02.txt"], hasOutputsOnDisk: false },
    ]);

    createBrokenInventory(testDir, "test-pb", "stale_done_missing_outputs");
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("removes inventory entries whose outputs are missing on disk", async () => {
    const result = await reconcileCommand({
      dir: testDir,
      playbook: "test-pb",
    });

    // task-02 has outputs that don't exist on disk
    expect(result.cleanedInventory).toBeGreaterThan(0);

    // Verify the inventory file was updated
    const invPath = join(
      testDir,
      ".converge",
      "inventory",
      "test-pb",
      "tasks.jsonl",
    );
    const lines = readFileSync(invPath, "utf-8")
      .trim()
      .split("\n")
      .filter((l) => l.trim());

    // task-01 should be kept (outputs exist)
    const task01 = lines.find((l) => l.includes("task-01"));
    expect(task01).toBeDefined();

    // task-02 should be removed (outputs missing)
    const task02 = lines.find((l) => l.includes("task-02"));
    expect(task02).toBeUndefined();
  });
});

describe("State Recovery — Scenario 3: Null depends_on Arrays", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(FIXTURE_ROOT, "null-deps-" + Date.now());
    mkdirSync(testDir, { recursive: true });

    await createPlaybookFixture(testDir, "test-pb", [
      {
        id: "task-01",
        title: "Task 1",
        outputs: ["output-01.txt"],
        depends_on: [],
        hasOutputsOnDisk: true,
      },
      {
        id: "task-02",
        title: "Task 2",
        outputs: ["output-02.txt"],
        depends_on: ["task-01"],
        hasOutputsOnDisk: false,
      },
    ]);

    createBrokenRunstate(testDir, "test-pb", "null_depends_on");
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("rebuilds runstate with proper depends_on arrays for all nodes", async () => {
    const result = await reconcileCommand({
      dir: testDir,
      playbook: "test-pb",
    });

    expect(result.dagNodes).toBeGreaterThan(0);

    const rsPath = join(
      testDir,
      ".converge",
      "journal",
      "test-pb",
      "runstate.json",
    );
    const rs = JSON.parse(readFileSync(rsPath, "utf-8"));

    // Every node should have a valid depends_on array
    for (const [tid, node] of Object.entries(rs.dag.nodes)) {
      const n = node as any;
      expect(
        Array.isArray(n.depends_on),
        `${tid} should have depends_on as array`,
      ).toBe(true);
    }
  });
});

describe("State Recovery — Scenario 4: Complete State Corruption", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(FIXTURE_ROOT, "corrupt-" + Date.now());
    mkdirSync(testDir, { recursive: true });

    await createPlaybookFixture(testDir, "test-pb", [
      { id: "task-01", title: "Task 1", outputs: ["output-01.txt"], hasOutputsOnDisk: true },
      { id: "task-02", title: "Task 2", outputs: ["output-02.txt"], hasOutputsOnDisk: true },
    ]);

    writeFileSync(
      join(testDir, ".converge", "journal", "test-pb", "runstate.json"),
      "THIS IS NOT JSON {{{ broken }}}",
      { recursive: true },
    );
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("detects corrupt runstate and rebuilds from source", async () => {
    const result = await reconcileCommand({
      dir: testDir,
      playbook: "test-pb",
    });

    // Should have cleaned the corrupt runstate
    expect(result.cleanedRunstate).toBe(true);
    // Should have rebuilt the DAG
    expect(result.dagNodes).toBeGreaterThan(0);
    // Should have a valid runstate.json after
    const rsPath = join(
      testDir,
      ".converge",
      "journal",
      "test-pb",
      "runstate.json",
    );
    expect(() => JSON.parse(readFileSync(rsPath, "utf-8"))).not.toThrow();
  });
});

describe("State Recovery — Scenario 5: Outputs Exist But Tasks Not Cached", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(FIXTURE_ROOT, "uncached-" + Date.now());
    mkdirSync(testDir, { recursive: true });

    // All tasks have outputs on disk
    await createPlaybookFixture(testDir, "test-pb", [
      { id: "task-01", title: "Task 1", outputs: ["output-01.txt"], hasOutputsOnDisk: true },
      { id: "task-02", title: "Task 2", outputs: ["output-02.txt"], hasOutputsOnDisk: true },
      { id: "task-03", title: "Task 3", outputs: ["output-03.txt"], hasOutputsOnDisk: true },
    ]);

    // No runstate — simulate fresh project with outputs already on disk
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("marks all tasks with outputs on disk as cached", async () => {
    const result = await reconcileCommand({
      dir: testDir,
      playbook: "test-pb",
    });

    expect(result.cachedTasks.length).toBe(3);
    expect(result.pendingTasks.length).toBe(0);
  });

  it("writes evidence files for each cached task", async () => {
    await reconcileCommand({
      dir: testDir,
      playbook: "test-pb",
    });

    for (const tid of ["task-01", "task-02", "task-03"]) {
      const evidencePath = join(
        testDir,
        ".converge",
        "journal",
        "test-pb",
        "tasks",
        tid,
        "exec",
        "evidence.json",
      );
      expect(existsSync(evidencePath), `Evidence for ${tid}`).toBe(true);

      const evidence = JSON.parse(readFileSync(evidencePath, "utf-8"));
      expect(evidence.status).toBe("pass");
      expect(evidence.taskId).toBe(tid);
    }
  });
});

describe("State Recovery — Scenario 6: Mixed Static + Spawned Tasks", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(FIXTURE_ROOT, "mixed-" + Date.now());
    mkdirSync(testDir, { recursive: true });

    // Static tasks
    await createPlaybookFixture(testDir, "test-pb", [
      { id: "task-01", title: "Static Task 1", outputs: ["output-01.txt"], hasOutputsOnDisk: true },
      { id: "task-02", title: "Static Task 2", outputs: ["output-02.txt"], hasOutputsOnDisk: false },
    ]);

    // Simulate spawned tasks in inventory
    const invDir = join(
      testDir,
      ".converge",
      "inventory",
      "test-pb",
    );
    mkdirSync(invDir, { recursive: true });

    const invLines = [
      JSON.stringify({
        id: "task-01",
        status: "done",
        source: "static",
        outputs: ["output-01.txt"],
        playbook: "test-pb",
      }),
      JSON.stringify({
        id: "spawned-screen-01",
        status: "todo",
        source: "spawned",
        parent: "task-02",
        outputs: ["spawned-output-01.txt"],
        playbook: "test-pb",
      }),
    ].join("\n");

    writeFileSync(join(invDir, "tasks.jsonl"), invLines);
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("handles static tasks from playbook discovery", async () => {
    const result = await reconcileCommand({
      dir: testDir,
      playbook: "test-pb",
    });

    // Should find static tasks from playbook
    expect(result.dagNodes).toBeGreaterThanOrEqual(2);
    // Should cache task-01 (outputs exist)
    expect(result.cachedTasks).toContain("task-01");
  });

  it("preserves spawned task inventory entries", async () => {
    const result = await reconcileCommand({
      dir: testDir,
      playbook: "test-pb",
    });

    // Inventory should still have the spawned task entry
    const invPath = join(
      testDir,
      ".converge",
      "inventory",
      "test-pb",
      "tasks.jsonl",
    );
    const lines = readFileSync(invPath, "utf-8")
      .trim()
      .split("\n")
      .filter((l) => l.trim());

    const spawnedEntry = lines.find((l) =>
      JSON.parse(l).source === "spawned",
    );
    expect(spawnedEntry).toBeDefined();
  });
});

describe("State Recovery — Scenario 7: run --resume After Reconcile", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(FIXTURE_ROOT, "resume-" + Date.now());
    mkdirSync(testDir, { recursive: true });

    // task-01 has outputs, task-02 does not
    await createPlaybookFixture(testDir, "test-pb", [
      { id: "task-01", title: "Task 1", outputs: ["output-01.txt"], hasOutputsOnDisk: true },
      { id: "task-02", title: "Task 2", outputs: ["output-02.txt"], hasOutputsOnDisk: false },
    ]);

    createBrokenRunstate(testDir, "test-pb", "zombie");
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("produces a runstate where task-01 is pass and task-02 is pending", async () => {
    await reconcileCommand({
      dir: testDir,
      playbook: "test-pb",
    });

    const rsPath = join(
      testDir,
      ".converge",
      "journal",
      "test-pb",
      "runstate.json",
    );
    const rs = JSON.parse(readFileSync(rsPath, "utf-8"));

    expect(rs.dag.nodes["task-01"].status).toBe("pass");
    expect(rs.dag.nodes["task-02"].status).toBe("pending");
  });

  it("marks the playbook as ready to resume (not running zombie)", async () => {
    await reconcileCommand({
      dir: testDir,
      playbook: "test-pb",
    });

    const rsPath = join(
      testDir,
      ".converge",
      "journal",
      "test-pb",
      "runstate.json",
    );
    const rs = JSON.parse(readFileSync(rsPath, "utf-8"));

    // Metadata should reflect correct state
    expect(rs.metadata.status).toBe("running"); // Has pending tasks
  });
});

describe("State Recovery — Scenario 8: Incremental Reconcile (Partial Outputs)", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(FIXTURE_ROOT, "partial-" + Date.now());
    mkdirSync(testDir, { recursive: true });

    // task-01 has all outputs, task-02 has partial outputs
    await createPlaybookFixture(testDir, "test-pb", [
      { id: "task-01", title: "Task 1", outputs: ["output-01a.txt", "output-01b.txt"], hasOutputsOnDisk: true },
      { id: "task-02", title: "Task 2", outputs: ["output-02a.txt", "output-02b.txt"], hasOutputsOnDisk: false },
    ]);

    // Create only one of task-02's outputs
    writeFileSync(join(testDir, "output-02a.txt"), "partial");

    createBrokenRunstate(testDir, "test-pb", "stale_running");
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("caches task-01 (all outputs exist) and leaves task-02 pending (partial outputs)", async () => {
    const result = await reconcileCommand({
      dir: testDir,
      playbook: "test-pb",
    });

    expect(result.cachedTasks).toContain("task-01");
    expect(result.pendingTasks).toContain("task-02");
  });

  it("updates runstate to reflect the correct status after incremental reconcile", async () => {
    await reconcileCommand({
      dir: testDir,
      playbook: "test-pb",
    });

    const rsPath = join(
      testDir,
      ".converge",
      "journal",
      "test-pb",
      "runstate.json",
    );
    const rs = JSON.parse(readFileSync(rsPath, "utf-8"));

    expect(rs.dag.nodes["task-01"].status).toBe("pass");
    expect(rs.dag.nodes["task-02"].status).toBe("pending");
  });
});
