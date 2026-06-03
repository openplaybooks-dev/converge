/**
 * RFC 0043: Spawn Directory Discovery Alignment
 *
 * Tests that CONVERGE_SPAWN_DIR is correctly set (per-task) when a spawner
 * body runs. The fixture registers an intentional empty fan-out (an empty
 * spawn.plan.jsonl) so the spawner converges in a single attempt — the
 * assertions read one captured run rather than re-running per `it`.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve, join } from "node:path";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";

const REPO_ROOT = resolve("/Users/minh/Documents/converge");
const CLI = resolve(REPO_ROOT, "packages/cli/dist/index.js");
const FIXTURE = join(REPO_ROOT, "tests/test-spawn-dir-alignment");

let runStdout = "";

beforeAll(() => {
  mkdirSync(join(FIXTURE, ".converge/playbooks/default/tasks/01-spawner"), {
    recursive: true,
  });

  writeFileSync(
    join(FIXTURE, ".converge/project.yaml"),
    "name: test-spawn-align\nversion: 1\n",
  );
  writeFileSync(
    join(FIXTURE, ".converge/playbooks/default/playbook.yml"),
    "name: default\n",
  );

  // Spawner whose body echoes the env vars and registers an empty fan-out
  // (writes an empty spawn.plan.jsonl under $CONVERGE_TASK_DIR) so the
  // spawner validates and converges instead of retrying forever.
  writeFileSync(
    join(FIXTURE, ".converge/playbooks/default/tasks/01-spawner/TASK.md"),
    `---
id: 01-spawner
title: Env Var Test
mode: spawner
passthrough: true
inputs: []
outputs:
  - dummy-output.txt
checks:
  - id: env-set
    cmd: echo "CONVERGE_SPAWN_DIR_SET=ok"
    description: Env vars are set
spawn:
  min_children: 0
---
# Body

\`\`\`bash
touch dummy-output.txt
echo "Body ran with CONVERGE_SPAWN_DIR=$CONVERGE_SPAWN_DIR"
echo "Body ran with CONVERGE_TASK_DIR=$CONVERGE_TASK_DIR"
: > "$CONVERGE_TASK_DIR/spawn.plan.jsonl"
\`\`\`
`,
  );

  const result = spawnSync("node", [CLI, "run", "--playbook=default"], {
    cwd: FIXTURE,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  runStdout = (result.stdout || "") + (result.stderr || "");
});

afterAll(() => {
  rmSync(FIXTURE, { recursive: true, force: true });
});

describe("RFC 0043: Spawn Directory Discovery Alignment", () => {
  it("CONVERGE_SPAWN_DIR is set when body runs", () => {
    expect(runStdout).toContain("Body ran with CONVERGE_SPAWN_DIR=");
    expect(runStdout).toContain("Body ran with CONVERGE_TASK_DIR=");
  });

  it("CONVERGE_SPAWN_DIR is per-task (contains task id)", () => {
    expect(runStdout).toContain("01-spawner/exec/spawn");
  });
});
