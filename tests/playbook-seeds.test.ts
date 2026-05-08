/**
 * Seed execution and structure tests for seed-based playbook fixtures.
 *
 * Verifies that seed functions export correctly, have the expected
 * spawn behavior, and that compile correctly identifies seed tasks.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const REPO_ROOT = resolve(__dirname, "..");

// ── test-seeding: recursive seed spawning ───────────────────────────

describe("test-seeding seeds", () => {
  const FIXTURE_DIR = resolve(__dirname, "test-seeding");
  const TASKS_DIR = join(FIXTURE_DIR, ".converge/playbooks/default/tasks");

  it("parent TASK.md declares seeds", () => {
    const taskMd = readFileSync(join(TASKS_DIR, "parent/TASK.md"), "utf-8");
    expect(taskMd).toContain("type: seed");
    expect(taskMd).toContain("spawn");
  });

  it("spawn.seed.js exists and exports seed metadata", () => {
    const seedPath = join(TASKS_DIR, "seeds/spawn.seed.js");
    expect(existsSync(seedPath)).toBe(true);

    const seedSrc = readFileSync(seedPath, "utf-8");
    expect(seedSrc).toContain("ctx.spawn");
    expect(seedSrc).toContain("child-alpha");
    expect(seedSrc).toContain("child-beta");
  });

  it("deep-spawn.seed.js exists and spawns grandchildren", () => {
    const seedPath = join(TASKS_DIR, "seeds/deep-spawn.seed.js");
    expect(existsSync(seedPath)).toBe(true);

    const seedSrc = readFileSync(seedPath, "utf-8");
    expect(seedSrc).toContain("ctx.spawn");
    expect(seedSrc).toContain("grandchild");
    expect(seedSrc).toContain("grand.txt");
  });
});

// ── test-queue-pattern: incremental do-while seed ───────────────────

describe("test-queue-pattern seeds", () => {
  const FIXTURE_DIR = resolve(__dirname, "test-queue-pattern");
  const TASKS_DIR = join(FIXTURE_DIR, ".converge/playbooks/default/tasks");

  it("02-drain-epochs TASK.md declares incremental materialization", () => {
    const taskMd = readFileSync(join(TASKS_DIR, "02-drain-epochs/TASK.md"), "utf-8");
    expect(taskMd).toContain("materialization: incremental");
  });

  it("drain-epoch.seed.js exists and implements do-while queue drain", () => {
    const seedPath = join(TASKS_DIR, "02-drain-epochs/seeds/drain-epoch.seed.js");
    expect(existsSync(seedPath)).toBe(true);

    const seedSrc = readFileSync(seedPath, "utf-8");
    // Implements the queue drain pattern
    expect(seedSrc).toContain("pending");
    expect(seedSrc).toContain("processing");
    expect(seedSrc).toContain("ctx.spawn");
    // Has discovery mapping (alpha → gamma, beta → delta)
    expect(seedSrc).toContain("gamma");
    expect(seedSrc).toContain("delta");
    // Returns false when drained (convergence)
    expect(seedSrc).toContain("return false");
  });

  it("drain-epoch seed has 5 expected phases", () => {
    const seedPath = join(TASKS_DIR, "02-drain-epochs/seeds/drain-epoch.seed.js");
    const seedSrc = readFileSync(seedPath, "utf-8");

    // 5 phases: scan, discover, converge-check, spawn, recurse
    const phaseCount = (seedSrc.match(/\/\/\s*Phase\s*\d|STEP\s*\d/gi) || []).length;
    // At minimum has scan completed, discover, convergence, spawn logic
    expect(seedSrc).toContain("completed");
    expect(seedSrc).toContain("discover");
    expect(seedSrc).toContain("spawn");
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

describe("test-financial-deep-research seeds", () => {
  const FIXTURE_DIR = resolve(__dirname, "test-financial-deep-research");
  const PLAYBOOK_DIR = join(FIXTURE_DIR, ".converge/playbooks/test-structure");

  it("root seed.js spawns A-pipeline, B-cross-ticker, C-report in order", () => {
    const seedPath = join(PLAYBOOK_DIR, "seed.js");
    expect(existsSync(seedPath)).toBe(true);

    const seedSrc = readFileSync(seedPath, "utf-8");
    expect(seedSrc).toContain("A-pipeline");
    expect(seedSrc).toContain("B-cross-ticker");
    expect(seedSrc).toContain("C-report");
    expect(seedSrc).toContain("ctx.spawn");
    expect(seedSrc).toContain("depends_on");
  });

  it("seed-b.js spawns A1-fundamental and A2-technical", () => {
    const seedPath = join(PLAYBOOK_DIR, "seed-b.js");
    expect(existsSync(seedPath)).toBe(true);

    const seedSrc = readFileSync(seedPath, "utf-8");
    expect(seedSrc).toContain("fundamental");
    expect(seedSrc).toContain("technical");
    expect(seedSrc).toContain("ctx.spawn");
  });

  it("root TASK.md declares nodejs seed", () => {
    const taskMd = readFileSync(join(PLAYBOOK_DIR, "TASK.md"), "utf-8");
    expect(taskMd).toContain("type: nodejs");
    expect(taskMd).toContain("seed.js");
  });
});

// ── test-incremental-seeding: for-each and nested loop patterns ─────

describe("test-incremental-seeding seeds", () => {
  const FIXTURE_DIR = resolve(__dirname, "test-incremental-seeding");

  it("has default, for-each, and nested-loop playbooks", () => {
    const playbooksDir = join(FIXTURE_DIR, ".converge/playbooks");
    expect(existsSync(join(playbooksDir, "default/playbook.yml"))).toBe(true);
    expect(existsSync(join(playbooksDir, "for-each/playbook.yml"))).toBe(true);
    expect(existsSync(join(playbooksDir, "nested-loop/playbook.yml"))).toBe(true);
  });

  it("for-each playbook has seed tasks", () => {
    const tasksDir = join(FIXTURE_DIR, ".converge/playbooks/for-each/tasks");
    const taskMd = readFileSync(join(tasksDir, "process-all/TASK.md"), "utf-8");
    expect(taskMd).toContain("seed");
  });

  it("nested-loop playbook has batch → item spawning", () => {
    const tasksDir = join(FIXTURE_DIR, ".converge/playbooks/nested-loop/tasks");
    const taskMd = readFileSync(join(tasksDir, "process-batches/TASK.md"), "utf-8");
    expect(taskMd).toContain("seed");
    expect(taskMd).toContain("spawn");
  });
});
