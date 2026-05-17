import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  isAllowedDataInTasks,
  isAllowedExecutableInTasks,
} from "../../src/task/playbook/layout.ts";

describe("isAllowedExecutableInTasks", () => {
  const tasksDir = "/pb/tasks";

  it("allows files inside tasks/<id>/scripts/", () => {
    expect(
      isAllowedExecutableInTasks(
        join(tasksDir, "build", "scripts", "deploy.sh"),
        tasksDir,
      ),
    ).toBe(true);
  });

  it("rejects legacy seed-style files", () => {
    expect(
      isAllowedExecutableInTasks(join(tasksDir, "scaffold", "seed.js"), tasksDir),
    ).toBe(false);
    expect(
      isAllowedExecutableInTasks(
        join(tasksDir, "build", "seeds", "fanout.seed.js"),
        tasksDir,
      ),
    ).toBe(false);
  });

  it("rejects legacy checks/ namespaces", () => {
    expect(
      isAllowedExecutableInTasks(
        join(tasksDir, "verify", "checks", "smoke.mjs"),
        tasksDir,
      ),
    ).toBe(false);
  });

  it("rejects sibling executables outside scripts/", () => {
    expect(
      isAllowedExecutableInTasks(
        join(tasksDir, "verify", "check-all-handlers.mjs"),
        tasksDir,
      ),
    ).toBe(false);
  });
});

describe("isAllowedDataInTasks", () => {
  let workspace: string;
  let tasksDir: string;

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), "converge-layout-data-"));
    tasksDir = join(workspace, "tasks");
    mkdirSync(tasksDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(workspace, { recursive: true, force: true });
  });

  it("allows .json data file alongside a sibling TASK.md", () => {
    const taskDir = join(tasksDir, "08-gen", "001-week-01");
    mkdirSync(taskDir, { recursive: true });
    writeFileSync(join(taskDir, "TASK.md"), "---\nid: w01\n---\nx", "utf-8");
    writeFileSync(join(taskDir, "requirements.json"), '{"x":1}', "utf-8");
    expect(
      isAllowedDataInTasks(join(taskDir, "requirements.json"), tasksDir),
    ).toBe(true);
  });

  it("rejects data files when no sibling TASK.md exists", () => {
    const taskDir = join(tasksDir, "stray");
    mkdirSync(taskDir, { recursive: true });
    writeFileSync(join(taskDir, "notes.json"), '{"x":1}', "utf-8");
    expect(
      isAllowedDataInTasks(join(taskDir, "notes.json"), tasksDir),
    ).toBe(false);
  });
});
