/**
 * Red — `converge list` does not exist yet, so the subprocess errors out.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "../../../..");
const CLI = resolve(REPO_ROOT, "packages/cli/dist/index.js");
const FIXTURE = resolve(__dirname, "../fixtures/minimal-playbook");

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

describe("converge list", () => {
  beforeAll(() => {
    if (!existsSync(CLI)) {
      throw new Error(
        `CLI build missing at ${CLI}. Run 'pnpm --filter @openplaybooks/converge-cli build' first.`,
      );
    }
  });

  it("prints all three fixture tasks with no selector (RED — command not yet implemented)", () => {
    const { stdout } = cli(["list"]);
    expect(stdout).toContain("trivial-task");
    expect(stdout).toContain("dependent-task");
    expect(stdout).toContain("unseeded-seed");
  });

  it("filters by selector (RED — command not yet implemented)", () => {
    const { stdout } = cli(["list", "--select", "tag:trivial"]);
    expect(stdout).toContain("trivial-task");
  });

  it("traverses downstream dependencies (RED — command not yet implemented)", () => {
    const { stdout } = cli(["list", "--select", "trivial-task+"]);
    expect(stdout).toContain("dependent-task");
  });

  it("writes frontier warning to stderr for unseeded Seed (RED — command not yet implemented)", () => {
    const { stderr } = cli(["list", "--select", "unseeded-seed+"]);
    expect(stderr).toContain("unseeded");
  });

  it("ls is an alias for list (RED — command not yet implemented)", () => {
    const { stdout } = cli(["ls"]);
    expect(stdout).toContain("trivial-task");
  });
});
