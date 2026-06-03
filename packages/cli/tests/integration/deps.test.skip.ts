/**
 * Red — `converge deps` does not exist yet, so the subprocess errors out.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";

const REPO_ROOT = resolve(__dirname, "../../../..");
const CLI = resolve(REPO_ROOT, "packages/cli/dist/index.js");
const FIXTURE = resolve(__dirname, "../fixtures/minimal-playbook");

function cli(
  args: string[],
  cwd?: string,
): { stdout: string; stderr: string; status: number | null } {
  const result = spawnSync("node", [CLI, ...args], {
    cwd: cwd ?? FIXTURE,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    status: result.status,
  };
}

describe("converge deps list", () => {
  beforeAll(() => {
    if (!existsSync(CLI)) {
      throw new Error(
        `CLI build missing at ${CLI}. Run 'pnpm --filter @openplaybooks/converge build' first.`,
      );
    }
  });

  it("exits 0 and prints at least one skill name (RED — command not yet implemented)", () => {
    const { stdout, stderr, status } = cli(["deps", "list"]);
    expect(status).toBe(0);
    expect(stdout + stderr).toMatch(/converge/i);
  });
});

describe("converge deps install", () => {
  it("installs a named skill or reports idempotent (RED — command not yet implemented)", () => {
    const tmp = mkdtempSync(`${tmpdir()}/converge-deps-install-`);
    const { stdout, stderr, status } = cli(
      ["deps", "install", "converge-planning"],
      tmp,
    );
    expect(status).toBe(0);
    expect(stdout + stderr).toMatch(/converge|installed|already/i);
  });
});
