import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = resolve(__dirname, "..");
const CLI = resolve(REPO_ROOT, "packages/cli/dist/index.js");

function compileConverge(projectDir: string): string {
  const result = spawnSync("node", [CLI, "compile", `--dir=${join(projectDir, ".converge/playbooks/default")}`], {
    cwd: projectDir,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const out = (result.stdout || "") + (result.stderr || "");
  expect(result.status, out).toBe(0);
  return out;
}

describe("loop CLI seed driver", () => {
  let projectDir: string;

  beforeAll(() => {
    projectDir = mkdtempSync(join(tmpdir(), "converge-loop-seed-"));
    const playbookDir = join(projectDir, ".converge/playbooks/default");
    mkdirSync(join(playbookDir, "tasks/improve"), { recursive: true });
    mkdirSync(join(projectDir, ".converge"), { recursive: true });

    writeFileSync(join(projectDir, ".converge/project.yaml"), "name: loop-seed-test\n", "utf8");
    writeFileSync(join(playbookDir, "playbook.yml"), `name: default\ntasks:\n  - id: improve\nrun:\n  mode: loop\n  maxIterations: 3\n  maxTaskAttempts: 1\n`, "utf8");
    writeFileSync(join(playbookDir, "tasks/improve/TASK.md"), `---\nid: improve\ntitle: Loop driver\nmaterialization: incremental\nseed:\n  mode: cli\n---\n\nEmit one \`converge spawn task\` command per loop pass.\nUse deterministic ids \`epoch-001\`, \`epoch-002\`, \`epoch-003\`.\n`, "utf8");
  });

  afterAll(() => {
    if (projectDir) rmSync(projectDir, { recursive: true, force: true });
  });

  it("compiles an incremental loop driver that uses CLI seed mode", () => {
    const out = compileConverge(projectDir);
    expect(out).toContain("Compiled");

    const manifest = JSON.parse(
      readFileSync(join(projectDir, ".converge/journal/default/manifest.json"), "utf8"),
    );
    expect(manifest.nodes.improve).toBeDefined();
    expect(existsSync(join(projectDir, ".converge/journal/default/manifest.json"))).toBe(true);
  });
});
