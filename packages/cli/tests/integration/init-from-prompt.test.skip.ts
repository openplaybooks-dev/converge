/**
 * Red — `converge init --from-prompt` does not exist yet.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

const REPO_ROOT = resolve(__dirname, "../../../..");
const CLI = resolve(REPO_ROOT, "packages/cli/dist/index.js");

describe("converge init --from-prompt", () => {
  beforeAll(() => {
    if (!existsSync(CLI)) {
      throw new Error(
        `CLI build missing at ${CLI}. Run 'pnpm --filter @converge/cli build' first.`,
      );
    }
  });

  it("scaffolds .converge/ with project.yaml and a default playbook (RED — command not yet implemented)", () => {
    const tmp = mkdtempSync(`${tmpdir()}/converge-init-prompt-`);
    try {
      const result = spawnSync("node", [CLI, "init", "--from-prompt", "build a todo app", "--yes"], {
        cwd: tmp,
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "pipe"],
      });

      expect(result.status).toBe(0);

      const projectYaml = resolve(tmp, ".converge", "project.yaml");
      expect(existsSync(projectYaml)).toBe(true);

      const playbookYml = resolve(tmp, ".converge", "playbooks", "default", "playbook.yml");
      expect(existsSync(playbookYml)).toBe(true);

      // Should contain tasks derived from the prompt (at least one TASK.md)
      const tasksDir = resolve(tmp, ".converge", "playbooks", "default", "tasks");
      expect(existsSync(tasksDir)).toBe(true);
      const entries = readdirSync(tasksDir, { withFileTypes: true });
      const taskDirs = entries.filter((e) => {
        if (!e.isDirectory()) return false;
        return existsSync(join(tasksDir, e.name, "TASK.md"));
      });
      expect(taskDirs.length).toBeGreaterThan(0);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }, 30000);
});
