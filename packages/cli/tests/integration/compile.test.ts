/**
 * Red — `converge compile` does not exist yet, so the subprocess errors out.
 */
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "../../../..");
const CLI = resolve(REPO_ROOT, "packages/cli/dist/index.js");
const FIXTURE = resolve(__dirname, "../fixtures/minimal-playbook");

function readJson(p: string): unknown {
  return JSON.parse(readFileSync(p, "utf-8"));
}

let targetDir: string;

describe("converge compile", () => {
  beforeAll(() => {
    // Skip if CLI hasn't been built.
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

  it("produces manifest.json after compile (RED — command not yet implemented)", () => {
    // Run compile. This should fail until the command is implemented.
    execFileSync("node", [CLI, "compile", "--dir", FIXTURE], {
      cwd: REPO_ROOT,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    targetDir = join(FIXTURE, "target");
    expect(existsSync(join(targetDir, "manifest.json"))).toBe(true);

    const manifest = readJson(join(targetDir, "manifest.json")) as Record<
      string,
      unknown
    >;

    // concrete state for trivial-task and dependent-task
    const concrete = manifest.concrete as Record<string, unknown> | undefined;
    expect(concrete).toBeTruthy();
    expect(Object.keys(concrete!)).toContain("trivial-task");
    expect(Object.keys(concrete!)).toContain("dependent-task");

    // frontier state for unseeded-wbs
    const frontier = manifest.frontier as Record<string, unknown> | undefined;
    expect(frontier).toBeTruthy();
    expect(Object.keys(frontier!)).toContain("unseeded-wbs");

    // dependent-task's depends_on includes trivial-task
    const depTask = concrete!["dependent-task"] as {
      depends_on?: string[];
    };
    expect(depTask.depends_on).toContain("trivial-task");

    // metadata.frontier_count equals 1
    const metadata = manifest.metadata as { frontier_count?: number };
    expect(metadata.frontier_count).toBe(1);

    // No journal subdirs other than target/
    const journalRoot = join(FIXTURE, ".converge/journal/default");
    if (existsSync(journalRoot)) {
      const entries = readdirSync(journalRoot, { withFileTypes: true });
      const subdirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
      expect(subdirs).toEqual(["target"]);
    }
  });
});
