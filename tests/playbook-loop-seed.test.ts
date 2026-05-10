import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = resolve(__dirname, "..");
const CLI = resolve(REPO_ROOT, "packages/cli/dist/index.js");

function runConverge(projectDir: string): string {
  const result = spawnSync("node", [CLI, "run", "--playbook=default", "--select", "improve+"], {
    cwd: projectDir,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const out = (result.stdout || "") + (result.stderr || "");
  expect(result.status, out).toBe(0);
  return out;
}

describe("loop seed driver", () => {
  let projectDir: string;

  beforeAll(() => {
    projectDir = mkdtempSync(join(tmpdir(), "converge-loop-seed-"));
    const playbookDir = join(projectDir, ".converge/playbooks/default");
    mkdirSync(join(playbookDir, "tasks/improve/seeds"), { recursive: true });
    mkdirSync(join(projectDir, ".converge"), { recursive: true });

    writeFileSync(join(projectDir, ".converge/project.yaml"), "name: loop-seed-test\n", "utf8");
    writeFileSync(join(playbookDir, "playbook.yml"), `name: default\ntasks:\n  - id: improve\nrun:\n  mode: loop\n  maxIterations: 3\n  maxTaskAttempts: 1\n`, "utf8");
    writeFileSync(join(playbookDir, "tasks/improve/TASK.md"), `---\nid: improve\ntitle: Loop driver\nmaterialization: incremental\nseeds:\n  - type: seed\n    name: epoch\n---\n\nSpawn one child per loop pass.\n`, "utf8");
    writeFileSync(join(playbookDir, "tasks/improve/seeds/epoch.seed.js"), `import { existsSync, readdirSync } from 'node:fs';\n\nexport async function run(ctx) {\n  const existing = existsSync(ctx.spawnDir)\n    ? readdirSync(ctx.spawnDir, { withFileTypes: true }).filter((e) => e.isDirectory() && e.name.startsWith('epoch-')).length\n    : 0;\n  const id = 'epoch-' + String(existing + 1).padStart(3, '0');\n  await ctx.spawn({ id, title: id, prompt: 'No-op child for loop seed regression.' }, { id });\n  return ctx.loop.continue();\n}\n`, "utf8");
  });

  afterAll(() => {
    if (projectDir) rmSync(projectDir, { recursive: true, force: true });
  });

  it("re-runs an incremental seed parent until maxIterations in one invocation", () => {
    const out = runConverge(projectDir);
    expect(out).toContain("Stopping: maxIterations reached (3)");

    const spawnedDir = join(projectDir, ".converge/journal/default/tasks/improve/spawned");
    expect(existsSync(join(spawnedDir, "epoch-001/TASK.md"))).toBe(true);
    expect(existsSync(join(spawnedDir, "epoch-002/TASK.md"))).toBe(true);
    expect(existsSync(join(spawnedDir, "epoch-003/TASK.md"))).toBe(true);
    expect(existsSync(join(spawnedDir, "epoch-004/TASK.md"))).toBe(false);
  });
});

