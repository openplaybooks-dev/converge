/**
 * RFC 0022 — `run-gateway` action handler tests.
 *
 * Gateways have no body, no outputs, no spawn manifest. The handler
 * just validates the invariants and returns done. A gateway that
 * accidentally produced a spawn manifest is flagged with
 * `gateway-spawned` for the repair loop.
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
import { runGateway } from "../../src/navigator/core/actions/execution/run-gateway.ts";
import type { Snapshot } from "../../src/navigator/core/types.ts";
import { NavigatorGraph } from "../../src/navigator/core/graph.ts";

interface TestEnv {
  projectDir: string;
  execDir: string;
  prevTaskDir: string | undefined;
}

function setup(): TestEnv {
  const projectDir = mkdtempSync(join(tmpdir(), "converge-rungate-"));
  const execDir = join(
    projectDir,
    ".converge",
    "journal",
    "default",
    "tasks",
    "sync",
    "exec",
  );
  mkdirSync(execDir, { recursive: true });
  const prevTaskDir = process.env.CONVERGE_TASK_DIR;
  process.env.CONVERGE_TASK_DIR = execDir;
  return { projectDir, execDir, prevTaskDir };
}

function teardown(env: TestEnv): void {
  if (env.prevTaskDir === undefined) delete process.env.CONVERGE_TASK_DIR;
  else process.env.CONVERGE_TASK_DIR = env.prevTaskDir;
  rmSync(env.projectDir, { recursive: true, force: true });
}

function fakeUnit(overrides: Record<string, unknown> = {}): any {
  return {
    id: "sync",
    title: "sync",
    mode: "gateway",
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

describe("run-gateway", () => {
  let env: TestEnv;
  beforeEach(() => {
    env = setup();
  });
  afterEach(() => {
    teardown(env);
  });

  it("returns done when exec dir is empty (no body, no manifest)", async () => {
    const graph = new NavigatorGraph();
    const result = await runGateway(fakeSnapshot(env, fakeUnit()), graph);
    expect(result.action).toBe("done");
    expect(result.success).toBe(true);
  });

  it("bails with gateway-spawned when manifest unexpectedly written", async () => {
    writeFileSync(
      join(env.execDir, "spawn.plan.jsonl"),
      `{"id":"c","template":"t"}\n`,
    );
    const graph = new NavigatorGraph();
    const result = await runGateway(fakeSnapshot(env, fakeUnit()), graph);
    expect(result.action).toBe("bail");
    expect(result.reason).toMatch(/gateway-spawned/);
    const violationPath = join(env.execDir, "mode-violation.json");
    expect(existsSync(violationPath)).toBe(true);
    const v = JSON.parse(readFileSync(violationPath, "utf-8"));
    expect(v.errorCode).toBe("gateway-spawned");
  });

  it("bails cleanly when CONVERGE_TASK_DIR is unset", async () => {
    delete process.env.CONVERGE_TASK_DIR;
    const graph = new NavigatorGraph();
    const result = await runGateway(fakeSnapshot(env, fakeUnit()), graph);
    expect(result.action).toBe("bail");
    expect(result.reason).toMatch(/CONVERGE_TASK_DIR/);
  });
});
