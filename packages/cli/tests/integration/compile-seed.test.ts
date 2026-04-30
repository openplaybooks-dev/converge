/**
 * Red — `converge compile --seed` is not yet handled.
 */
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "../../../..");
const CLI = resolve(REPO_ROOT, "packages/cli/dist/index.js");
const FIXTURE = resolve(__dirname, "../fixtures/minimal-playbook");

function readJson(p: string): unknown {
  return JSON.parse(readFileSync(p, "utf-8"));
}

let targetDir: string;

describe("converge compile --seed", () => {
  beforeAll(() => {
    if (!existsSync(CLI)) {
      throw new Error(
        `CLI build missing at ${CLI}. Run 'pnpm --filter @converge/cli build' first.`,
      );
    }
  });

  afterEach(() => {
    if (targetDir) {
      rmSync(targetDir, { recursive: true, force: true });
    }
  });

  it("runs WBS with --seed and updates manifest (RED — seed not yet implemented)", () => {
    // Step 1: compile shows unseeded-wbs in frontier
    execFileSync("node", [CLI, "compile", "--dir", FIXTURE], {
      cwd: REPO_ROOT,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    targetDir = join(FIXTURE, "target");
    let manifest = readJson(join(targetDir, "manifest.json")) as Record<
      string,
      unknown
    >;

    const frontier = manifest.frontier as Record<string, unknown> | undefined;
    expect(frontier).toBeTruthy();
    expect(Object.keys(frontier!)).toContain("unseeded-wbs");

    // Step 2: seed the unseeded-wbs — this runs its WBS
    execFileSync(
      "node",
      [CLI, "compile", "--dir", FIXTURE, "--seed", "--select", "unseeded-wbs"],
      {
        cwd: REPO_ROOT,
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    // After seeding, child task TASK.md should exist on disk
    const childTask = join(
      FIXTURE,
      ".converge/playbooks/default/tasks/unseeded-wbs/child-task",
      "TASK.md",
    );
    expect(existsSync(childTask)).toBe(true);

    // Step 3: recompile — child moves to concrete, frontier_count is 0
    manifest = readJson(join(targetDir, "manifest.json")) as Record<
      string,
      unknown
    >;

    const concrete = manifest.concrete as Record<string, unknown> | undefined;
    expect(concrete).toBeTruthy();
    expect(Object.keys(concrete!)).toContain("unseeded-wbs/child-task");

    const metadata = manifest.metadata as { frontier_count?: number };
    expect(metadata.frontier_count).toBe(0);
  });
});
