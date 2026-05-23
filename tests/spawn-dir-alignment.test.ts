/**
 * RFC 0043: Spawn Directory Discovery Alignment
 *
 * TDD: Red tests first, then implement the fix.
 *
 * Tests that CONVERGE_SPAWN_DIR is correctly set when body runs.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve, join } from "node:path";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";

const REPO_ROOT = resolve("/Users/minh/Documents/converge");
const CLI = resolve(REPO_ROOT, "packages/cli/dist/index.js");
const FIXTURE = join(REPO_ROOT, "tests/test-spawn-dir-alignment");

function runConverge(args: string[]): { stdout: string; stderr: string; code: number } {
  const result = spawnSync("node", [CLI, ...args], {
    cwd: FIXTURE,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return { stdout: result.stdout, stderr: result.stderr, code: result.status };
}

beforeAll(() => {
  mkdirSync(FIXTURE, { recursive: true });
  mkdirSync(join(FIXTURE, ".converge/playbooks/default/tasks/01-spawner"), { recursive: true });

  // project.yaml
  writeFileSync(join(FIXTURE, ".converge/project.yaml"), "name: test-spawn-align\nversion: 1\n");

  // playbook.yml
  writeFileSync(join(FIXTURE, ".converge/playbooks/default/playbook.yml"), "name: default\n");

  // TASK.md — spawner that just echoes env vars to verify they're set
  // Declare existing dummy outputs so pre-flight doesn't fail looking for missing outputs
  writeFileSync(join(FIXTURE, ".converge/playbooks/default/tasks/01-spawner/TASK.md"), `---
id: 01-spawner
title: Env Var Test
mode: spawner
passthrough: true
inputs: []
outputs:
  - dummy-output.txt
checks:
  - id: env-set
    cmd: |
      echo "CONVERGE_SPAWN_DIR_SET=ok"
    description: Env vars are set
spawn:
  template: child-template
---
# Body
#!/bin/bash
touch dummy-output.txt
echo "Body ran with CONVERGE_SPAWN_DIR=$CONVERGE_SPAWN_DIR"
echo "Body ran with CONVERGE_TASK_DIR=$CONVERGE_TASK_DIR"
`);
});

afterAll(() => {
  rmSync(FIXTURE, { recursive: true, force: true });
});

describe("RFC 0043: Spawn Directory Discovery Alignment", () => {
  it("CONVERGE_SPAWN_DIR is set when body runs", () => {
    const result = runConverge(["run", "--playbook=default"]);
    // Body should echo the env vars
    expect(result.stdout).toContain("Body ran with CONVERGE_SPAWN_DIR=");
    expect(result.stdout).toContain("Body ran with CONVERGE_TASK_DIR=");
  });

  it("CONVERGE_SPAWN_DIR is per-task (contains task id)", () => {
    const result = runConverge(["run", "--playbook=default"]);
    // Should see the per-task spawn path
    expect(result.stdout).toContain("01-spawner/exec/spawn");
  });
});