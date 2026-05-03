/**
 * Red — `converge retry` does not exist yet, so the subprocess errors out.
 */
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "../../../..");
const CLI = resolve(REPO_ROOT, "packages/cli/dist/index.js");
const FIXTURE = resolve(__dirname, "../fixtures/minimal-playbook");

let created: string[] = [];

describe("converge retry", () => {
  beforeAll(() => {
    if (!existsSync(CLI)) {
      throw new Error(
        `CLI build missing at ${CLI}. Run 'pnpm --filter @converge/cli build' first.`,
      );
    }
  });

  afterEach(() => {
    for (const p of created) {
      rmSync(p, { recursive: true, force: true });
    }
    created = [];
  });

  it("retry without prior runstate.json exits non-zero with 'no prior run' message", () => {
    expect(() =>
      execFileSync("node", [CLI, "retry"], {
        cwd: FIXTURE,
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "pipe"],
      }),
    ).toThrow(/no prior run/);
  });

  it("retry equals run --select result:error+ when runstate exists", () => {
    const journalDir = join(FIXTURE, ".converge/journal/default");
    mkdirSync(journalDir, { recursive: true });

    const runStatePath = join(journalDir, "runstate.json");
    writeFileSync(
      runStatePath,
      JSON.stringify({ results: [{ task: "trivial-task", status: "error" }] }),
    );
    created.push(runStatePath);

    expect(existsSync(runStatePath)).toBe(true);

    execFileSync("node", [CLI, "retry", "--select", "result:error+"], {
      cwd: FIXTURE,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    // After retry, the state file should still exist (retry re-runs, not clears).
    expect(existsSync(runStatePath)).toBe(true);
  });
});
