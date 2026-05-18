/**
 * Integration tests for --full-refresh materialization — RED phase.
 *
 * Inverse of incremental's no-op test. After two runs the sentinel
 * should show two invocations when --full-refresh is passed on the
 * second run. Not yet implemented.
 */
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "../../../..");
const CLI = resolve(REPO_ROOT, "packages/cli/dist/index.js");
const FIXTURE = resolve(__dirname, "../fixtures/minimal-playbook");

let targetDir: string;

describe("full-refresh materialization", () => {
  beforeAll(() => {
    if (!existsSync(CLI)) {
      throw new Error(
        `CLI build missing at ${CLI}. Run 'pnpm --filter @openplaybooks/converge-cli build' first.`,
      );
    }
  });

  afterEach(() => {
    if (targetDir) {
      rmSync(targetDir, { recursive: true, force: true });
    }
    const sentinel = join(FIXTURE, "incremental-task", "invocation.log");
    if (existsSync(sentinel)) {
      rmSync(sentinel);
    }
  });

  it("re-invokes incremental task when --full-refresh is passed (RED — not yet implemented)", () => {
    // Step 1: run the incremental task to completion
    execFileSync(
      "node",
      [CLI, "run", "--dir", FIXTURE, "--select", "incremental-task"],
      {
        cwd: REPO_ROOT,
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    targetDir = join(FIXTURE, "target");

    // First run: outputs should exist
    expect(existsSync(join(targetDir, "incremental-task", "result.txt"))).toBe(true);

    // Step 2: run again with --full-refresh
    execFileSync(
      "node",
      [CLI, "run", "--dir", FIXTURE, "--select", "incremental-task", "--full-refresh"],
      {
        cwd: REPO_ROOT,
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    // Sentinel should show 2 invocations (one per run)
    const sentinel = join(FIXTURE, "incremental-task", "invocation.log");
    const lines = readFileSync(sentinel, "utf-8").trim().split("\n");
    expect(lines.length).toBe(2);
  });
});
