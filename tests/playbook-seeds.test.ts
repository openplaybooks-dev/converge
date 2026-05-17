/**
 * CLI-seed authoring and structure tests for dynamic playbook fixtures.
 *
 * Verifies that TASK.md files use `seed: { mode: cli }`, describe
 * `converge spawn ...` behavior explicitly, and keep the dynamic
 * spawn patterns documented in fixtures.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const REPO_ROOT = resolve(__dirname, "..");

// ── test-seeding: recursive seed spawning ───────────────────────────

describe("test-seeding CLI seed contract", () => {
  const FIXTURE_DIR = resolve(__dirname, "test-seeding");
  const TASKS_DIR = join(FIXTURE_DIR, ".converge/playbooks/default/tasks");

  // The test-seeding fixture migrated from `seed: mode: cli` syntax to the
  // newer `passthrough: true` declaration with `converge spawn <name> <name>`
  // bodies. Assertions track the current parent/child-alpha/child-beta shape.
  it("parent TASK.md declares passthrough seed mode", () => {
    const taskMd = readFileSync(join(TASKS_DIR, "parent/TASK.md"), "utf-8");
    expect(taskMd).toContain("passthrough: true");
    expect(taskMd).toMatch(/converge spawn /);
  });

  it("parent instructions describe child spawn flow", () => {
    const taskMd = readFileSync(join(TASKS_DIR, "parent/TASK.md"), "utf-8");
    expect(taskMd).toMatch(/converge spawn /);
    expect(taskMd).toContain("child-alpha");
    expect(taskMd).toContain("child-beta");
  });
});

// ── test-queue-pattern: incremental do-while seed ───────────────────

describe("test-queue-pattern CLI seed contract", () => {
  const FIXTURE_DIR = resolve(__dirname, "test-queue-pattern");
  const TASKS_DIR = join(FIXTURE_DIR, ".converge/playbooks/default/tasks");

  it("02-drain-epochs TASK.md declares incremental materialization", () => {
    const taskMd = readFileSync(join(TASKS_DIR, "02-drain-epochs/TASK.md"), "utf-8");
    expect(taskMd).toContain("materialization: incremental");
  });

  it("02-drain-epochs TASK.md declares CLI seed mode and queue-drain flow", () => {
    const taskMd = readFileSync(join(TASKS_DIR, "02-drain-epochs/TASK.md"), "utf-8");
    expect(taskMd).toContain("seed:");
    expect(taskMd).toContain("mode: cli");
    expect(taskMd).toContain("converge spawn task");
    expect(taskMd).toContain("gamma");
    expect(taskMd).toContain("delta");
  });

  it("drain task still documents scan → discover → spawn → converge phases", () => {
    const taskMd = readFileSync(join(TASKS_DIR, "02-drain-epochs/TASK.md"), "utf-8");
    expect(taskMd).toContain("Scans completed items");
    expect(taskMd).toContain("Discovers follow-up items");
    expect(taskMd).toContain("convergence");
  });

  it("queue fixture has setup → drain → verify chain", () => {
    const setupMd = readFileSync(join(TASKS_DIR, "01-setup/TASK.md"), "utf-8");
    const verifyMd = readFileSync(join(TASKS_DIR, "03-verify/TASK.md"), "utf-8");

    expect(setupMd).toContain("queue.json");
    expect(verifyMd).toContain("validation.json");
    expect(verifyMd).toContain("all_passed");
  });
});

// ── test-financial-deep-research: multi-level seed spawning ─────────

describe("test-financial-deep-research CLI seed contract", () => {
  const FIXTURE_DIR = resolve(__dirname, "test-financial-deep-research");
  const PLAYBOOK_DIR = join(FIXTURE_DIR, ".converge/playbooks/test-structure");

  it("root TASK.md declares CLI seed mode and ordered spawn plan", () => {
    const taskMd = readFileSync(join(PLAYBOOK_DIR, "TASK.md"), "utf-8");
    expect(taskMd).toContain("seed:");
    expect(taskMd).toContain("mode: cli");
    expect(taskMd).toContain("A-pipeline");
    expect(taskMd).toContain("cross-ticker");
    expect(taskMd).toContain("report");
    expect(taskMd).toContain("A1-fundamental");
    expect(taskMd).toContain("A2-technical");
  });
});

// ── test-incremental-seeding: deterministic incremental loop patterns ─

describe("test-incremental-seeding incremental contract", () => {
  const FIXTURE_DIR = resolve(__dirname, "test-incremental-seeding");

  it("has default, for-each, and nested-loop playbooks", () => {
    const playbooksDir = join(FIXTURE_DIR, ".converge/playbooks");
    expect(existsSync(join(playbooksDir, "default/playbook.yml"))).toBe(true);
    expect(existsSync(join(playbooksDir, "for-each/playbook.yml"))).toBe(true);
    expect(existsSync(join(playbooksDir, "nested-loop/playbook.yml"))).toBe(true);
  });

  it("default playbook uses a passthrough do-while parent and child template", () => {
    const taskMd = readFileSync(
      join(FIXTURE_DIR, ".converge/playbooks/default/tasks/parent/TASK.md"),
      "utf-8",
    );
    expect(taskMd).toContain("passthrough: true");
    expect(taskMd).toContain("converge:");
    expect(taskMd).toContain('converge spawn "$CHILD_ID" child');
    expect(
      existsSync(join(FIXTURE_DIR, ".converge/playbooks/default/templates/child/TASK.md")),
    ).toBe(true);
  });

  it("for-each playbook walks a fixed item list incrementally", () => {
    const taskMd = readFileSync(
      join(FIXTURE_DIR, ".converge/playbooks/for-each/tasks/process-all/TASK.md"),
      "utf-8",
    );
    expect(taskMd).toContain("passthrough: true");
    expect(taskMd).toContain("alpha beta gamma");
    expect(taskMd).toContain('converge spawn "$ITEM" item');
    expect(
      existsSync(join(FIXTURE_DIR, ".converge/playbooks/for-each/templates/item/TASK.md")),
    ).toBe(true);
  });

  it("nested-loop playbook has batch → item passthrough spawning", () => {
    const taskMd = readFileSync(
      join(FIXTURE_DIR, ".converge/playbooks/nested-loop/tasks/process-batches/TASK.md"),
      "utf-8",
    );
    expect(taskMd).toContain("passthrough: true");
    expect(taskMd).toContain("batch child");
    expect(taskMd).toContain("item children");
    expect(
      existsSync(join(FIXTURE_DIR, ".converge/playbooks/nested-loop/templates/batch/TASK.md")),
    ).toBe(true);
    expect(
      existsSync(join(FIXTURE_DIR, ".converge/playbooks/nested-loop/templates/item/TASK.md")),
    ).toBe(true);
  });
});
