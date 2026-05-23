/**
 * RFC 0042: Task Body Environment Variable Injection
 *
 * TDD: Red tests first, then implement the fix.
 *
 * Tests that:
 * 1. buildTaskEnv() correctly sets CONVERGE_SPAWN_DIR from taskDir
 * 2. spawner body scripts receive CONVERGE_SPAWN_DIR via process.env inheritance
 */
import { describe, it, expect } from "vitest";
import { buildTaskEnv } from "../packages/core/src/run/task-env";

describe("RFC 0042: buildTaskEnv CONVERGE_SPAWN_DIR", () => {
  it("sets CONVERGE_SPAWN_DIR to taskDir/spawn when taskDir is provided", () => {
    const env = buildTaskEnv(process.env, {
      taskDir: "/project/.converge/journal/default/tasks/04-features/exec",
    });

    expect(env.CONVERGE_TASK_DIR).toBe("/project/.converge/journal/default/tasks/04-features/exec");
    expect(env.CONVERGE_SPAWN_DIR).toBe("/project/.converge/journal/default/tasks/04-features/exec/spawn");
  });

  it("sets CONVERGE_SPAWN_DIR to explicit spawnDir when provided", () => {
    const env = buildTaskEnv(process.env, {
      taskDir: "/project/.converge/journal/default/tasks/04-features/exec",
      spawnDir: "/custom/spawn/path",
    });

    expect(env.CONVERGE_SPAWN_DIR).toBe("/custom/spawn/path");
  });

  it("deletes CONVERGE_SPAWN_DIR when neither spawnDir nor taskDir provided", () => {
    const env = buildTaskEnv(process.env, {});

    expect(env.CONVERGE_SPAWN_DIR).toBeUndefined();
    expect(env.CONVERGE_TASK_DIR).toBeUndefined();
  });

  it("CONVERGE_SPAWN_DIR is under CONVERGE_TASK_DIR (not global .converge/spawn)", () => {
    const taskDir = "/project/.converge/journal/default/tasks/04-features/exec";
    const env = buildTaskEnv(process.env, { taskDir });

    expect(env.CONVERGE_SPAWN_DIR?.startsWith(taskDir)).toBe(true);
    expect(env.CONVERGE_SPAWN_DIR).toBe(taskDir + "/spawn");
  });
});