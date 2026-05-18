/**
 * Red — `converge list --select 'state:modified.drifted'` for output file drift not yet implemented.
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, copyFileSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

const REPO_ROOT = resolve(__dirname, "../../../..");
const CLI = resolve(REPO_ROOT, "packages/cli/dist/index.js");
const FIXTURE = resolve(__dirname, "../fixtures/minimal-playbook");

const origTrivialTaskMd = "# trivial-task\n";

let snapDir: string;

describe("drift detection", () => {
  beforeAll(() => {
    if (!existsSync(CLI)) {
      throw new Error(
        `CLI build missing at ${CLI}. Run 'pnpm --filter @openplaybooks/converge-cli build' first.`,
      );
    }
  });

  beforeEach(() => {
    writeFileSync(join(FIXTURE, "trivial-task", "TASK.md"), origTrivialTaskMd);
  });

  afterEach(() => {
    if (snapDir) {
      rmSync(snapDir, { recursive: true, force: true });
    }
    const targetDir = join(FIXTURE, "target");
    if (existsSync(targetDir)) {
      rmSync(targetDir, { recursive: true, force: true });
    }
    writeFileSync(join(FIXTURE, "trivial-task", "TASK.md"), origTrivialTaskMd);
  });

  function compile() {
    execFileSync("node", [CLI, "compile", "--dir", FIXTURE], {
      cwd: REPO_ROOT,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  }

  function snapshot(): string {
    const dir = join(tmpdir(), `converge-drift-snap-${randomUUID()}`);
    mkdirSync(dir, { recursive: true });
    copyFileSync(
      join(FIXTURE, "target", "manifest.json"),
      join(dir, "manifest.json"),
    );
    return dir;
  }

  function cli(args: string[]): { stdout: string; stderr: string } {
    const result = spawnSync("node", [CLI, ...args], {
      cwd: FIXTURE,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return {
      stdout: result.stdout || "",
      stderr: result.stderr || "",
    };
  }

  it("drifted output — appending to output file flags the task", () => {
    compile();
    snapDir = snapshot();

    // Simulate task producing output: write a file under target/
    const outputDir = join(FIXTURE, "target", "trivial-task");
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(join(outputDir, "result.json"), JSON.stringify({ status: "ok" }));
    compile();

    // Append a byte to the output file (drift)
    const content = readFileSync(join(outputDir, "result.json"));
    writeFileSync(join(outputDir, "result.json"), Buffer.concat([content, Buffer.from([0])]));

    const { stdout } = cli([
      "list",
      "--select",
      "state:modified.drifted",
      "--state",
      snapDir,
    ]);
    expect(stdout).toContain("trivial-task");
  });

  it("no drift without modification", () => {
    compile();
    snapDir = snapshot();

    // Simulate task producing output and recompile to update manifest
    const outputDir = join(FIXTURE, "target", "trivial-task");
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(join(outputDir, "result.json"), JSON.stringify({ status: "ok" }));
    compile();

    const { stdout } = cli([
      "list",
      "--select",
      "state:modified.drifted",
      "--state",
      snapDir,
    ]);
    expect(stdout).not.toContain("trivial-task");
  });
});
