/**
 * Integration test — runs the test-codex-real converge project end-to-end.
 *
 * Verifies:
 *  - Codex backend is wired and can execute tasks
 *  - Codex agent can discover and load skills from .agents/skills/
 *
 * Requires `codex` CLI installed and authenticated.
 * Skips gracefully if the binary is absent.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = resolve(__dirname, "..");
const PROJECT_DIR = resolve(__dirname, "test-codex-real");
const CLI = resolve(REPO_ROOT, "packages/cli/dist/index.js");

const OUTPUT_FILES = ["READY.txt", "SKILL_LOADED.txt"];

function hasBinary(name: string): boolean {
  try {
    const result = spawnSync("which", [name], { stdio: "ignore" });
    return result.status === 0;
  } catch {
    return false;
  }
}

const describeReal = hasBinary("codex") ? describe : describe.skip;

function cleanup(): void {
  for (const f of OUTPUT_FILES) {
    const p = join(PROJECT_DIR, f);
    if (existsSync(p)) rmSync(p);
  }
  const journalDir = join(PROJECT_DIR, ".converge", "journal");
  if (existsSync(journalDir)) rmSync(journalDir, { recursive: true, force: true });
  const targetDir = join(PROJECT_DIR, ".converge", "target");
  if (existsSync(targetDir)) rmSync(targetDir, { recursive: true, force: true });
}

describeReal("test-codex-real — converge run", () => {
  beforeAll(() => {
    cleanup();
  });

  afterAll(() => {
    cleanup();
  });

  it(
    "completes the hello task: creates READY.txt with correct content",
    async () => {
      const result = spawnSync("node", [CLI, "run", "--select=hello"], {
        cwd: PROJECT_DIR,
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 180_000,
      });

      const output = (result.stdout || "") + (result.stderr || "");

      const readyPath = join(PROJECT_DIR, "READY.txt");
      expect(existsSync(readyPath), `READY.txt should exist\nOutput:\n${output}`).toBe(true);
      const content = readFileSync(readyPath, "utf-8").trim();
      expect(content, `READY.txt content mismatch\nOutput:\n${output}`).toBe("codex-ready");
    },
    240_000,
  );

  it(
    "skill-load task: codex agent loads and uses hello-checker skill",
    async () => {
      const result = spawnSync("node", [CLI, "run", "--select=skill-load"], {
        cwd: PROJECT_DIR,
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 180_000,
      });

      const output = (result.stdout || "") + (result.stderr || "");

      const skillPath = join(PROJECT_DIR, "SKILL_LOADED.txt");
      expect(
        existsSync(skillPath),
        `SKILL_LOADED.txt should exist (skill was loaded)\nOutput:\n${output}`,
      ).toBe(true);
      const content = readFileSync(skillPath, "utf-8").trim();
      expect(
        content.toUpperCase(),
        `Skill result should be PASS, got: "${content}"\nOutput:\n${output}`,
      ).toContain("PASS");
    },
    240_000,
  );
});
