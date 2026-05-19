/**
 * RFC 0022 — `run-spawner` action handler tests.
 *
 * Scope: the spawner's apply + validate + halt decision *after* the body
 * has produced its artifacts. We pre-place `spawn.plan.jsonl` in the
 * exec dir to simulate a body that already wrote it, then assert the
 * handler ingests it via `applyManifest`, runs `validatePostBody`, and
 * returns the right action.
 *
 * The body-execution branch (which calls `runSkill` inline) is covered
 * by existing skill tests; here we use units without a skill so that
 * branch is skipped — the focus is the post-body lifecycle.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  rmSync,
  mkdirSync,
  writeFileSync,
  existsSync,
  readFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runSpawner } from "../../src/navigator/core/actions/execution/run-spawner.ts";
import type { Snapshot } from "../../src/navigator/core/types.ts";
import { NavigatorGraph } from "../../src/navigator/core/graph.ts";

interface TestEnv {
  projectDir: string;
  execDir: string;
  prevTaskDir: string | undefined;
  prevPlaybook: string | undefined;
}

function setup(): TestEnv {
  const projectDir = mkdtempSync(join(tmpdir(), "converge-runspawner-"));
  const playbook = "default";
  const execDir = join(
    projectDir,
    ".converge",
    "journal",
    playbook,
    "tasks",
    "parent",
    "exec",
  );
  mkdirSync(execDir, { recursive: true });
  const prevTaskDir = process.env.CONVERGE_TASK_DIR;
  const prevPlaybook = process.env.CONVERGE_PLAYBOOK;
  process.env.CONVERGE_TASK_DIR = execDir;
  process.env.CONVERGE_PLAYBOOK = playbook;
  return { projectDir, execDir, prevTaskDir, prevPlaybook };
}

function teardown(env: TestEnv): void {
  if (env.prevTaskDir === undefined) delete process.env.CONVERGE_TASK_DIR;
  else process.env.CONVERGE_TASK_DIR = env.prevTaskDir;
  if (env.prevPlaybook === undefined) delete process.env.CONVERGE_PLAYBOOK;
  else process.env.CONVERGE_PLAYBOOK = env.prevPlaybook;
  rmSync(env.projectDir, { recursive: true, force: true });
}

// Minimal fake unit: only the fields run-spawner actually reads. The
// real Unit class has filesystem + parent-chain semantics that aren't
// needed here.
function fakeUnit(overrides: Record<string, unknown> = {}): any {
  return {
    id: "parent",
    title: "parent",
    mode: "spawner",
    spawn: { min_children: 0, max_children: 10, apply: "auto" },
    outputs: [],
    // No skill → resolveSkill returns undefined → body branch skipped.
    skill: undefined,
    vars: {},
    ...overrides,
  };
}

function fakeSnapshot(env: TestEnv, unit: any): Snapshot {
  return {
    unit,
    gaps: [],
    iteration: 1,
    previousGaps: [],
    stallCount: 0,
    executionCount: 0,
    projectDir: env.projectDir,
    epicId: "default",
  };
}

describe("run-spawner — happy path", () => {
  let env: TestEnv;
  beforeEach(() => {
    env = setup();
  });
  afterEach(() => {
    teardown(env);
  });

  it("returns done after manifest applies cleanly", async () => {
    // A manifest with zero rows is valid for `min_children: 0` (intentional
    // no-op spawner). This avoids needing a real child TASK.md template
    // for this test to drive the apply→validate path.
    writeFileSync(join(env.execDir, "spawn.plan.jsonl"), "");

    const graph = new NavigatorGraph();
    const result = await runSpawner(fakeSnapshot(env, fakeUnit()), graph);

    expect(result.action).toBe("done");
    expect(result.success).toBe(true);
  });
});

describe("run-spawner — missing manifest", () => {
  let env: TestEnv;
  beforeEach(() => {
    env = setup();
  });
  afterEach(() => {
    teardown(env);
  });

  it("bails with spawner-missing-manifest when body wrote nothing", async () => {
    // Spawner with min_children > 0 + no manifest → validator violation.
    const unit = fakeUnit({
      spawn: { min_children: 1, max_children: 10, apply: "auto" },
    });

    const graph = new NavigatorGraph();
    const result = await runSpawner(fakeSnapshot(env, unit), graph);

    expect(result.action).toBe("bail");
    expect(result.success).toBe(false);
    expect(result.reason).toMatch(/spawner-missing-manifest/);

    // Mode-violation evidence file written for the repair loop.
    const violationPath = join(env.execDir, "mode-violation.json");
    expect(existsSync(violationPath)).toBe(true);
    const violation = JSON.parse(readFileSync(violationPath, "utf-8"));
    expect(violation.errorCode).toBe("spawner-missing-manifest");
    expect(violation.declaredMode).toBe("spawner");
  });
});

describe("run-spawner — no exec dir", () => {
  let env: TestEnv;
  beforeEach(() => {
    env = setup();
  });
  afterEach(() => {
    teardown(env);
  });

  it("bails cleanly when CONVERGE_TASK_DIR is unset", async () => {
    delete process.env.CONVERGE_TASK_DIR;

    const graph = new NavigatorGraph();
    const result = await runSpawner(fakeSnapshot(env, fakeUnit()), graph);

    expect(result.action).toBe("bail");
    expect(result.reason).toMatch(/CONVERGE_TASK_DIR/);
  });
});
