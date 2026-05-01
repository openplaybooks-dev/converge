/**
 * Red — `converge build` does not exist yet, so the subprocess errors out.
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

describe("converge build", () => {
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

  it("exits non-zero on first uncorrectable failure (RED — command not yet implemented)", () => {
    execFileSync("node", [CLI, "build", "--dir", FIXTURE], {
      cwd: REPO_ROOT,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    targetDir = join(FIXTURE, "target");
    expect(existsSync(join(targetDir, "manifest.json"))).toBe(true);
    expect(readJson(join(targetDir, "manifest.json"))).toBeTruthy();
  });

  it("build --select tag:trivial succeeds when trivial-task succeeds (RED — command not yet implemented)", () => {
    execFileSync("node", [CLI, "build", "--dir", FIXTURE, "--select", "tag:trivial"], {
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
    const concrete = manifest.concrete as Record<string, unknown> | undefined;
    expect(concrete).toBeTruthy();
    expect(Object.keys(concrete!)).toContain("trivial-task");
  });
});
