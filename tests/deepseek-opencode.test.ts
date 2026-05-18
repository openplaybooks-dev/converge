/**
 * DeepSeek + Opencode playbook fixture tests.
 *
 * This file keeps a cheap validation path in CI (config resolution + compile)
 * and exposes an opt-in real run for local smoke testing with real credentials.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { existsSync, lstatSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawn, spawnSync, execSync } from "node:child_process";
import { resolveAIConfig } from "@openplaybooks/converge-core";

const REPO_ROOT = resolve(__dirname, "..");
const CLI = resolve(REPO_ROOT, "packages/cli/dist/index.js");
const PROJECT_DIR = resolve(__dirname, "test-deepseek-opencode");
const PLAYBOOK_DIR = resolve(PROJECT_DIR, ".converge/playbooks/default");
const JOURNAL_DIR = resolve(PROJECT_DIR, ".converge/journal/default");

function cleanOutputs(): void {
  for (const f of ["DEEPSEEK_READY.txt", "OPENCODE_READY.txt"]) {
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

function hasOpencodeServer(): boolean {
  const probe = spawnSync(
    process.execPath,
    [
      "-e",
      `fetch('http://localhost:4096').then(r=>process.exit(r.status>=200?0:1)).catch(()=>process.exit(1))`,
    ],
    { timeout: 5_000, stdio: "ignore" },
  );
  return probe.status === 0;
}

const canRunReal =
  process.env.CONVERGE_REAL_DEEPSEEK_OPENCODE === "1" &&
  !!(process.env.DEEPSEEK_API_KEY || process.env.ANTHROPIC_API_KEY) &&
  hasRunnableBinary("claude") &&
  hasOpencodeServer();

const describeReal = canRunReal ? describe : describe.skip;
const realDeepSeekApiKey =
  process.env.ANTHROPIC_API_KEY || process.env.DEEPSEEK_API_KEY;
const realRunEnv = realDeepSeekApiKey
  ? {
      ...process.env,
      DEEPSEEK_API_KEY: realDeepSeekApiKey,
      ANTHROPIC_API_KEY: realDeepSeekApiKey,
    }
  : process.env;

function spawnCollect(
  command: string,
  args: string[],
  options: { cwd: string; env?: NodeJS.ProcessEnv; timeout?: number },
): Promise<{ stdout: string; stderr: string; status: number | null; signal: NodeJS.Signals | null }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    const timer = options.timeout
      ? setTimeout(() => {
          child.kill("SIGTERM");
          reject(new Error(`${command} ${args.join(" ")} timed out after ${options.timeout}ms`));
        }, options.timeout)
      : undefined;

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      if (timer) clearTimeout(timer);
      reject(error);
    });
    child.on("close", (status, signal) => {
      if (timer) clearTimeout(timer);
      resolve({ stdout, stderr, status, signal });
    });
  });
}

describe("deepseek + opencode playbook fixture", () => {
  it("resolves the DeepSeek-through-Claude provider like project.yaml", () => {
    const previous = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = "test-deepseek-key";
    try {
      const resolved = resolveAIConfig(
        {
          default: "deepseek",
          providers: {
            deepseek: {
              provider: "claude",
              env: {
                ANTHROPIC_BASE_URL: "https://api.deepseek.com/anthropic",
                ANTHROPIC_API_KEY: "{{ANTHROPIC_API_KEY}}",
                ANTHROPIC_MODEL: "deepseek-v4-pro[1m]",
              },
            },
            openfn: {
              baseUrl: "http://localhost:4096",
              model: "deepseek/deepseek-chat",
              apiKey: "{{DEEPSEEK_API_KEY}}",
            },
          },
        },
        "deepseek",
      );

      expect(resolved).not.toBeNull();
      expect(resolved!.name).toBe("deepseek");
      expect(resolved!.resolvedProvider).toBe("claude");
      expect(resolved!.env!.ANTHROPIC_BASE_URL).toBe(
        "https://api.deepseek.com/anthropic",
      );
      expect(resolved!.env!.ANTHROPIC_API_KEY).toBe("test-deepseek-key");
      expect(resolved!.env!.ANTHROPIC_MODEL).toBe("deepseek-v4-pro[1m]");
    } finally {
      if (previous === undefined) delete process.env.ANTHROPIC_API_KEY;
      else process.env.ANTHROPIC_API_KEY = previous;
    }
  });

  it("resolves the Opencode/openfn provider from the provider key", () => {
    const previous = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = "test-deepseek-key";
    try {
      const resolved = resolveAIConfig(
        {
          default: "deepseek",
          providers: {
            deepseek: { provider: "claude" },
            openfn: {
              baseUrl: "http://localhost:4096",
              model: "deepseek/deepseek-chat",
              apiKey: "{{ANTHROPIC_API_KEY}}",
            },
          },
        },
        "openfn",
      );

      expect(resolved).not.toBeNull();
      expect(resolved!.name).toBe("openfn");
      expect(resolved!.resolvedProvider).toBe("openfn");
      expect(resolved!.baseUrl).toBe("http://localhost:4096");
      expect(resolved!.model).toBe("deepseek/deepseek-chat");
      expect(resolved!.apiKey).toBe("test-deepseek-key");
    } finally {
      if (previous === undefined) delete process.env.ANTHROPIC_API_KEY;
      else process.env.ANTHROPIC_API_KEY = previous;
    }
  });

  it("compiles the fixture playbook", () => {
    cleanJournal();
    const result = spawnSync("node", [CLI, "compile", `--dir=${PLAYBOOK_DIR}`], {
      cwd: REPO_ROOT,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
      env: realRunEnv,
    });
    const out = (result.stdout || "") + (result.stderr || "");

    expect(out).toContain("Compiled");
    expect(out).toContain("2 nodes");
    expect(existsSync(resolve(JOURNAL_DIR, "manifest.json"))).toBe(true);

    const manifest = JSON.parse(
      readFileSync(resolve(JOURNAL_DIR, "manifest.json"), "utf-8"),
    );
    expect(manifest.nodes["deepseek-hello"]).toBeDefined();
    expect(manifest.nodes["opencode-hello"]).toBeDefined();
  });

  it("links Converge skills into OpenCode and Claude-compatible discovery roots", async () => {
    const { agentfn } = await import("@openplaybooks/converge-agentfn");
    const skillRoot = resolve(PROJECT_DIR, ".converge/skills");
    const skillDir = resolve(skillRoot, "opencode-smoke");
    const openCodeLink = resolve(PROJECT_DIR, ".opencode/skills/opencode-smoke");
    const claudeLink = resolve(PROJECT_DIR, ".claude/skills/opencode-smoke");

    rmSync(resolve(PROJECT_DIR, ".opencode"), { recursive: true, force: true });
    rmSync(resolve(PROJECT_DIR, ".claude"), { recursive: true, force: true });
    rmSync(skillRoot, { recursive: true, force: true });
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(
      resolve(skillDir, "SKILL.md"),
      `---\nname: opencode-smoke\ndescription: Verify OpenCode native skill discovery wiring\ncompatibility: opencode\n---\n\nWhen loaded, this skill proves discovery works.\n`,
    );

    let observedDuringCall = false;
    const fn = agentfn({
      provider: "openfn",
      prompt: "noop",
      cwd: PROJECT_DIR,
      skillsRoot: skillRoot,
      skills: ["opencode-smoke"],
      hooks: {
        before: ({ prompt }) => {
          observedDuringCall =
            lstatSync(openCodeLink).isSymbolicLink() &&
            lstatSync(claudeLink).isSymbolicLink();
          return prompt;
        },
      },
    });

    try {
      await fn();
    } catch {
      // The assertion is about filesystem skill discovery wiring, not the
      // availability of a local OpenCode server in the cheap CI path.
    }
    expect(observedDuringCall).toBe(true);
    expect(existsSync(openCodeLink)).toBe(false);
    expect(existsSync(claudeLink)).toBe(false);

    rmSync(skillRoot, { recursive: true, force: true });
  });
});

describeReal("deepseek + opencode real playbook run", () => {
  let runOutput = "";

  beforeAll(async () => {
    cleanOutputs();
    cleanJournal();

    const compileResult = spawnSync("node", [CLI, "compile", `--dir=${PLAYBOOK_DIR}`], {
      cwd: REPO_ROOT,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    });

    if (!existsSync(resolve(JOURNAL_DIR, "manifest.json"))) {
      const compileOut = (compileResult.stdout || "") + (compileResult.stderr || "");
      throw new Error(`Compile did not produce manifest:\n${compileOut.slice(-2000)}`);
    }

    const result = await spawnCollect("node", [CLI, "run", `--dir=${PROJECT_DIR}`], {
      cwd: REPO_ROOT,
      env: realRunEnv,
      timeout: 300_000,
    });

    runOutput = (result.stdout || "") + (result.stderr || "");
  }, 420_000);

  afterAll(() => {
    cleanJournal();
  });

  it("completes without failed tasks", () => {
    expect(runOutput).toMatch(/Done: \d+ ok, 0 failed/);
  });

  it("uses DeepSeek via the Claude provider", () => {
    expect(runOutput).toMatch(/AI Provider: deepseek \(claude\)/);
  });

  it("uses the Opencode\/openfn provider", () => {
    expect(runOutput).toMatch(/AI Provider: openfn \(openfn\)/);
  });

  it("created both expected output files", () => {
    expect(readFileSync(resolve(PROJECT_DIR, "DEEPSEEK_READY.txt"), "utf-8")).toContain(
      "deepseek-done",
    );
    expect(readFileSync(resolve(PROJECT_DIR, "OPENCODE_READY.txt"), "utf-8")).toContain(
      "opencode-done",
    );
  });
});
