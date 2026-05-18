/**
 * Red — `converge list --select 'state:modified.<sub>' --state` not yet implemented.
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, copyFileSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

const REPO_ROOT = resolve(__dirname, "../../../..");
const CLI = resolve(REPO_ROOT, "packages/cli/dist/index.js");
const FIXTURE = resolve(__dirname, "../fixtures/minimal-playbook");

function readJson(p: string): Record<string, unknown> {
  return JSON.parse(readFileSync(p, "utf-8"));
}

let snapDir: string;
// Known-clean fixture content (tests expect TASK.md to start with #)
const origTaskMd = "# trivial-task\n";
const origPlaybookYml = `name: default
description: Minimal playbook for CLI smoke tests

tasks:
  - name: trivial-task
  - name: dependent-task
    depends_on:
      - trivial-task
  - name: unseeded-seed
`;

describe("state:modified.<sub>", () => {
  beforeAll(() => {
    if (!existsSync(CLI)) {
      throw new Error(
        `CLI build missing at ${CLI}. Run 'pnpm --filter @openplaybooks/converge-cli build' first.`,
      );
    }
  });

  beforeEach(() => {
    // Restore clean fixtures before each test
    writeFileSync(join(FIXTURE, "trivial-task", "TASK.md"), origTaskMd);
    writeFileSync(join(FIXTURE, "playbook.yml"), origPlaybookYml);
  });

  afterEach(() => {
    if (snapDir) {
      rmSync(snapDir, { recursive: true, force: true });
    }
    // Clean up target to avoid stale state between tests
    const targetDir = join(FIXTURE, "target");
    if (existsSync(targetDir)) {
      rmSync(targetDir, { recursive: true, force: true });
    }
    // Restore fixture files modified by tests
    writeFileSync(join(FIXTURE, "trivial-task", "TASK.md"), origTaskMd);
    writeFileSync(join(FIXTURE, "playbook.yml"), origPlaybookYml);
  });

  function compile() {
    execFileSync("node", [CLI, "compile", "--dir", FIXTURE], {
      cwd: REPO_ROOT,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  }

  function snapshot(): string {
    const dir = join(tmpdir(), `converge-state-snap-${randomUUID()}`);
    mkdirSync(dir, { recursive: true });
    copyFileSync(
      join(FIXTURE, "target", "manifest.json"),
      join(dir, "manifest.json"),
    );
    return dir;
  }

  function cli(args: string[]): { stdout: string; stderr: string } {
    const result = spawnSync("node", [CLI, ...args], {
      cwd: FIXTURE,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return {
      stdout: result.stdout || "",
      stderr: result.stderr || "",
    };
  }

  it("modified.body — editing body text flags the task", () => {
    compile();
    snapDir = snapshot();

    // Edit the body of trivial-task
    const taskPath = join(FIXTURE, "trivial-task", "TASK.md");
    const content = readFileSync(taskPath, "utf-8");
    writeFileSync(taskPath, content + "\nExtra line to change body hash.\n");
    compile();

    const { stdout } = cli([
      "list",
      "--select",
      "state:modified.body",
      "--state",
      snapDir,
    ]);
    expect(stdout).toContain("trivial-task");
  });

  it("modified.frontmatter — editing frontmatter flags the task", () => {
    compile();
    snapDir = snapshot();

    const taskPath = join(FIXTURE, "trivial-task", "TASK.md");
    const content = readFileSync(taskPath, "utf-8");
    writeFileSync(
      taskPath,
      content.replace(/^#/, "---\ntitle: changed\n---\n#"),
    );
    compile();

    const { stdout } = cli([
      "list",
      "--select",
      "state:modified.frontmatter",
      "--state",
      snapDir,
    ]);
    expect(stdout).toContain("trivial-task");
  });

  it("modified.checks — editing checks hash flags the task", () => {
    compile();
    snapDir = snapshot();

    const taskPath = join(FIXTURE, "trivial-task", "TASK.md");
    const content = readFileSync(taskPath, "utf-8");
    writeFileSync(
      taskPath,
      content.replace(/^#/, "---\nchecks:\n  - id: c1\n    cmd: echo ok\n---\n#"),
    );
    compile();

    const { stdout } = cli([
      "list",
      "--select",
      "state:modified.checks",
      "--state",
      snapDir,
    ]);
    expect(stdout).toContain("trivial-task");
  });

  it("modified.inputs — editing inputs hash flags the task", () => {
    compile();
    snapDir = snapshot();

    const taskPath = join(FIXTURE, "trivial-task", "TASK.md");
    const content = readFileSync(taskPath, "utf-8");
    writeFileSync(
      taskPath,
      content.replace(/^#/, "---\ninputs:\n  - data.csv\n---\n#"),
    );
    compile();

    const { stdout } = cli([
      "list",
      "--select",
      "state:modified.inputs",
      "--state",
      snapDir,
    ]);
    expect(stdout).toContain("trivial-task");
  });

  it("modified.upstream — editing a parent flags the dependent", () => {
    compile();
    snapDir = snapshot();

    // Edit trivial-task (parent of dependent-task)
    const taskPath = join(FIXTURE, "trivial-task", "TASK.md");
    const content = readFileSync(taskPath, "utf-8");
    writeFileSync(taskPath, content + "\nChanged upstream.\n");
    compile();

    const { stdout } = cli([
      "list",
      "--select",
      "state:modified.upstream",
      "--state",
      snapDir,
    ]);
    expect(stdout).toContain("dependent-task");
  });

  it("modified.playbook — editing playbook.yml flags all tasks", () => {
    compile();
    snapDir = snapshot();

    const playbookPath = join(FIXTURE, "playbook.yml");
    const content = readFileSync(playbookPath, "utf-8");
    writeFileSync(playbookPath, content + "\n# playbook edit\n");
    compile();

    const { stdout } = cli([
      "list",
      "--select",
      "state:modified.playbook",
      "--state",
      snapDir,
    ]);
    expect(stdout).toContain("trivial-task");
  });

  it("modified.drifted — editing on-disk without recompiling flags as drifted", () => {
    compile();
    snapDir = snapshot();

    // Edit TASK.md on disk without recompiling
    const taskPath = join(FIXTURE, "trivial-task", "TASK.md");
    const content = readFileSync(taskPath, "utf-8");
    writeFileSync(taskPath, content + "\nDrifted change.\n");

    const { stdout } = cli([
      "list",
      "--select",
      "state:modified.drifted",
      "--state",
      snapDir,
    ]);
    expect(stdout).toContain("trivial-task");
  });
});
