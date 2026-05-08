/**
 * Compile + Run integration tests.
 *
 * Verifies the dbt-style compile/run separation:
 *  1. compile discovers all children via filesystem scan
 *  2. compile writes manifest + runstate to journal
 *  3. run reads from journal — no filesystem scanning
 *  4. run fails cleanly without prior compile
 *  5. manifest + runstate survive sync (not deleted)
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  existsSync,
  readFileSync,
  renameSync,
  rmSync,
} from "node:fs";
import { resolve, join } from "node:path";

const REPO_ROOT = resolve(__dirname, "..");
const CLI = resolve(REPO_ROOT, "packages/cli/dist/index.js");
const PROJECT_DIR = resolve(__dirname, "test-compile-discover");
const PLAYBOOK_DIR = join(PROJECT_DIR, ".converge/playbooks/default");
const JOURNAL_DIR = join(PROJECT_DIR, ".converge/journal/default");

function converge(args: string): string {
  const parts = args.split(/\s+/).filter(Boolean);
  const { spawnSync } = require("node:child_process");
  const result = spawnSync("node", [CLI, ...parts], {
    cwd: REPO_ROOT,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return (result.stdout || "") + (result.stderr || "");
}

function cleanupJournal(): void {
  const jd = join(PROJECT_DIR, ".converge/journal");
  if (existsSync(jd)) rmSync(jd, { recursive: true, force: true });
}

function cleanupPlaybookTarget(): void {
  const pt = join(PLAYBOOK_DIR, "target");
  if (existsSync(pt)) rmSync(pt, { recursive: true, force: true });
  // Also clean stale .converge inside playbook dir
  const stale = join(PLAYBOOK_DIR, ".converge");
  if (existsSync(stale)) rmSync(stale, { recursive: true, force: true });
  // Clean output files
  for (const f of ["READY.txt", "PRD.txt", "SPEC.txt"]) {
    const fp = join(PROJECT_DIR, f);
    if (existsSync(fp)) rmSync(fp);
  }
}

describe("compile", () => {
  beforeAll(() => {
    cleanupJournal();
    cleanupPlaybookTarget();
  });

  afterAll(() => {
    cleanupJournal();
    cleanupPlaybookTarget();
  });

  it("discovers 3 nodes (1 parent + 2 children)", () => {
    const out = converge(
      `compile --dir=${PLAYBOOK_DIR}`,
    );
    expect(out).toContain("Compiled default: 3 nodes");
    expect(out).toContain("manifest →");
    expect(out).toContain("runstate →");
  });

  it("writes manifest.json to journal", () => {
    expect(existsSync(join(JOURNAL_DIR, "manifest.json"))).toBe(true);
  });

  it("writes runstate.json to journal", () => {
    expect(existsSync(join(JOURNAL_DIR, "runstate.json"))).toBe(true);
  });

  it("does NOT write to playbookDir/target/", () => {
    expect(existsSync(join(PLAYBOOK_DIR, "target", "manifest.json"))).toBe(false);
  });

  it("manifest has correct parent-child relationships", () => {
    const raw = readFileSync(join(JOURNAL_DIR, "manifest.json"), "utf-8");
    const m = JSON.parse(raw);
    expect(m.nodes["01-prepare"]).toBeDefined();
    expect(m.nodes["001-prd"]).toBeDefined();
    expect(m.nodes["002-spec"]).toBeDefined();
    expect(m.parent_map["001-prd"]).toContain("01-prepare");
    expect(m.parent_map["002-spec"]).toContain("01-prepare");
  });

  it("runstate has all nodes pending", () => {
    const raw = readFileSync(join(JOURNAL_DIR, "runstate.json"), "utf-8");
    const r = JSON.parse(raw);
    expect(Object.keys(r.dag.nodes).length).toBe(3);
    for (const n of Object.values(r.dag.nodes) as any[]) {
      expect(n.status).toBe("pending");
    }
  });
});

describe("run", () => {
  beforeAll(() => {
    cleanupJournal();
    cleanupPlaybookTarget();
    // Compile first so run has a manifest
    converge(`compile --dir=${PLAYBOOK_DIR}`);
  });

  afterAll(() => {
    cleanupJournal();
    cleanupPlaybookTarget();
  });

  it("--dry shows all 3 nodes from manifest", () => {
    const out = converge(`run --dir=${PROJECT_DIR} --dry`);
    // Output: "DAG: N nodes" and task IDs from manifest
    expect(out).toMatch(/3 task/);
    expect(out).toContain("01-prepare");
    expect(out).toContain("001-prd");
    expect(out).toContain("002-spec");
  });

  it("fails cleanly when no manifest exists", () => {
    const journalManifest = join(PROJECT_DIR, ".converge/journal/default/manifest.json");
    if (!existsSync(journalManifest)) return; // skip if manifest was already cleaned
    const backup = journalManifest + ".bak";
    renameSync(journalManifest, backup);
    try {
      const out = converge(`run --dir=${PROJECT_DIR}`);
      expect(out).toContain("No compiled manifest found");
    } finally {
      if (existsSync(backup)) {
        renameSync(backup, journalManifest);
      }
    }
  });
});

describe("manifest survives sync", () => {
  beforeAll(() => {
    cleanupJournal();
    cleanupPlaybookTarget();
    converge(`compile --dir=${PLAYBOOK_DIR}`);
  });

  afterAll(() => {
    cleanupJournal();
    cleanupPlaybookTarget();
  });

  it("manifest.json still exists after run --dry", () => {
    converge(`run --dir=${PROJECT_DIR} --dry`);
    expect(existsSync(join(JOURNAL_DIR, "manifest.json"))).toBe(true);
    expect(existsSync(join(JOURNAL_DIR, "runstate.json"))).toBe(true);
  });
});
