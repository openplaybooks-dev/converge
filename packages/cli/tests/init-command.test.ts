import { describe, it, expect, beforeAll } from "vitest";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, mkdtempSync } from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";

const REPO_ROOT = resolve(__dirname, "../../..");
const CLI = resolve(REPO_ROOT, "packages/cli/dist/index.js");

describe("converge init", () => {
  beforeAll(() => {
    if (!existsSync(CLI)) {
      throw new Error(
        `CLI build missing at ${CLI}. Run 'pnpm --filter @converge/cli build' first.`,
      );
    }
  });

  it("renders the requested provider template into .converge/project.yaml", () => {
    const tmp = mkdtempSync(join(tmpdir(), "converge-init-template-"));
    try {
      const result = spawnSync(
        "node",
        [CLI, "init", "--yes", "--name=my-project", "--provider-template=codex"],
        {
          cwd: tmp,
          encoding: "utf-8",
          stdio: ["ignore", "pipe", "pipe"],
          timeout: 30_000,
        },
      );

      expect(result.status).toBe(0);

      const projectYaml = readFileSync(join(tmp, ".converge", "project.yaml"), "utf-8");
      expect(projectYaml).toContain("name: my-project");
      expect(projectYaml).toContain("default: codex");
      expect(projectYaml).toContain("codex:");
      expect(projectYaml).toContain("provider: codex");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("lets custom provider templates select an explicit agent mix", () => {
    const tmp = mkdtempSync(join(tmpdir(), "converge-init-custom-"));
    try {
      const result = spawnSync(
        "node",
        [
          CLI,
          "init",
          "--yes",
          "--name=custom-project",
          "--provider-template=custom",
          "--agents=claude,codex",
          "--default-agent=codex",
        ],
        {
          cwd: tmp,
          encoding: "utf-8",
          stdio: ["ignore", "pipe", "pipe"],
          timeout: 30_000,
        },
      );

      expect(result.status).toBe(0);

      const projectYaml = readFileSync(join(tmp, ".converge", "project.yaml"), "utf-8");
      expect(projectYaml).toContain("name: custom-project");
      expect(projectYaml).toContain("default: codex");
      expect(projectYaml).toContain("claude:");
      expect(projectYaml).toContain("codex:");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
