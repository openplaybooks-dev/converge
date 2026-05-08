/**
 * DAG dependency structure tests for multi-node playbook fixtures.
 *
 * Verifies that compile correctly establishes:
 *  - depends_on chains (A → B → C)
 *  - depended_on_by reverse edges
 *  - child_map (parent → children)
 *  - Frontier count (leaf nodes without dependents)
 *  - Node state (concrete vs abstract)
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = resolve(__dirname, "..");
const CLI = resolve(REPO_ROOT, "packages/cli/dist/index.js");

function converge(args: string): string {
  const parts = args.split(/\s+/).filter(Boolean);
  const result = spawnSync("node", [CLI, ...parts], {
    cwd: REPO_ROOT,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return (result.stdout || "") + (result.stderr || "");
}

function compileFixture(playbookDir: string): void {
  converge(`compile --dir=${playbookDir}`);
}

function cleanupJournal(projectDir: string): void {
  const jd = join(projectDir, ".converge/journal");
  if (existsSync(jd)) rmSync(jd, { recursive: true, force: true });
}

// ── Queue-pattern: linear dependency chain ─────────────────────────

describe("queue-pattern DAG (linear chain: setup → drain → verify)", () => {
  const PROJECT_DIR = resolve(__dirname, "test-queue-pattern");
  const PLAYBOOK_DIR = join(PROJECT_DIR, ".converge/playbooks/default");
  const JOURNAL_DIR = join(PROJECT_DIR, ".converge/journal/default");

  beforeAll(() => {
    cleanupJournal(PROJECT_DIR);
    compileFixture(PLAYBOOK_DIR);
  });

  afterAll(() => {
    cleanupJournal(PROJECT_DIR);
  });

  it("has 3 nodes with correct depends_on chains", () => {
    const raw = readFileSync(join(JOURNAL_DIR, "manifest.json"), "utf-8");
    const m = JSON.parse(raw);

    expect(m.nodes["01-setup"].depends_on).toEqual([]);
    expect(m.nodes["02-drain-epochs"].depends_on).toEqual(["01-setup"]);
    expect(m.nodes["03-verify"].depends_on).toEqual(["02-drain-epochs"]);
  });

  it("has correct depended_on_by reverse edges", () => {
    const raw = readFileSync(join(JOURNAL_DIR, "manifest.json"), "utf-8");
    const m = JSON.parse(raw);

    expect(m.nodes["01-setup"].depended_on_by).toEqual(["02-drain-epochs"]);
    expect(m.nodes["02-drain-epochs"].depended_on_by).toEqual(["03-verify"]);
    expect(m.nodes["03-verify"].depended_on_by).toEqual([]);
  });

  it("has correct child_map (parent → children)", () => {
    const raw = readFileSync(join(JOURNAL_DIR, "manifest.json"), "utf-8");
    const m = JSON.parse(raw);

    expect(m.child_map["01-setup"]).toEqual(["02-drain-epochs"]);
    expect(m.child_map["02-drain-epochs"]).toEqual(["03-verify"]);
    expect(m.child_map["03-verify"]).toEqual([]);
  });

  it("metadata reports frontier_count", () => {
    const raw = readFileSync(join(JOURNAL_DIR, "manifest.json"), "utf-8");
    const m = JSON.parse(raw);
    expect(typeof m.metadata.frontier_count).toBe("number");
  });

  it("all nodes have state 'concrete'", () => {
    const raw = readFileSync(join(JOURNAL_DIR, "manifest.json"), "utf-8");
    const m = JSON.parse(raw);
    for (const node of Object.values(m.nodes) as any[]) {
      expect(node.state).toBe("concrete");
    }
  });

  it("each node has content hashes", () => {
    const raw = readFileSync(join(JOURNAL_DIR, "manifest.json"), "utf-8");
    const m = JSON.parse(raw);
    for (const node of Object.values(m.nodes) as any[]) {
      expect(node.frontmatter_hash).toMatch(/^sha256:/);
      expect(node.body_hash).toMatch(/^sha256:/);
      expect(node.checks_hash).toMatch(/^sha256:/);
    }
  });

  it("upstream_hash chains correctly", () => {
    const raw = readFileSync(join(JOURNAL_DIR, "manifest.json"), "utf-8");
    const m = JSON.parse(raw);

    // 01-setup has no upstream deps
    expect(m.nodes["01-setup"].upstream_hash).toBe("");
    // Children with deps have non-empty upstream_hash
    expect(m.nodes["02-drain-epochs"].upstream_hash).toMatch(/^sha256:/);
    expect(m.nodes["03-verify"].upstream_hash).toMatch(/^sha256:/);
  });

  it("node paths point to real TASK.md files", () => {
    const raw = readFileSync(join(JOURNAL_DIR, "manifest.json"), "utf-8");
    const m = JSON.parse(raw);
    for (const node of Object.values(m.nodes) as any[]) {
      expect(existsSync(node.path)).toBe(true);
    }
  });
});

// ── Gap-blocked-input: parallel producer + consumer ─────────────────

describe("gap-blocked-input DAG (producer → consumer)", () => {
  const PROJECT_DIR = resolve(__dirname, "test-gap-blocked-input");
  const PLAYBOOK_DIR = join(PROJECT_DIR, ".converge/playbooks/default");
  const JOURNAL_DIR = join(PROJECT_DIR, ".converge/journal/default");

  beforeAll(() => {
    cleanupJournal(PROJECT_DIR);
    compileFixture(PLAYBOOK_DIR);
  });

  afterAll(() => {
    cleanupJournal(PROJECT_DIR);
  });

  it("producer has no dependencies", () => {
    const raw = readFileSync(join(JOURNAL_DIR, "manifest.json"), "utf-8");
    const m = JSON.parse(raw);
    expect(m.nodes.producer.depends_on).toEqual([]);
  });

  it("consumer has no static depends_on (gap detection is dynamic)", () => {
    const raw = readFileSync(join(JOURNAL_DIR, "manifest.json"), "utf-8");
    const m = JSON.parse(raw);
    // Consumer declares input but depends_on is empty — gap detection
    // happens at runtime, not compile time
    expect(m.nodes.consumer.depends_on).toEqual([]);
  });

  it("both nodes have their correct inputs/outputs", () => {
    const raw = readFileSync(join(JOURNAL_DIR, "manifest.json"), "utf-8");
    const m = JSON.parse(raw);

    expect(m.nodes.producer.outputs).toContain("INPUT_FILE.txt");
    expect(m.nodes.consumer.inputs).toContain("INPUT_FILE.txt");
    expect(m.nodes.consumer.outputs).toContain("CONSUMED_OUTPUT.txt");
  });
});

// ── Mixed-model: independent parallel tasks ─────────────────────────

describe("mixed-model DAG (independent parallel tasks)", () => {
  const PROJECT_DIR = resolve(__dirname, "test-mixed-model");
  const PLAYBOOK_DIR = join(PROJECT_DIR, ".converge/playbooks/default");
  const JOURNAL_DIR = join(PROJECT_DIR, ".converge/journal/default");

  beforeAll(() => {
    cleanupJournal(PROJECT_DIR);
    compileFixture(PLAYBOOK_DIR);
  });

  afterAll(() => {
    cleanupJournal(PROJECT_DIR);
  });

  it("both tasks are independent (no depends_on)", () => {
    const raw = readFileSync(join(JOURNAL_DIR, "manifest.json"), "utf-8");
    const m = JSON.parse(raw);

    expect(m.nodes["claude-hello"].depends_on).toEqual([]);
    expect(m.nodes["codex-hello"].depends_on).toEqual([]);
  });

  it("both are frontier leaves (depended_on_by is empty)", () => {
    const raw = readFileSync(join(JOURNAL_DIR, "manifest.json"), "utf-8");
    const m = JSON.parse(raw);

    expect(m.nodes["claude-hello"].depended_on_by).toEqual([]);
    expect(m.nodes["codex-hello"].depended_on_by).toEqual([]);
  });

  it("metadata reports frontier_count", () => {
    const raw = readFileSync(join(JOURNAL_DIR, "manifest.json"), "utf-8");
    const m = JSON.parse(raw);
    expect(typeof m.metadata.frontier_count).toBe("number");
  });
});

// ── Financial deep research: named non-default playbook ─────────────

describe("financial-deep-research DAG (named playbook: test-structure)", () => {
  const PROJECT_DIR = resolve(__dirname, "test-financial-deep-research");
  const PLAYBOOK_DIR = join(PROJECT_DIR, ".converge/playbooks/test-structure");
  const JOURNAL_DIR = join(PROJECT_DIR, ".converge/journal/test-structure");

  beforeAll(() => {
    cleanupJournal(PROJECT_DIR);
    compileFixture(PLAYBOOK_DIR);
  });

  afterAll(() => {
    cleanupJournal(PROJECT_DIR);
  });

  it("discovers root task with seed configuration", () => {
    const raw = readFileSync(join(JOURNAL_DIR, "manifest.json"), "utf-8");
    const m = JSON.parse(raw);

    expect(m.nodes["test-structure"]).toBeDefined();
    expect(m.nodes["test-structure"].seed).toBeNull();
    // Node has a concrete TASK.md path (seeds discovered at runtime)
    expect(m.nodes["test-structure"].state).toBe("concrete");
    expect(existsSync(m.nodes["test-structure"].path)).toBe(true);
  });

  it("journal uses non-default playbook name", () => {
    expect(existsSync(join(JOURNAL_DIR, "manifest.json"))).toBe(true);
    const raw = readFileSync(join(JOURNAL_DIR, "manifest.json"), "utf-8");
    const m = JSON.parse(raw);
    expect(m.metadata.playbook).toBe("test-structure");
  });
});
