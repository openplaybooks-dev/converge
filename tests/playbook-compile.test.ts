/**
 * Compile integration tests for all playbook fixtures.
 *
 * Verifies that `converge compile` correctly discovers nodes, writes
 * manifest + runstate, and establishes correct parent-child relationships
 * for every fixture in tests/.
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

interface Fixture {
  name: string;
  projectDir: string;
  playbookDir: string;
  journalDir: string;
  nodeCount: number;
  nodeIds: string[];
  /** parent_map entries expected after compile */
  parentMap: Record<string, string[]>;
}

const FIXTURES: Fixture[] = [
  {
    name: "test-simple-run",
    projectDir: resolve(__dirname, "test-simple-run"),
    playbookDir: resolve(
      __dirname,
      "test-simple-run/.converge/playbooks/default",
    ),
    journalDir: resolve(__dirname, "test-simple-run/.converge/journal/default"),
    nodeCount: 1,
    nodeIds: ["hello"],
    parentMap: { hello: [] },
  },
  {
    name: "test-buggy-check",
    projectDir: resolve(__dirname, "test-buggy-check"),
    playbookDir: resolve(
      __dirname,
      "test-buggy-check/.converge/playbooks/default",
    ),
    journalDir: resolve(
      __dirname,
      "test-buggy-check/.converge/journal/default",
    ),
    nodeCount: 1,
    nodeIds: ["buggy"],
    parentMap: { buggy: [] },
  },
  {
    name: "test-gap-blocked-input",
    projectDir: resolve(__dirname, "test-gap-blocked-input"),
    playbookDir: resolve(
      __dirname,
      "test-gap-blocked-input/.converge/playbooks/default",
    ),
    journalDir: resolve(
      __dirname,
      "test-gap-blocked-input/.converge/journal/default",
    ),
    nodeCount: 2,
    nodeIds: ["producer", "consumer"],
    parentMap: { producer: ["consumer"], consumer: [] },
  },
  {
    name: "test-gap-missing-output",
    projectDir: resolve(__dirname, "test-gap-missing-output"),
    playbookDir: resolve(
      __dirname,
      "test-gap-missing-output/.converge/playbooks/default",
    ),
    journalDir: resolve(
      __dirname,
      "test-gap-missing-output/.converge/journal/default",
    ),
    nodeCount: 1,
    nodeIds: ["miss-out"],
    parentMap: { "miss-out": [] },
  },
  {
    name: "test-loop-detection",
    projectDir: resolve(__dirname, "test-loop-detection"),
    playbookDir: resolve(
      __dirname,
      "test-loop-detection/.converge/playbooks/default",
    ),
    journalDir: resolve(
      __dirname,
      "test-loop-detection/.converge/journal/default",
    ),
    nodeCount: 1,
    nodeIds: ["looper"],
    parentMap: { looper: [] },
  },
  {
    name: "test-multi-attempt",
    projectDir: resolve(__dirname, "test-multi-attempt"),
    playbookDir: resolve(
      __dirname,
      "test-multi-attempt/.converge/playbooks/default",
    ),
    journalDir: resolve(
      __dirname,
      "test-multi-attempt/.converge/journal/default",
    ),
    nodeCount: 1,
    nodeIds: ["two-phase"],
    parentMap: { "two-phase": [] },
  },
  {
    name: "test-resume",
    projectDir: resolve(__dirname, "test-resume"),
    playbookDir: resolve(__dirname, "test-resume/.converge/playbooks/default"),
    journalDir: resolve(__dirname, "test-resume/.converge/journal/default"),
    nodeCount: 1,
    nodeIds: ["long-task"],
    parentMap: { "long-task": [] },
  },
  {
    name: "test-seeding",
    projectDir: resolve(__dirname, "test-seeding"),
    playbookDir: resolve(__dirname, "test-seeding/.converge/playbooks/default"),
    journalDir: resolve(__dirname, "test-seeding/.converge/journal/default"),
    nodeCount: 1,
    nodeIds: ["parent"],
    parentMap: { parent: [] },
  },
  {
    name: "test-mixed-model",
    projectDir: resolve(__dirname, "test-mixed-model"),
    playbookDir: resolve(
      __dirname,
      "test-mixed-model/.converge/playbooks/default",
    ),
    journalDir: resolve(
      __dirname,
      "test-mixed-model/.converge/journal/default",
    ),
    nodeCount: 2,
    nodeIds: ["claude-hello", "codex-hello"],
    parentMap: { "claude-hello": [], "codex-hello": ["claude-hello"] },
  },
  {
    name: "test-three-workers",
    projectDir: resolve(__dirname, "test-three-workers"),
    playbookDir: resolve(
      __dirname,
      "test-three-workers/.converge/playbooks/default",
    ),
    journalDir: resolve(
      __dirname,
      "test-three-workers/.converge/journal/default",
    ),
    nodeCount: 4,
    nodeIds: ["01-alpha", "02-beta", "03-gamma", "04-aggregate"],
    parentMap: {
      "01-alpha": [],
      "02-beta": ["01-alpha"],
      "03-gamma": ["02-beta"],
      "04-aggregate": ["03-gamma"],
    },
  },
  {
    name: "test-deepseek-opencode",
    projectDir: resolve(__dirname, "test-deepseek-opencode"),
    playbookDir: resolve(
      __dirname,
      "test-deepseek-opencode/.converge/playbooks/default",
    ),
    journalDir: resolve(
      __dirname,
      "test-deepseek-opencode/.converge/journal/default",
    ),
    nodeCount: 2,
    nodeIds: ["deepseek-hello", "opencode-hello"],
    parentMap: { "deepseek-hello": [], "opencode-hello": ["deepseek-hello"] },
  },
  {
    name: "test-deepcode",
    projectDir: resolve(__dirname, "test-deepcode"),
    playbookDir: resolve(
      __dirname,
      "test-deepcode/.converge/playbooks/default",
    ),
    journalDir: resolve(__dirname, "test-deepcode/.converge/journal/default"),
    nodeCount: 1,
    nodeIds: ["deepcode-hello"],
    parentMap: { "deepcode-hello": [] },
  },
  {
    name: "test-queue-pattern",
    projectDir: resolve(__dirname, "test-queue-pattern"),
    playbookDir: resolve(
      __dirname,
      "test-queue-pattern/.converge/playbooks/default",
    ),
    journalDir: resolve(
      __dirname,
      "test-queue-pattern/.converge/journal/default",
    ),
    nodeCount: 3,
    nodeIds: ["01-setup", "02-drain-epochs", "03-verify"],
    parentMap: {
      "01-setup": [],
      "02-drain-epochs": ["01-setup"],
      "03-verify": ["02-drain-epochs"],
    },
  },
  {
    name: "test-financial-deep-research",
    projectDir: resolve(__dirname, "test-financial-deep-research"),
    playbookDir: resolve(
      __dirname,
      "test-financial-deep-research/.converge/playbooks/test-structure",
    ),
    journalDir: resolve(
      __dirname,
      "test-financial-deep-research/.converge/journal/test-structure",
    ),
    nodeCount: 1,
    nodeIds: ["test-structure"],
    parentMap: { "test-structure": [] },
  },
];

function cleanupJournal(fixture: Fixture): void {
  const jd = join(fixture.projectDir, ".converge/journal");
  if (existsSync(jd)) rmSync(jd, { recursive: true, force: true });
}

function cleanupPlaybookTarget(fixture: Fixture): void {
  const pt = join(fixture.playbookDir, "target");
  if (existsSync(pt)) rmSync(pt, { recursive: true, force: true });
}

describe.each(FIXTURES)("compile: $name", (fixture) => {
  beforeAll(() => {
    cleanupJournal(fixture);
    cleanupPlaybookTarget(fixture);
  });

  afterAll(() => {
    cleanupJournal(fixture);
    cleanupPlaybookTarget(fixture);
  });

  it("discovers correct number of nodes", () => {
    const out = converge(`compile --dir=${fixture.playbookDir}`);
    expect(out).toContain(`Compiled`);
    expect(out).toContain(`${fixture.nodeCount} nodes`);
    expect(out).toContain("manifest →");
    expect(out).toContain("runstate →");
  });

  it("writes manifest.json to journal", () => {
    expect(existsSync(join(fixture.journalDir, "manifest.json"))).toBe(true);
  });

  it("writes runstate.json to journal", () => {
    expect(existsSync(join(fixture.journalDir, "runstate.json"))).toBe(true);
  });

  it("does NOT write to playbookDir/target/", () => {
    expect(
      existsSync(join(fixture.playbookDir, "target", "manifest.json")),
    ).toBe(false);
  });

  it("manifest contains all expected node IDs", () => {
    const raw = readFileSync(
      join(fixture.journalDir, "manifest.json"),
      "utf-8",
    );
    const m = JSON.parse(raw);
    for (const id of fixture.nodeIds) {
      expect(m.nodes[id]).toBeDefined();
    }
  });

  it("manifest has correct parent-child relationships", () => {
    const raw = readFileSync(
      join(fixture.journalDir, "manifest.json"),
      "utf-8",
    );
    const m = JSON.parse(raw);
    for (const [childId, expectedParents] of Object.entries(
      fixture.parentMap,
    )) {
      expect(m.parent_map[childId]).toEqual(expectedParents);
    }
  });

  it("all runstate nodes start as pending", () => {
    const raw = readFileSync(
      join(fixture.journalDir, "runstate.json"),
      "utf-8",
    );
    const r = JSON.parse(raw);
    const nodeCount = Object.keys(r.dag?.nodes || r.nodes || {}).length;
    expect(nodeCount).toBe(fixture.nodeCount);
    const nodes: Record<string, any> = r.dag?.nodes || r.nodes || {};
    for (const n of Object.values(nodes) as any[]) {
      expect(n.status).toBe("pending");
    }
  });

  it("manifest has well-formed metadata", () => {
    const raw = readFileSync(
      join(fixture.journalDir, "manifest.json"),
      "utf-8",
    );
    const m = JSON.parse(raw);
    expect(m.metadata).toBeDefined();
    expect(m.metadata.manifest_version).toBe(1);
    expect(m.metadata.generated_at).toBeDefined();
  });
});
