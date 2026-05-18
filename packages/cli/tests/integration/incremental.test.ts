/**
 * Integration tests for incremental task materialization — RED phase.
 *
 * A task with materialization: incremental should run once,
 * then a second run should be a no-op. Not yet implemented.
 */
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, rmSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "../../../..");
const CLI = resolve(REPO_ROOT, "packages/cli/dist/index.js");
const FIXTURE = resolve(__dirname, "../fixtures/minimal-playbook");

function readJson(p: string): Record<string, unknown> {
  return JSON.parse(readFileSync(p, "utf-8"));
}

let targetDir: string;

describe("incremental task materialization", () => {
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
    // Clean up sentinel file between tests
    const sentinel = join(FIXTURE, "incremental-task", "invocation.log");
    if (existsSync(sentinel)) {
      rmSync(sentinel);
    }
  });

  it.skip("runs incremental task once, then second run is a no-op (RED — not yet implemented)", () => {
    // Step 1: run the incremental task for the first time
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
    const outputDir = join(targetDir, "incremental-task");
    expect(existsSync(outputDir)).toBe(true);

    // Snapshot output timestamps after first run
    const outputEntries = statSync(outputDir);
    const firstRunMtime = outputEntries.mtimeMs;

    // Step 2: run the incremental task a second time
    execFileSync(
      "node",
      [CLI, "run", "--dir", FIXTURE, "--select", "incremental-task"],
      {
        cwd: REPO_ROOT,
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    // Second run: outputs should be unchanged (unchanged mtime means no re-run)
    const secondRunMtime = statSync(join(targetDir, "incremental-task")).mtimeMs;
    expect(secondRunMtime).toBe(firstRunMtime);
  });
});
