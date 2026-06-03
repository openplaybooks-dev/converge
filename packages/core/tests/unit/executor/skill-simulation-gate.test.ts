/**
 * Skill-task simulation gate (function-executor.ts).
 *
 * Before iter-9, `executeAsSkill` would silently fall through to
 * `simulateSkillExecution` — which writes literal placeholder text to
 * the declared output paths (e.g. `# title\nThis is a placeholder...`)
 * and then `validateOutputs` checks the file exists → reports success.
 * Production runs could therefore claim a skill task succeeded while
 * producing nothing real, poisoning downstream tasks that consumed the
 * placeholders as legitimate inputs.
 *
 * The gate fixes that: simulation must be explicitly opted into via
 * CONVERGE_ALLOW_SKILL_SIMULATION=1. Otherwise the call throws and the
 * executor returns success=false with a clear error message instructing
 * the operator to wire claudefn or opt into simulation.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { FunctionExecutor } from "../../../src/executor/function-executor.ts";
import type { TaskContext } from "../../../src/context/types.ts";
import type { TaskConfig } from "../../../src/storage/types.ts";

/* ------------------------------------------------------------------ */
/*  Minimal TaskContext stub                                           */
/*  Only the fields function-executor actually touches.                */
/* ------------------------------------------------------------------ */

function makeCtx(opts: {
  projectDir: string;
  taskId: string;
  config: TaskConfig;
}): TaskContext {
  const logs: Array<{ level: string; msg: string }> = [];
  const logger = {
    debug: (m: string) => logs.push({ level: "debug", msg: m }),
    info: (m: string) => logs.push({ level: "info", msg: m }),
    warn: (m: string) => logs.push({ level: "warn", msg: m }),
    error: (m: string) => logs.push({ level: "error", msg: m }),
    child(_p: string) {
      return logger;
    },
  };
  return {
    level: "task" as const,
    taskId: opts.taskId,
    epicId: "default",
    config: opts.config,
    projectDir: opts.projectDir,
    log: logger,
    // Unused by executeAsSkill — provide stubs so any accidental access
    // surfaces a clean error rather than `cannot read property of
    // undefined`.
    status: {} as never,
    project: {} as never,
    executionStack: [],
    check: {} as never,
    journal: {} as never,
    // Allow test inspection.
    __logs: logs,
  } as unknown as TaskContext & { __logs: typeof logs };
}

function plantSkillTask(
  projectDir: string,
  taskId: string,
): { taskFolder: string; outputs: string[] } {
  const taskFolder = join(projectDir, "tasks", taskId);
  mkdirSync(taskFolder, { recursive: true });
  writeFileSync(
    join(taskFolder, "SKILL.md"),
    "---\nid: " + taskId + "\n---\nbody\n",
    "utf-8",
  );
  return { taskFolder, outputs: [`build/${taskId}.txt`] };
}

describe("FunctionExecutor — skill-task simulation gate", () => {
  let projectDir: string;
  let homeDir: string;
  let savedHome: string | undefined;
  let savedAllow: string | undefined;

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), "converge-skillgate-"));
    homeDir = mkdtempSync(join(tmpdir(), "converge-home-"));
    savedHome = process.env.HOME;
    savedAllow = process.env.CONVERGE_ALLOW_SKILL_SIMULATION;
    // Redirect HOME so loadSkillToClaudeSkills doesn't pollute the real
    // ~/.claude/skills dir.
    process.env.HOME = homeDir;
    delete process.env.CONVERGE_ALLOW_SKILL_SIMULATION;
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
    rmSync(homeDir, { recursive: true, force: true });
    if (savedHome === undefined) delete process.env.HOME;
    else process.env.HOME = savedHome;
    if (savedAllow === undefined)
      delete process.env.CONVERGE_ALLOW_SKILL_SIMULATION;
    else process.env.CONVERGE_ALLOW_SKILL_SIMULATION = savedAllow;
  });

  it("refuses simulation by default — returns success=false with diagnostic", async () => {
    const taskId = "001-skill-test";
    const { taskFolder, outputs } = plantSkillTask(projectDir, taskId);

    const config: TaskConfig = {
      id: taskId,
      title: "Test Skill Task",
      type: "skill-task",
      outputs,
      metadata: {
        isSkillOnly: true,
        filePath: join(taskFolder, "TASK.md"),
      },
    } as unknown as TaskConfig;

    const ctx = makeCtx({ projectDir, taskId, config });
    const exec = new FunctionExecutor();
    const result = await exec.execute(ctx, config, {
      runChecks: false,
      maxRetries: 1,
    });

    expect(result.success).toBe(false);
    expect(result.message).toMatch(
      /placeholder simulator|CONVERGE_ALLOW_SKILL_SIMULATION/,
    );
    // No placeholder output should have been written.
    expect(existsSync(join(projectDir, outputs[0]))).toBe(false);
  });

  it("opt-in via CONVERGE_ALLOW_SKILL_SIMULATION=1 still runs the simulator", async () => {
    process.env.CONVERGE_ALLOW_SKILL_SIMULATION = "1";

    const taskId = "002-skill-allow";
    const { taskFolder, outputs } = plantSkillTask(projectDir, taskId);

    const config: TaskConfig = {
      id: taskId,
      title: "Allowed Skill Task",
      type: "skill-task",
      outputs,
      metadata: {
        isSkillOnly: true,
        filePath: join(taskFolder, "TASK.md"),
      },
    } as unknown as TaskConfig;

    const ctx = makeCtx({ projectDir, taskId, config });
    const exec = new FunctionExecutor();
    const result = await exec.execute(ctx, config, {
      runChecks: false,
      maxRetries: 1,
    });

    // Simulator ran → placeholder output file exists.
    expect(existsSync(join(projectDir, outputs[0]))).toBe(true);
    const placeholder = readFileSync(join(projectDir, outputs[0]), "utf-8");
    expect(placeholder).toContain("placeholder");
    // Warning surfaced in the log.
    const logs = (
      ctx as unknown as { __logs: Array<{ level: string; msg: string }> }
    ).__logs;
    expect(
      logs.some(
        (l) =>
          l.level === "warn" && /CONVERGE_ALLOW_SKILL_SIMULATION/.test(l.msg),
      ),
    ).toBe(true);
    // Simulator path is wired to return success=true (the whole point of
    // the gate is that this remains opt-in only).
    expect(result.success).toBe(true);
  });

  it("opt-in via CONVERGE_ALLOW_SKILL_SIMULATION=true is also accepted", async () => {
    process.env.CONVERGE_ALLOW_SKILL_SIMULATION = "true";

    const taskId = "003-skill-true";
    const { taskFolder, outputs } = plantSkillTask(projectDir, taskId);

    const config: TaskConfig = {
      id: taskId,
      title: "True-string Skill Task",
      type: "skill-task",
      outputs,
      metadata: {
        isSkillOnly: true,
        filePath: join(taskFolder, "TASK.md"),
      },
    } as unknown as TaskConfig;

    const ctx = makeCtx({ projectDir, taskId, config });
    const exec = new FunctionExecutor();
    const result = await exec.execute(ctx, config, {
      runChecks: false,
      maxRetries: 1,
    });

    expect(result.success).toBe(true);
    expect(existsSync(join(projectDir, outputs[0]))).toBe(true);
  });
});
