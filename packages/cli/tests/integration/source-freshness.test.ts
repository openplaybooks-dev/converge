/**
 * Integration tests for source freshness — RED phase.
 *
 * Runs the `source freshness` CLI subcommand against a fixture with
 * fresh and stale sources. Not yet implemented — tests should fail.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "../../../..");
const CLI = resolve(REPO_ROOT, "packages/cli/dist/index.js");
const FIXTURE = resolve(__dirname, "../fixtures/source-freshness");

function runFreshness(select: string): { stdout: string; stderr: string; status: number } {
  try {
    const stdout = execFileSync(
      "node",
      [CLI, "source", "freshness", "--dir", FIXTURE, "--select", select],
      { cwd: REPO_ROOT, encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] },
    );
    return { stdout, stderr: "", status: 0 };
  } catch (e: any) {
    return {
      stdout: e.stdout || "",
      stderr: e.stderr || "",
      status: e.status || 1,
    };
  }
}

describe("source freshness", () => {
  beforeAll(() => {
    if (!existsSync(CLI)) {
      throw new Error(
        `CLI build missing at ${CLI}. Run 'pnpm --filter @converge/cli build' first.`,
      );
    }
  });

  it("fresh-source exits 0 with 'pass' (RED — not yet implemented)", () => {
    const { stdout, stderr, status } = runFreshness("name:fresh-source");
    const output = stdout + stderr;
    expect(status).toBe(0);
    expect(output).toContain("pass");
  });

  it("stale-source exits non-zero with 'error' (RED — not yet implemented)", () => {
    const { stdout, stderr, status } = runFreshness("name:stale-source");
    const output = stdout + stderr;
    expect(status).not.toBe(0);
    expect(output).toContain("error");
  });
});
