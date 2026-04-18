/**
 * Playbook Module Tests
 *
 * Tests for playbook.yml parsing, validation, variable resolution,
 * run config merging, epic generation, duration parsing, and discovery.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  parsePlaybookYml,
  validatePlaybook,
  resolvePlaybook,
  discoverPlaybooks,
  loadPlaybook,
  substituteVars,
  parseDuration,
} from "../../../src/playbook/loader.ts";
import {
  generateEpicFromPlaybook,
  mergeRunConfig,
} from "../../../src/playbook/executor.ts";
import { resolvePlaybookPaths } from "../../../src/playbook/paths.ts";
import type {
  PlaybookSource,
  PlaybookRunConfig,
} from "../../../src/playbook/types.ts";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

let tmpDir: string;

beforeEach(async () => {
  tmpDir = join(
    tmpdir(),
    `converge-pb-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  await mkdir(tmpDir, { recursive: true });
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

async function createPlaybook(
  baseDir: string,
  name: string,
  opts: {
    yml: string;
    tasks?: Record<string, string>;
    files?: Record<string, string>;
  },
): Promise<string> {
  const pbDir = join(baseDir, name);
  await mkdir(pbDir, { recursive: true });
  await writeFile(join(pbDir, "playbook.yml"), opts.yml, "utf8");

  if (opts.tasks) {
    for (const [taskId, content] of Object.entries(opts.tasks)) {
      const taskDir = join(pbDir, "tasks", taskId);
      await mkdir(taskDir, { recursive: true });
      await writeFile(join(taskDir, "TASK.md"), content, "utf8");
    }
  }

  if (opts.files) {
    for (const [relPath, content] of Object.entries(opts.files)) {
      const fullPath = join(pbDir, relPath);
      await mkdir(join(fullPath, ".."), { recursive: true });
      await writeFile(fullPath, content, "utf8");
    }
  }

  return pbDir;
}

/* ------------------------------------------------------------------ */
/*  parseDuration                                                      */
/* ------------------------------------------------------------------ */

describe("parseDuration", () => {
  it("parses minutes", () => expect(parseDuration("30m")).toBe(1800000));
  it("parses hours", () => expect(parseDuration("2h")).toBe(7200000));
  it("parses seconds", () => expect(parseDuration("90s")).toBe(90000));
  it("parses compound", () => expect(parseDuration("1h30m")).toBe(5400000));
  it("parses infinite", () => expect(parseDuration("infinite")).toBe(Infinity));
  it("parses raw number", () => expect(parseDuration(60000)).toBe(60000));
  it("returns undefined for null", () =>
    expect(parseDuration(null)).toBeUndefined());
});

/* ------------------------------------------------------------------ */
/*  parsePlaybookYml                                                   */
/* ------------------------------------------------------------------ */

describe("parsePlaybookYml", () => {
  it("parses continuous playbook with tasks/", async () => {
    const pbDir = await createPlaybook(tmpDir, "app", {
      yml: `
name: my-app
description: Build an app
run:
  mode: autonomous
  maxDuration: 30m
  resume: true
checks:
  - id: builds
    cmd: npm run build
`,
      tasks: {
        "01-setup": "---\ntitle: Setup\n---\nInit project",
        "02-build": "---\ntitle: Build\n---\nBuild it",
      },
    });

    const def = await parsePlaybookYml(pbDir);
    expect(def.name).toBe("my-app");
    expect(def.run?.mode).toBe("autonomous");
    expect(def.run?.maxDuration).toBe(1800000);
    expect(def.checks).toHaveLength(1);
  });

  it("parses keyed playbook (tasks/ with root WBS TASK.md)", async () => {
    const pbDir = await createPlaybook(tmpDir, "fix", {
      yml: `
name: fix-issue
inputs:
  issue: { required: true }
key: issue
run:
  maxDuration: 30m
`,
      tasks: {
        // Root TASK.md with wbs: in frontmatter — standard task API
        "": "", // need tasks/ dir to exist
      },
      files: {
        "tasks/TASK.md":
          "---\ntitle: Fix #${issue}\nwbs:\n  type: nodejs\n  path: ./wbs.js\nblocking: true\n---\n",
        "tasks/wbs.js": "export async function run(ctx) {}",
      },
    });

    const def = await parsePlaybookYml(pbDir);
    expect(def.name).toBe("fix-issue");
    expect(def.key).toBe("issue");
    expect(def.inputs?.issue.required).toBe(true);
  });

  it("throws on missing playbook.yml", async () => {
    await mkdir(join(tmpDir, "empty"), { recursive: true });
    await expect(parsePlaybookYml(join(tmpDir, "empty"))).rejects.toThrow(
      "No playbook.yml",
    );
  });

  it("throws when no tasks/ directory", async () => {
    const pbDir = join(tmpDir, "no-tasks");
    await mkdir(pbDir, { recursive: true });
    await writeFile(join(pbDir, "playbook.yml"), "name: bad\n", "utf8");
    await expect(parsePlaybookYml(pbDir)).rejects.toThrow(
      "no tasks/ directory",
    );
  });
});

/* ------------------------------------------------------------------ */
/*  validatePlaybook                                                   */
/* ------------------------------------------------------------------ */

describe("validatePlaybook", () => {
  it("passes when tasks/ exists", async () => {
    const pbDir = await createPlaybook(tmpDir, "valid", {
      yml: "name: valid\n",
      tasks: { "01-step": "---\ntitle: Step\n---\n" },
    });
    const def = await parsePlaybookYml(pbDir);
    expect(validatePlaybook(def, pbDir)).toEqual([]);
  });

  it("catches missing tasks/ directory", async () => {
    const def = { name: "bad" };
    const errors = validatePlaybook(def, join(tmpDir, "nonexistent"));
    expect(errors.some((e) => e.includes("No tasks/"))).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  resolvePlaybook                                                    */
/* ------------------------------------------------------------------ */

describe("resolvePlaybook", () => {
  it("generates epicId from key", () => {
    const source: PlaybookSource = {
      def: {
        name: "fix-issue",
        inputs: { issue: { required: true } },
        key: "issue",
      },
      templateDir: "/tmp/test",
      builtin: false,
    };
    const resolved = resolvePlaybook(source, { issue: "42" });
    expect(resolved.epicId).toBe("fix-issue-42");
    expect(resolved.vars.issue).toBe("42");
  });

  it("applies defaults", () => {
    const source: PlaybookSource = {
      def: { name: "test", inputs: { branch: { default: "main" } } },
      templateDir: "/tmp/test",
      builtin: false,
    };
    expect(resolvePlaybook(source, {}).vars.branch).toBe("main");
  });

  it("throws on missing required", () => {
    const source: PlaybookSource = {
      def: { name: "test", inputs: { issue: { required: true } } },
      templateDir: "/tmp/test",
      builtin: false,
    };
    expect(() => resolvePlaybook(source, {})).toThrow('Required input "issue"');
  });

  it("uses timestamp when no key", () => {
    const source: PlaybookSource = {
      def: { name: "test" },
      templateDir: "/tmp/test",
      builtin: false,
    };
    expect(resolvePlaybook(source, {}).epicId).toMatch(/^test-\d{4}/);
  });
});

/* ------------------------------------------------------------------ */
/*  substituteVars                                                     */
/* ------------------------------------------------------------------ */

describe("substituteVars", () => {
  it("replaces placeholders", () => {
    expect(substituteVars("Fix ${issue}", { issue: "42" })).toBe("Fix 42");
  });
  it("leaves unknown unchanged", () => {
    expect(substituteVars("${x}", {})).toBe("${x}");
  });
});

/* ------------------------------------------------------------------ */
/*  mergeRunConfig                                                     */
/* ------------------------------------------------------------------ */

describe("mergeRunConfig", () => {
  it("CLI overrides playbook defaults", () => {
    const merged = mergeRunConfig({ mode: "autonomous" }, { mode: "converge" });
    expect(merged.mode).toBe("converge");
  });
  it("defaults to autonomous", () => {
    expect(mergeRunConfig().mode).toBe("autonomous");
  });
});

/* ------------------------------------------------------------------ */
/*  generateEpicFromPlaybook                                           */
/* ------------------------------------------------------------------ */

describe("generateEpicFromPlaybook", () => {
  it("copies tasks/ with variable substitution", async () => {
    const pbDir = await createPlaybook(tmpDir, "gen", {
      yml: "name: gen-test\ndescription: Build it\n",
      tasks: {
        "001-plan": "---\ntitle: Plan\n---\nPlan for ${idea}",
        "002-build":
          "---\ntitle: Build\ndependencies:\n  - 001-plan\n---\nBuild ${idea}",
      },
    });

    const source: PlaybookSource = {
      def: await parsePlaybookYml(pbDir),
      templateDir: pbDir,
      builtin: false,
    };
    const resolved = resolvePlaybook(source, { idea: "todo-app" });

    const projectDir = join(tmpDir, "project");
    await mkdir(projectDir, { recursive: true });
    const epicDir = await generateEpicFromPlaybook(resolved, projectDir);

    // Tasks copied with substitution
    const plan = await readFile(join(epicDir, "001-plan", "TASK.md"), "utf8");
    expect(plan).toContain("Plan for todo-app");

    // Dependencies in TASK.md preserved (not injected by playbook)
    const build = await readFile(join(epicDir, "002-build", "TASK.md"), "utf8");
    expect(build).toContain("dependencies");
    expect(build).toContain("001-plan");
  });

  it("copies keyed playbook with root WBS task", async () => {
    const pbDir = await createPlaybook(tmpDir, "keyed", {
      yml: "name: fix\n",
      files: {
        "tasks/TASK.md":
          "---\ntitle: Fix #${issue}\nwbs:\n  type: nodejs\n  path: ./wbs.js\n---\n",
        "tasks/wbs.js": "export async function run(ctx) {}",
      },
    });

    const source: PlaybookSource = {
      def: await parsePlaybookYml(pbDir),
      templateDir: pbDir,
      builtin: false,
    };
    const resolved = resolvePlaybook(source, { issue: "42" });

    const projectDir = join(tmpDir, "project");
    await mkdir(projectDir, { recursive: true });
    const epicDir = await generateEpicFromPlaybook(resolved, projectDir);

    // Root TASK.md with wbs: copied and substituted
    const taskMd = await readFile(join(epicDir, "TASK.md"), "utf8");
    expect(taskMd).toContain("Fix #42");
    expect(taskMd).toContain("wbs");

    // WBS script copied
    expect(existsSync(join(epicDir, "wbs.js"))).toBe(true);
  });

  it("throws when epic already exists", async () => {
    const pbDir = await createPlaybook(tmpDir, "dup", {
      yml: "name: dup\n",
      tasks: { "001": "---\ntitle: Step\n---\n" },
    });

    const source: PlaybookSource = {
      def: await parsePlaybookYml(pbDir),
      templateDir: pbDir,
      builtin: false,
    };
    const resolved = resolvePlaybook(source, {});

    const projectDir = join(tmpDir, "project");
    await mkdir(projectDir, { recursive: true });
    await generateEpicFromPlaybook(resolved, projectDir);
    await expect(
      generateEpicFromPlaybook(resolved, projectDir),
    ).rejects.toThrow("already exists");
  });
});

/* ------------------------------------------------------------------ */
/*  discoverPlaybooks + loadPlaybook                                   */
/* ------------------------------------------------------------------ */

describe("discoverPlaybooks", () => {
  it("discovers from .converge/playbooks/", async () => {
    await createPlaybook(join(tmpDir, ".converge", "playbooks"), "my-pb", {
      yml: "name: my-pb\n",
      tasks: { "001": "---\ntitle: Step\n---\n" },
    });
    const playbooks = await discoverPlaybooks(tmpDir);
    expect(playbooks.map((p) => p.def.name)).toContain("my-pb");
  });

  it("returns empty when none", async () => {
    expect(await discoverPlaybooks(tmpDir)).toEqual([]);
  });
});

describe("loadPlaybook", () => {
  it("loads by name", async () => {
    await createPlaybook(join(tmpDir, ".converge", "playbooks"), "my-pb", {
      yml: "name: my-pb\n",
      tasks: { "001": "---\ntitle: Step\n---\n" },
    });
    const pb = await loadPlaybook("my-pb", tmpDir);
    expect(pb!.def.name).toBe("my-pb");
  });

  it("returns null for unknown", async () => {
    expect(await loadPlaybook("x", tmpDir)).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/*  resolvePlaybookPaths                                               */
/* ------------------------------------------------------------------ */

describe("resolvePlaybookPaths", () => {
  it("named playbook", () => {
    const p = resolvePlaybookPaths("/project", "fix-issue");
    expect(p.tasks).toBe(
      join("/project", ".converge", "playbooks", "fix-issue", "tasks"),
    );
    expect(p.journalTasks).toBe(
      join("/project", ".converge", "journal", "fix-issue", "tasks"),
    );
    expect(p.config).toBe(
      join("/project", ".converge", "playbooks", "fix-issue", "playbook.yml"),
    );
  });

  it("default playbook", () => {
    const p = resolvePlaybookPaths("/project");
    expect(p.playbook).toBe("default");
    expect(p.tasks).toBe(
      join("/project", ".converge", "playbooks", "default", "tasks"),
    );
    expect(p.config).toBe(
      join("/project", ".converge", "playbooks", "default", "playbook.yml"),
    );
  });

  it("default === no arg", () => {
    expect(resolvePlaybookPaths("/p")).toEqual(
      resolvePlaybookPaths("/p", "default"),
    );
  });
});
