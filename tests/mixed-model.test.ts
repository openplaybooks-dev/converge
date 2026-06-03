/**
 * End-to-end mixed-model integration test — Claude + Codex in one playbook.
 *
 * Verifies that two AI backends can run side-by-side in a single playbook:
 *  - Claude task creates CLAUDE_READY.txt (via claudefn → claude CLI)
 *  - Codex task creates CODEX_READY.txt (via codexfn → codex CLI)
 *
 * Both claudefn and codexfn spawn their respective CLI binaries and each
 * CLI handles its own auth (OAuth / env var). Skips if either CLI binary
 * is absent.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync, execSync } from "node:child_process";
import { resolveAIConfig } from "@openplaybooks/converge-core";

const REPO_ROOT = resolve(__dirname, "..");
const CLI = resolve(REPO_ROOT, "packages/cli/dist/index.js");
const PROJECT_DIR = resolve(__dirname, "test-mixed-model");

function cleanOutputs(): void {
  for (const f of ["CLAUDE_READY.txt", "CODEX_READY.txt"]) {
    const fp = resolve(PROJECT_DIR, f);
    if (existsSync(fp)) rmSync(fp);
  }
}

function cleanJournal(): void {
  const jd = resolve(PROJECT_DIR, ".converge/journal");
  if (existsSync(jd)) rmSync(jd, { recursive: true, force: true });
}

function hasRunnableBinary(name: string): boolean {
  try {
    execSync(`which ${name}`, { stdio: "ignore" });
    const probe = spawnSync(name, ["--version"], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 10_000,
    });
    return probe.status === 0;
  } catch {
    return false;
  }
}

const hasClaude = hasRunnableBinary("claude");
const hasCodex = hasRunnableBinary("codex");

// Real CLI invocation requires live API credentials and consumes time/money.
// Gate behind an explicit opt-in env var so default `vitest run` stays clean.
const runLive = process.env.CONVERGE_LIVE_AI === "1";
const describeReal =
  hasClaude && hasCodex && runLive ? describe : describe.skip;

describe("mixed-model provider configuration validation", () => {
  it("expands project.yaml-style double-curly environment references", () => {
    const previous = process.env.DEEPSEEK_API_KEY;
    process.env.DEEPSEEK_API_KEY = "test-deepseek-key";
    try {
      const resolved = resolveAIConfig({
        default: "claude",
        providers: {
          claude: {
            provider: "claude",
            env: {
              ANTHROPIC_AUTH_TOKEN: "{{DEEPSEEK_API_KEY}}",
              ANTHROPIC_BASE_URL: "https://api.deepseek.com/anthropic",
            },
          },
        },
      });

      expect(resolved).not.toBeNull();
      expect(resolved!.env!.ANTHROPIC_AUTH_TOKEN).toBe("test-deepseek-key");
      expect(resolved!.env!.ANTHROPIC_AUTH_TOKEN).not.toBe(
        "{{DEEPSEEK_API_KEY}}",
      );
      expect(resolved!.env!.ANTHROPIC_BASE_URL).toBe(
        "https://api.deepseek.com/anthropic",
      );
    } finally {
      if (previous === undefined) {
        delete process.env.DEEPSEEK_API_KEY;
      } else {
        process.env.DEEPSEEK_API_KEY = previous;
      }
    }
  });

  it("names the invalid provider and available remediation choices", () => {
    const warn = console.warn;
    const messages: string[] = [];
    console.warn = (...args: unknown[]) =>
      messages.push(args.map(String).join(" "));
    try {
      const resolved = resolveAIConfig(
        {
          default: "missing-provider",
          providers: {
            claude: { provider: "claude" },
            codex: { provider: "codex" },
          },
        },
        "missing-provider",
      );

      expect(resolved).toBeNull();
      expect(messages.join("\n")).toContain(
        "Provider 'missing-provider' not found",
      );
      expect(messages.join("\n")).toContain(
        "Available providers: claude, codex",
      );
    } finally {
      console.warn = warn;
    }
  });
});

describeReal("mixed-model — Claude + Codex in one playbook", () => {
  let runOutput = "";

  beforeAll(() => {
    cleanOutputs();
    cleanJournal();

    // Compile first — run reads from manifest
    const playbookDir = resolve(PROJECT_DIR, ".converge/playbooks/default");
    const manifestPath = resolve(
      PROJECT_DIR,
      ".converge/journal/default/manifest.json",
    );

    const compileResult = spawnSync(
      "node",
      [CLI, "compile", `--dir=${playbookDir}`],
      {
        cwd: REPO_ROOT,
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env },
      },
    );

    if (!existsSync(manifestPath)) {
      const compileOut =
        (compileResult.stdout || "") + (compileResult.stderr || "");
      console.error("=== compile failed ===");
      console.error(compileOut.slice(-2000));
      throw new Error(`Compile did not produce manifest at ${manifestPath}`);
    }

    const result = spawnSync("node", [CLI, "run", `--dir=${PROJECT_DIR}`], {
      cwd: REPO_ROOT,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
      timeout: 180_000,
    });

    runOutput = (result.stdout || "") + (result.stderr || "");
  }, 300_000);

  afterAll(() => {
    cleanJournal();
  });

  it("completes with 2 ok", () => {
    expect(runOutput).toContain("Done: 2 ok, 0 failed");
  });

  it("claude task used claude provider", () => {
    // The agent-runner logs the resolved provider to stderr
    expect(runOutput).toMatch(/AI Provider: claude \(claude\)/);
  });

  it("codex task used codex provider", () => {
    expect(runOutput).toMatch(/AI Provider: codex \(codex\)/);
  });

  it("created CLAUDE_READY.txt with correct content", () => {
    const content = readFileSync(
      resolve(PROJECT_DIR, "CLAUDE_READY.txt"),
      "utf-8",
    ).trim();
    expect(content).toContain("claude-done");
  });

  it("created CODEX_READY.txt with correct content", () => {
    const content = readFileSync(
      resolve(PROJECT_DIR, "CODEX_READY.txt"),
      "utf-8",
    ).trim();
    expect(content).toContain("codex-done");
  });
});
