import { describe, it, expect, beforeAll } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "../../..");
const CLI = resolve(REPO_ROOT, "packages/cli/dist/index.js");
const FIXTURE = resolve(__dirname, "fixtures/minimal-playbook");

describe("autonomous-run", () => {
  beforeAll(() => {
    if (!existsSync(CLI)) {
      throw new Error(
        `CLI build missing at ${CLI}. Run 'pnpm --filter @converge/cli build' first.`,
      );
    }
  });

  it("executes tasks to completion and returns a result", () => {
    const result = execFileSync("node", [CLI, "run", "--restart", "--select", "trivial-task"], {
      cwd: FIXTURE,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 120_000,
    });

    // Autonomous run should produce a session journal entry.
    const journalRoot = resolve(FIXTURE, ".converge/journal/default");
    const sessions = readdirSync(journalRoot, { withFileTypes: true }).filter(
      (e) => e.isDirectory(),
    );
    expect(sessions.length).toBeGreaterThan(0);
  });
});
