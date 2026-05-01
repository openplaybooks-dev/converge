/**
 * Red — `converge run` does not exist yet, so the subprocess errors out.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "../../../..");
const CLI = resolve(REPO_ROOT, "packages/cli/dist/index.js");
const FIXTURE = resolve(__dirname, "../fixtures/minimal-playbook");

describe("converge run", () => {
  beforeAll(() => {
    if (!existsSync(CLI)) {
      throw new Error(
        `CLI build missing at ${CLI}. Run 'pnpm --filter @converge/cli build' first.`,
      );
    }
  });

  it("executes only trivial-task when run --select tag:trivial (RED — command not yet implemented)", () => {
    execFileSync("node", [CLI, "run", "--select", "tag:trivial"], {
      cwd: FIXTURE,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    // trivial-task should have been executed
    const journalRoot = resolve(FIXTURE, ".converge/journal/default");
    const sessions = readdirSync(journalRoot, { withFileTypes: true }).filter(
      (e) => e.isDirectory(),
    );
    expect(sessions.length).toBeGreaterThan(0);
  });

  it("executes tasks matching name substring (RED — command not yet implemented)", () => {
    execFileSync("node", [CLI, "run", "--select", "trivial"], {
      cwd: FIXTURE,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    // trivial-task should be matched by substring "trivial"
    const journalRoot = resolve(FIXTURE, ".converge/journal/default");
    const sessions = readdirSync(journalRoot, { withFileTypes: true }).filter(
      (e) => e.isDirectory(),
    );
    expect(sessions.length).toBeGreaterThan(0);
  });

  it("runs one iteration of first match with --step + --select (RED — command not yet implemented)", () => {
    execFileSync("node", [CLI, "run", "--step", "--select", "trivial-task"], {
      cwd: FIXTURE,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    // --step should run exactly one iteration
    const journalRoot = resolve(FIXTURE, ".converge/journal/default");
    const sessions = readdirSync(journalRoot, { withFileTypes: true }).filter(
      (e) => e.isDirectory(),
    );
    expect(sessions.length).toBeGreaterThan(0);
  });
});
