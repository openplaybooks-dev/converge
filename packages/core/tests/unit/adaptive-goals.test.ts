import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  evaluateAndPersist,
  goalLedgerPath,
  loadAllGoals,
  spawnGoal,
  updateGoal,
} from "../../src/task/goal/evaluate-goals.ts";
import { SeedExecutor } from "../../src/executor/seed-executor.ts";
import { parsePlaybookYml } from "../../src/task/playbook/loader.ts";
import type { PlaybookGoal } from "../../src/task/playbook/types.ts";

let root: string;

function readJsonl(path: string): unknown[] {
  return readFileSync(path, "utf8")
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

describe("adaptive goal ledger", () => {
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "converge-goals-"));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("appends spawned goals to journal goals.jsonl and merges them with declared goals", () => {
    const journalDir = join(root, ".converge", "journal");
    const declared: PlaybookGoal[] = [
      {
        id: "bootstrap",
        description: "Bootstrap exists",
        checks: [{ id: "package", cmd: "test -f package.json" }],
      },
    ];

    const spawned = spawnGoal(
      journalDir,
      "default",
      {
        id: "dashboard",
        description: "Dashboard exists",
        depends_on: ["bootstrap"],
        checks: [{ id: "page", cmd: "test -f src/app/page.tsx" }],
      },
      "build",
    );

    expect(spawned.source).toMatchObject({
      type: "seed",
      spawned_by: "build",
    });

    const ledger = goalLedgerPath(journalDir, "default");
    expect(existsSync(ledger)).toBe(true);
    expect(readJsonl(ledger)).toHaveLength(1);

    const merged = loadAllGoals(declared, journalDir, "default");
    expect(merged.map((g) => g.id)).toEqual(["bootstrap", "dashboard"]);
    expect(merged[1].depends_on).toEqual(["bootstrap"]);
  });

  it("evaluates buildable goals after dependency checks pass", () => {
    const journalDir = join(root, ".converge", "journal");
    const goals: PlaybookGoal[] = [
      {
        id: "bootstrap",
        description: "Bootstrap exists",
        checks: [{ id: "package", cmd: "test -f package.json" }],
      },
      {
        id: "dashboard",
        description: "Dashboard exists",
        depends_on: ["bootstrap"],
        checks: [{ id: "page", cmd: "test -f src/app/page.tsx" }],
      },
    ];

    let state = evaluateAndPersist(goals, root, journalDir, "default");
    expect(state.satisfied.map((g) => g.id)).toEqual([]);
    expect(state.buildable.map((g) => g.id)).toEqual(["bootstrap"]);
    expect(state.blocked.map((entry) => entry.goal.id)).toEqual(["dashboard"]);

    writeFileSync(join(root, "package.json"), "{\"name\":\"x\"}\n", "utf8");
    state = evaluateAndPersist(goals, root, journalDir, "default");
    expect(state.satisfied.map((g) => g.id)).toEqual(["bootstrap"]);
    expect(state.buildable.map((g) => g.id)).toEqual(["dashboard"]);
    expect(state.blocked).toEqual([]);
  });

  it("keeps goals without checks as candidates, not buildable work", () => {
    const journalDir = join(root, ".converge", "journal");
    spawnGoal(journalDir, "default", {
      id: "research-new-edge",
      description: "Research a new edge before checks exist",
    });

    const state = evaluateAndPersist(undefined, root, journalDir, "default");
    expect(state.candidates.map((g) => g.id)).toEqual(["research-new-edge"]);
    expect(state.remaining).toEqual([]);
    expect(state.buildable).toEqual([]);
    expect(state.allSatisfied).toBe(true);
  });

  it("updates candidate goals into active buildable goals when checks are known", () => {
    const journalDir = join(root, ".converge", "journal");
    spawnGoal(journalDir, "default", {
      id: "research-new-edge",
      description: "Research a new edge before checks exist",
    });

    updateGoal(journalDir, "default", {
      id: "research-new-edge",
      description: "Research a new edge before checks exist",
      checks: [{ id: "research-doc", cmd: "test -f research.md" }],
    });

    const state = evaluateAndPersist(undefined, root, journalDir, "default");
    expect(state.candidates).toEqual([]);
    expect(state.buildable.map((g) => g.id)).toEqual(["research-new-edge"]);
    expect(
      readJsonl(goalLedgerPath(journalDir, "default")).map(
        (e) => (e as { event: string }).event,
      ),
    )
      .toEqual(["goal.spawned", "goal.updated"]);
  });

  it("parses static goals without checks as candidates", async () => {
    const playbookDir = join(root, ".converge/playbooks/default");
    mkdirSync(join(playbookDir, "tasks"), { recursive: true });
    writeFileSync(
      join(playbookDir, "playbook.yml"),
      [
        "name: default",
        "tasks: []",
        "goals:",
        "  - id: research",
        "    description: Discover concrete checks",
      ].join("\n"),
      "utf8",
    );

    const def = await parsePlaybookYml(playbookDir);
    expect(def.goals![0]).toMatchObject({
      id: "research",
      checks: [],
    });
  });

  it("parses static goal dependencies and check descriptions", async () => {
    const playbookDir = join(root, ".converge/playbooks/default");
    mkdirSync(join(playbookDir, "tasks"), { recursive: true });
    writeFileSync(
      join(playbookDir, "playbook.yml"),
      [
        "name: default",
        "tasks: []",
        "goals:",
        "  - id: dashboard",
        "    description: Dashboard renders",
        "    parent: app",
        "    depends_on: [bootstrap]",
        "    checks:",
        "      - id: page",
        "        description: Page component exists",
        "        cmd: test -f src/app/page.tsx",
      ].join("\n"),
      "utf8",
    );

    const def = await parsePlaybookYml(playbookDir);
    expect(def.goals![0]).toMatchObject({
      id: "dashboard",
      parent: "app",
      depends_on: ["bootstrap"],
      checks: [
        {
          id: "page",
          description: "Page component exists",
          cmd: "test -f src/app/page.tsx",
        },
      ],
    });
  });
});

describe("SeedExecutor adaptive goal API", () => {
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "converge-seed-goals-"));
    mkdirSync(join(root, ".converge/playbooks/default/tasks/build"), {
      recursive: true,
    });
    writeFileSync(
      join(root, ".converge/playbooks/default/playbook.yml"),
      "name: default\ntasks:\n  - path: build\n",
      "utf8",
    );
    writeFileSync(
      join(root, ".converge/playbooks/default/tasks/build/TASK.md"),
      "---\nid: build\ntitle: Build\n---\n",
      "utf8",
    );
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("lets seeds spawn goals and select the next buildable goal", async () => {
    const exec = new SeedExecutor(
      root,
      { epicId: "default", taskId: "build" },
      join(root, ".converge/playbooks/default/tasks/build"),
      { id: "build", title: "Build" },
      [
        {
          id: "bootstrap",
          description: "Bootstrap exists",
          checks: [{ id: "package", cmd: "test -f package.json" }],
        },
      ],
    );

    await exec.run(async (ctx) => {
      await ctx.goals.spawn({
        id: "dashboard",
        description: "Dashboard exists",
      });
      await ctx.goals.update({
        id: "dashboard",
        description: "Dashboard exists",
        depends_on: ["bootstrap"],
        checks: [{ id: "page", cmd: "test -f src/app/page.tsx" }],
      });
      const next = await ctx.goals.nextBuildable();
      if (next?.id !== "bootstrap") {
        throw new Error(`expected bootstrap, got ${next?.id ?? "none"}`);
      }
      return ctx.stop("seed only needed to write a goal");
    });

    const ledger = goalLedgerPath(join(root, ".converge", "journal"), "default");
    expect(readJsonl(ledger)).toHaveLength(2);
    expect(loadAllGoals([], join(root, ".converge", "journal"), "default")[0]).toMatchObject({
      id: "dashboard",
      source: { spawned_by: "build" },
    });
  });
});
