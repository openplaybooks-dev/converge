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
        `CLI build missing at ${CLI}. Run 'pnpm --filter @openplaybooks/converge build' first.`,
      );
    }
  });

  it("scaffolds with the requested backend", () => {
    const tmp = mkdtempSync(join(tmpdir(), "converge-init-backend-"));
    try {
      const result = spawnSync(
        "node",
        [CLI, "init", "--yes", "--name=my-project", "--backend=codex"],
        {
          cwd: tmp,
          encoding: "utf-8",
          stdio: ["ignore", "pipe", "pipe"],
          timeout: 30_000,
        },
      );

      expect(result.status).toBe(0);

      const projectYaml = readFileSync(
        join(tmp, ".converge", "project.yaml"),
        "utf-8",
      );
      expect(projectYaml).toContain("name: my-project");
      expect(projectYaml).toContain("default: codex");
      expect(projectYaml).toContain("codex:");
      expect(projectYaml).toContain("provider: codex");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("bakes proxy-provider env block into project.yaml for --provider=minimax", () => {
    const tmp = mkdtempSync(join(tmpdir(), "converge-init-minimax-"));
    try {
      const result = spawnSync(
        "node",
        [
          CLI,
          "init",
          "--yes",
          "--name=mx",
          "--backend=claude",
          "--provider=minimax",
        ],
        {
          cwd: tmp,
          encoding: "utf-8",
          stdio: ["ignore", "pipe", "pipe"],
          timeout: 30_000,
        },
      );

      expect(result.status).toBe(0);

      const projectYaml = readFileSync(
        join(tmp, ".converge", "project.yaml"),
        "utf-8",
      );
      // YAML dumper may or may not quote string values depending on
      // version / scalar style; assert on the field+value pair regardless
      // of surrounding double quotes.
      expect(projectYaml).toMatch(
        /ANTHROPIC_BASE_URL: "?https:\/\/api\.minimax\.io\/anthropic"?/,
      );
      expect(projectYaml).toMatch(
        /ANTHROPIC_AUTH_TOKEN: "?\$\{MINIMAX_API_KEY\}"?/,
      );
      expect(projectYaml).toMatch(/ANTHROPIC_MODEL: "?MiniMax-M2\.7"?/);
      expect(projectYaml).toMatch(
        /CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "?1"?/,
      );
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("lets --agents select an explicit multi-backend mix", () => {
    const tmp = mkdtempSync(join(tmpdir(), "converge-init-multi-"));
    try {
      const result = spawnSync(
        "node",
        [
          CLI,
          "init",
          "--yes",
          "--name=custom-project",
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

      const projectYaml = readFileSync(
        join(tmp, ".converge", "project.yaml"),
        "utf-8",
      );
      expect(projectYaml).toContain("name: custom-project");
      expect(projectYaml).toContain("default: codex");
      expect(projectYaml).toContain("claude:");
      expect(projectYaml).toContain("codex:");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
