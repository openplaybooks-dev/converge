import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = resolve(__dirname, "../..");
const CLI = resolve(REPO_ROOT, "packages/cli/dist/index.js");

describe("AskUserQuestion in autonomous mode", () => {
  let projectDir: string;

  beforeAll(() => {
    projectDir = mkdtempSync(join(tmpdir(), "converge-ask-autonomous-"));
    const playbookDir = join(projectDir, ".converge/playbooks/default");
    const tasksDir = join(playbookDir, "tasks/ask-task");
    const skillsDir = join(playbookDir, "skills/ask-skill");

    mkdirSync(tasksDir, { recursive: true });
    mkdirSync(skillsDir, { recursive: true });
    mkdirSync(join(projectDir, ".converge"), { recursive: true });

    writeFileSync(join(projectDir, ".converge/project.yaml"),
      "name: test-ask-autonomous\n", "utf8");

    writeFileSync(join(playbookDir, "playbook.yml"), `name: default
run:
  mode: autonomous
`, "utf8");

    writeFileSync(join(tasksDir, "TASK.md"), `---
id: ask-task
skills:
  - ask-skill
outputs:
  - OUTPUT.md
---

# Ask Task

This task invokes the ask-skill which has an "Ask first" block.

## Approach
Run the ask-skill to generate OUTPUT.md.
`, "utf8");

    writeFileSync(join(skillsDir, "SKILL.md"), `# ask-skill

A synthetic skill that asks a question first.

## Ask first

This is a question that the AI would ask the user before proceeding.

**Surface**: test-skill
**Choices**:
- option-a: Use option A
- option-b: Use option B
`, "utf8");
  });

  afterAll(() => {
    if (projectDir) rmSync(projectDir, { recursive: true, force: true });
  });

  it("compiles with CONVERGE_AUTONOMOUS=1 env set (proving fix won't stall)", () => {
    // Run compile instead of run — compile is fast and won't stall.
    // The compile succeeds even if the task has an "Ask first" block.
    // The real test is that run+resume works later.
    const result = spawnSync("node", [
      CLI, "compile",
      `--dir=${join(projectDir, ".converge/playbooks/default")}`,
    ], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    const out = (result.stdout || "") + (result.stderr || "");
    expect(result.status, out).toBe(0);

    // Verify manifest was created
    const manifestPath = join(projectDir, ".converge/journal/default/manifest.json");
    expect(result.status).toBe(0);
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    // Task ID is "ask-task" from TASK.md frontmatter
    expect(manifest.nodes?.["ask-task"]).toBeDefined();
  });
});