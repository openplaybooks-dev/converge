/**
 * `converge playbook validate` — pre-flight structural check.
 *
 * Iter-25 separation:
 *   - doctor audits runtime state (gaps, stale sentinels, tripped circuits)
 *   - inspect explores execution traces
 *   - validate answers "is this playbook *definition* valid?" before any
 *     task runs — playbook.yml parses, all SKILL.md frontmatter parses,
 *     every tasks: entry has its TASK.md, every goal has id+description+checks
 *
 * Exit non-zero on any finding so the command works as a CI/precommit gate.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "../../..");
const CLI = resolve(REPO_ROOT, "packages/cli/dist/index.js");

function runValidate(workspace: string, args: string[]) {
  const r = spawnSync("node", [CLI, "playbook", "validate", ...args], {
    cwd: workspace,
    encoding: "utf-8",
    timeout: 30_000,
    env: { ...process.env, CONVERGE_WORKSPACE: workspace },
  });
  return {
    status: r.status ?? 1,
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? "",
  };
}

function plantPlaybook(workspace: string, name: string): string {
  const pbDir = join(workspace, ".converge/playbooks", name);
  mkdirSync(pbDir, { recursive: true });
  writeFileSync(
    join(pbDir, "playbook.yml"),
    [
      `name: ${name}`,
      "description: test fixture",
      "tasks:",
      "  - id: build",
      "goals:",
      "  - id: bootstrap",
      "    description: scaffold exists",
      "    checks:",
      "      - id: pkg-exists",
      "        cmd: test -f package.json",
      "",
    ].join("\n"),
    "utf-8",
  );
  // Plant a matching tasks/build/TASK.md so the missingTaskFiles check passes.
  mkdirSync(join(pbDir, "tasks", "build"), { recursive: true });
  writeFileSync(
    join(pbDir, "tasks", "build", "TASK.md"),
    "---\nid: build\ntitle: Build\n---\nbody\n",
    "utf-8",
  );
  return pbDir;
}

describe("converge playbook validate", () => {
  let workspace: string;
  const pb = "test-validate-pb";

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), "converge-pbvalidate-"));
    plantPlaybook(workspace, pb);
  });

  afterEach(() => {
    rmSync(workspace, { recursive: true, force: true });
  });

  it("clean playbook exits 0 with success line", () => {
    const r = runValidate(workspace, [pb]);
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/structurally valid/);
  });

  it("malformed SKILL.md surfaces as skillError and exits 1", () => {
    const brokenDir = join(
      workspace,
      ".converge/playbooks",
      pb,
      "skills/missing-fm",
    );
    mkdirSync(brokenDir, { recursive: true });
    writeFileSync(join(brokenDir, "SKILL.md"), "no frontmatter\n", "utf-8");

    const r = runValidate(workspace, [pb]);
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/malformed SKILL\.md/);
    expect(r.stdout).toContain("missing-fm");
    expect(r.stdout).toMatch(/missing YAML frontmatter block/);
  });

  it("missing tasks/<id>/TASK.md surfaces as missingTaskFile and exits 1", () => {
    // Add a tasks: entry to playbook.yml that has no matching directory.
    const pbYml = join(workspace, ".converge/playbooks", pb, "playbook.yml");
    const content = [
      `name: ${pb}`,
      "description: test fixture",
      "tasks:",
      "  - id: build",
      "  - id: ghost-task",
      "goals:",
      "  - id: bootstrap",
      "    description: scaffold exists",
      "    checks:",
      "      - id: pkg-exists",
      "        cmd: test -f package.json",
      "",
    ].join("\n");
    writeFileSync(pbYml, content, "utf-8");

    const r = runValidate(workspace, [pb]);
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/missing task file/);
    expect(r.stdout).toContain("ghost-task");
  });

  it("goal without checks surfaces as goalError and exits 1", () => {
    const pbYml = join(workspace, ".converge/playbooks", pb, "playbook.yml");
    writeFileSync(
      pbYml,
      [
        `name: ${pb}`,
        "description: test fixture",
        "tasks:",
        "  - id: build",
        "goals:",
        "  - id: empty-goal",
        "    description: goal with no checks",
        "",
      ].join("\n"),
      "utf-8",
    );

    const r = runValidate(workspace, [pb]);
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/goal error/);
    expect(r.stdout).toContain("empty-goal");
    expect(r.stdout).toMatch(/no checks/);
  });

  it("--json mode emits structured report with totalFindings", () => {
    const brokenDir = join(
      workspace,
      ".converge/playbooks",
      pb,
      "skills/json-broken",
    );
    mkdirSync(brokenDir, { recursive: true });
    writeFileSync(
      join(brokenDir, "SKILL.md"),
      "---\nname: json-broken\n---\nx\n",
      "utf-8",
    );

    const r = runValidate(workspace, [pb, "--json"]);
    expect(r.status).toBe(1);
    const jsonStart = r.stdout.indexOf("{");
    const parsed = JSON.parse(r.stdout.slice(jsonStart));
    expect(parsed.playbook).toBe(pb);
    expect(parsed.loaded).toBe(true);
    expect(parsed.totalFindings).toBe(1);
    expect(parsed.skillErrors).toHaveLength(1);
    expect(parsed.skillErrors[0].dir).toBe("json-broken");
    expect(parsed.skillErrors[0].reason).toMatch(/description/);
  });

  it("non-existent playbook exits non-zero with clear error", () => {
    const r = runValidate(workspace, ["does-not-exist"]);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/not found/);
  });

  it("surfaces run.mode deprecation as a warning (non-fatal, exit 0 when no findings)", () => {
    // Replace playbook.yml with one that has run.mode (deprecated).
    const pbYml = join(workspace, ".converge/playbooks", pb, "playbook.yml");
    writeFileSync(
      pbYml,
      [
        `name: ${pb}`,
        "description: test fixture with deprecated run.mode",
        "run:",
        "  mode: oneoff",
        "tasks:",
        "  - id: build",
        "goals:",
        "  - id: bootstrap",
        "    description: scaffold exists",
        "    checks:",
        "      - id: pkg-exists",
        "        cmd: test -f package.json",
        "",
      ].join("\n"),
      "utf-8",
    );

    const r = runValidate(workspace, [pb]);
    // No findings → exit 0; warning is non-fatal.
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/structurally valid/);
    expect(r.stdout).toMatch(/⚠.*1 warning/);
    expect(r.stdout).toContain("run.mode");
    expect(r.stdout).toMatch(/deprecated/);
  });

  it("deprecation warning fires only once even when validate parses twice", () => {
    // run.mode triggers a console.warn from the loader. Without iter-26's
    // process-scoped dedup, validate would print it twice (loadPlaybook
    // + validatePlaybook each parse the YAML). Confirm exactly one.
    const pbYml = join(workspace, ".converge/playbooks", pb, "playbook.yml");
    writeFileSync(
      pbYml,
      [
        `name: ${pb}`,
        "description: test fixture",
        "run:",
        "  mode: oneoff",
        "tasks:",
        "  - id: build",
        "goals:",
        "  - id: bootstrap",
        "    description: x",
        "    checks:",
        "      - id: pkg",
        "        cmd: true",
        "",
      ].join("\n"),
      "utf-8",
    );

    const r = runValidate(workspace, [pb]);
    // Count occurrences of the deprecation warning line across all
    // stderr+stdout (it's printed via console.warn → stderr by node).
    const combined = (r.stdout + r.stderr).split("\n");
    const matches = combined.filter((line) =>
      /run\.mode is deprecated/.test(line),
    );
    expect(matches.length).toBeLessThanOrEqual(1);
  });

  it("JSON mode includes a warnings array", () => {
    const pbYml = join(workspace, ".converge/playbooks", pb, "playbook.yml");
    writeFileSync(
      pbYml,
      [
        `name: ${pb}`,
        "description: test fixture",
        "run:",
        "  mode: oneoff",
        "tasks:",
        "  - id: build",
        "goals:",
        "  - id: bootstrap",
        "    description: x",
        "    checks:",
        "      - id: pkg",
        "        cmd: true",
        "",
      ].join("\n"),
      "utf-8",
    );

    const r = runValidate(workspace, [pb, "--json"]);
    expect(r.status).toBe(0);
    const jsonStart = r.stdout.indexOf("{");
    const parsed = JSON.parse(r.stdout.slice(jsonStart));
    expect(parsed.warnings).toBeDefined();
    expect(parsed.warnings).toHaveLength(1);
    expect(parsed.warnings[0].field).toBe("run.mode");
    expect(parsed.warnings[0].reason).toMatch(/deprecated/);
    // Warnings don't count toward totalFindings.
    expect(parsed.totalFindings).toBe(0);
  });

  it("aggregates multiple finding categories in one report", () => {
    // Plant a missing task entry + a broken skill + a goal-error all at once.
    const pbYml = join(workspace, ".converge/playbooks", pb, "playbook.yml");
    writeFileSync(
      pbYml,
      [
        `name: ${pb}`,
        "description: multi-error fixture",
        "tasks:",
        "  - id: build",
        "  - id: missing-task",
        "goals:",
        "  - id: empty-goal",
        "    description: no checks",
        "",
      ].join("\n"),
      "utf-8",
    );
    const brokenDir = join(
      workspace,
      ".converge/playbooks",
      pb,
      "skills/aggregate-broken",
    );
    mkdirSync(brokenDir, { recursive: true });
    writeFileSync(join(brokenDir, "SKILL.md"), "no fm\n", "utf-8");

    const r = runValidate(workspace, [pb, "--json"]);
    expect(r.status).toBe(1);
    const jsonStart = r.stdout.indexOf("{");
    const parsed = JSON.parse(r.stdout.slice(jsonStart));
    expect(parsed.totalFindings).toBeGreaterThanOrEqual(3);
    expect(parsed.missingTaskFiles.length).toBeGreaterThan(0);
    expect(parsed.skillErrors.length).toBeGreaterThan(0);
    expect(parsed.goalErrors.length).toBeGreaterThan(0);
  });
});
