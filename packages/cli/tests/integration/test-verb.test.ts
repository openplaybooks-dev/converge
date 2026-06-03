/**
 * Red — `converge test` does not exist yet, so the subprocess errors out
 * and the expectations on output / filesystem effects fail.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "../../../..");
const CLI = resolve(REPO_ROOT, "packages/cli/dist/index.js");
const FIXTURE = resolve(__dirname, "../fixtures/minimal-playbook");

describe("converge test", () => {
  beforeAll(() => {
    if (!existsSync(CLI)) {
      throw new Error(
        `CLI build missing at ${CLI}. Run 'pnpm --filter @openplaybooks/converge build' first.`,
      );
    }
  });

  it("does not invoke task executors (RED — command not yet implemented)", () => {
    const result = execFileSync("node", [CLI, "test"], {
      cwd: FIXTURE,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    expect(result).not.toContain("[run]");
    expect(result).not.toContain("[exec]");
    expect(result).not.toContain("[task]");
  });

  it("reports per-task pass/fail per check (RED — command not yet implemented)", () => {
    const result = execFileSync(
      "node",
      [CLI, "test", "--select", "tag:smoke"],
      {
        cwd: FIXTURE,
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    expect(result).toContain("PASS");
    expect(result).toContain("FAIL");
    expect(result).toMatch(/\d+ passed/);
  });
});
