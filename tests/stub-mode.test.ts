/**
 * Stub Mode Integration Tests
 *
 * Tests that `converge compile` discovers stub: blocks from TASK.md
 * and that the stub config flows through to the compiled manifest.
 *
 * Full end-to-end `--stub` run testing requires CLI/cwd integration
 * that is validated manually; these tests verify the compile pipeline.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = resolve(__dirname, "..");
const CLI = resolve(REPO_ROOT, "packages/cli/dist/index.js");
const FIXTURE_DIR = resolve(REPO_ROOT, "tests/test-stub");
const JOURNAL_DIR = join(FIXTURE_DIR, ".converge/journal/stub-playbook");

function converge(args: string, cwd?: string): string {
  const parts = args.split(/\s+/).filter(Boolean);
  const result = spawnSync("node", [CLI, ...parts], {
    cwd: cwd ?? REPO_ROOT,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return (result.stdout || "") + (result.stderr || "");
}

function cleanupJournal(): void {
  if (existsSync(JOURNAL_DIR)) {
    rmSync(JOURNAL_DIR, { recursive: true, force: true });
  }
}

describe("stub mode compile integration", () => {
  beforeEach(() => {
    cleanupJournal();
  });

  afterEach(() => {
    cleanupJournal();
  });

  it("compile discovers the stub-task", () => {
    const out = converge(
      `compile --dir=${FIXTURE_DIR}/.converge/playbooks/stub-playbook --cwd=${FIXTURE_DIR}`,
    );
    expect(out).toContain("Compiled stub-playbook: 1 nodes");
    expect(out).toContain("manifest →");
  });

  it("compiled manifest contains stub config on the task", () => {
    converge(
      `compile --dir=${FIXTURE_DIR}/.converge/playbooks/stub-playbook --cwd=${FIXTURE_DIR}`,
    );

    expect(existsSync(join(JOURNAL_DIR, "manifest.json"))).toBe(true);
    const manifest = JSON.parse(
      readFileSync(join(JOURNAL_DIR, "manifest.json"), "utf-8"),
    );

    const stubTask = manifest.nodes["stub-task"];
    expect(stubTask).toBeDefined();
    expect(stubTask.stub).toEqual({
      cmd: 'echo "# Fake Report" > .converge/journal/stub-playbook/tasks/stub-task/wip/report.md',
      cleanup:
        "rm -f .converge/journal/stub-playbook/tasks/stub-task/wip/report.md",
    });
  });

  it("runstate has stub-task as pending", () => {
    converge(
      `compile --dir=${FIXTURE_DIR}/.converge/playbooks/stub-playbook --cwd=${FIXTURE_DIR}`,
    );

    expect(existsSync(join(JOURNAL_DIR, "runstate.json"))).toBe(true);
    const runstate = JSON.parse(
      readFileSync(join(JOURNAL_DIR, "runstate.json"), "utf-8"),
    );

    expect(runstate.dag.nodes["stub-task"]).toBeDefined();
    expect(runstate.dag.nodes["stub-task"].status).toBe("pending");
  });
});
