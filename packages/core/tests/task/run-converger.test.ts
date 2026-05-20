/**
 * RFC 0022 — `run-converger` action handler tests.
 *
 * Scope: the converger's wave-loop decision logic *after* the body has
 * produced its artifacts. We pre-place halt signals (halt.marker, etc.)
 * in the exec dir to simulate body behaviour, then assert the handler
 * routes the right outcome through `runConvergerWave` and bumps the
 * wave counter when continuing.
 *
 * As with the spawner tests, units have no skill so the inline body
 * branch is skipped — the focus is the halt-decision path.
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
import { runConverger } from "../../src/navigator/core/actions/execution/run-converger.ts";
import type { Snapshot } from "../../src/navigator/core/types.ts";
import { NavigatorGraph } from "../../src/navigator/core/graph.ts";

interface TestEnv {
  projectDir: string;
  execDir: string;
  prevTaskDir: string | undefined;
  prevPlaybook: string | undefined;
}

function setup(): TestEnv {
  const projectDir = mkdtempSync(join(tmpdir(), "converge-runconverger-"));
  const playbook = "default";
  const execDir = join(
    projectDir,
    ".converge",
    "journal",
    playbook,
    "tasks",
    "loop",
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

function fakeUnit(overrides: Record<string, unknown> = {}): any {
  return {
    id: "loop",
    title: "loop",
    mode: "converger",
    modeConverge: {
      max_waves: 3,
      halt_when: [{ id: "done", cmd: "true" }],
    },
    outputs: [],
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

describe("run-converger — halt.marker", () => {
  let env: TestEnv;
  beforeEach(() => {
    env = setup();
  });
  afterEach(() => {
    teardown(env);
  });

  it("returns done with success when halt.marker exists", async () => {
    writeFileSync(join(env.execDir, "halt.marker"), "done");
    const graph = new NavigatorGraph();
    const result = await runConverger(fakeSnapshot(env, fakeUnit()), graph);
    expect(result.action).toBe("done");
    expect(result.success).toBe(true);
    expect(result.reason).toMatch(/halt-marker/);
  });
});

describe("run-converger — wave continuation", () => {
  let env: TestEnv;
  beforeEach(() => {
    env = setup();
  });
  afterEach(() => {
    teardown(env);
  });

  it("bumps wave counter and returns continue when no halt signal fires", async () => {
    const unit = fakeUnit({
      modeConverge: {
        max_waves: 5,
        // wave_check that exits 1 → continue
        wave_check: { id: "check", cmd: "exit 1" },
      },
    });

    const graph = new NavigatorGraph();
    const result = await runConverger(fakeSnapshot(env, unit), graph);

    expect(result.action).toBe("continue");
    // Wave counter persisted at 2 for the next invocation.
    const counter = readFileSync(
      join(env.execDir, "wave.counter"),
      "utf-8",
    ).trim();
    expect(counter).toBe("2");
  });
});

describe("run-converger — max waves exceeded", () => {
  let env: TestEnv;
  beforeEach(() => {
    env = setup();
  });
  afterEach(() => {
    teardown(env);
  });

  it("bails with converger-max-waves when counter > max_waves", async () => {
    // Pre-seed the wave counter past max_waves to simulate many prior
    // continues.
    writeFileSync(join(env.execDir, "wave.counter"), "5\n");
    const unit = fakeUnit({
      modeConverge: {
        max_waves: 3,
        wave_check: { id: "check", cmd: "exit 1" },
      },
    });

    const graph = new NavigatorGraph();
    const result = await runConverger(fakeSnapshot(env, unit), graph);

    expect(result.action).toBe("bail");
    expect(result.success).toBe(false);
    const violationPath = join(env.execDir, "mode-violation.json");
    expect(existsSync(violationPath)).toBe(true);
    const violation = JSON.parse(readFileSync(violationPath, "utf-8"));
    expect(violation.errorCode).toBe("converger-max-waves");
  });
});
