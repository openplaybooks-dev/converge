/**
 * Permanent regression gate — HKUDS DeepCode backend integration.
 *
 * Cheap tests validate config resolution and compile coverage. The real run is
 * opt-in because it requires DeepCode to be installed and configured locally.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync, execSync } from "node:child_process";
import { resolveAIConfig } from "@openplaybooks/converge-core";

const REPO_ROOT = resolve(__dirname, "..");
const CLI = resolve(REPO_ROOT, "packages/cli/dist/index.js");
const PROJECT_DIR = resolve(__dirname, "test-deepcode");
const PLAYBOOK_DIR = resolve(PROJECT_DIR, ".converge/playbooks/default");
const JOURNAL_DIR = resolve(PROJECT_DIR, ".converge/journal/default");

function cleanOutputs(): void {
  const fp = resolve(PROJECT_DIR, "DEEPCODE_READY.txt");
  if (existsSync(fp)) rmSync(fp);
}

function cleanJournal(): void {
  const jd = resolve(PROJECT_DIR, ".converge/journal");
  if (existsSync(jd)) rmSync(jd, { recursive: true, force: true });
}

function hasDeepCodeCommand(): boolean {
  if (process.env.DEEPCODE_COMMAND) return true;
  try {
    execSync("which deepcode", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const canRunReal =
  process.env.CONVERGE_REAL_DEEPCODE === "1" && hasDeepCodeCommand();

const describeReal = canRunReal ? describe : describe.skip;

describe("deepcode backend fixture", () => {
  it("resolves the DeepCode provider from a single-provider config", () => {
    const previous = process.env.DEEPCODE_CONFIG_PATH;
    process.env.DEEPCODE_CONFIG_PATH = "/tmp/deepcode_config.json";
    try {
      const resolved = resolveAIConfig({
        provider: "deepcode",
        env: { DEEPCODE_CONFIG_PATH: "{{DEEPCODE_CONFIG_PATH}}" },
      });

      expect(resolved).not.toBeNull();
      expect(resolved!.name).toBe("deepcode");
      expect(resolved!.resolvedProvider).toBe("deepcode");
      expect(resolved!.env!.DEEPCODE_CONFIG_PATH).toBe("/tmp/deepcode_config.json");
    } finally {
      if (previous === undefined) delete process.env.DEEPCODE_CONFIG_PATH;
      else process.env.DEEPCODE_CONFIG_PATH = previous;
    }
  });

  it("resolves the DeepCode provider from the provider key", () => {
    const resolved = resolveAIConfig(
      {
        default: "deepcode",
        providers: {
          deepcode: { provider: "deepcode" },
        },
      },
      "deepcode",
    );

    expect(resolved).not.toBeNull();
    expect(resolved!.name).toBe("deepcode");
    expect(resolved!.resolvedProvider).toBe("deepcode");
  });

  it("creates a deepcode-backed agentfn callable", async () => {
    const { agentfn } = await import("@openplaybooks/agentfn");
    const fn = agentfn({ provider: "deepcode", prompt: "test" });
    expect(typeof fn).toBe("function");
  });

  it("exports the DeepCode provider package API", async () => {
    const mod = await import("../packages/deepcodefn/dist/index.js");
    expect(typeof mod.deepcodefn).toBe("function");
    expect(typeof mod.executeViaCli).toBe("function");
    expect(typeof mod.resolveDeepCodeCommand).toBe("function");
    expect(typeof mod.GlobalQueue).toBe("function");
  });

  it("includes DeepCode in the init provider catalog", () => {
    const commandsTs = readFileSync(
      resolve(REPO_ROOT, "packages/cli/src/commands.ts"),
      "utf-8",
    );

    expect(commandsTs).toMatch(/"deepcode"/);
    expect(commandsTs).toContain("DeepCode (HKUDS CLI)");
    expect(commandsTs).toContain('case "deepcode"');
    expect(commandsTs).toContain("DEEPCODE_CONFIG_PATH");
  });

  it("compiles the fixture playbook", () => {
    cleanJournal();
    const result = spawnSync("node", [CLI, "compile", `--dir=${PLAYBOOK_DIR}`], {
      cwd: REPO_ROOT,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    });
    const out = (result.stdout || "") + (result.stderr || "");

    expect(out).toContain("Compiled");
    expect(out).toContain("1 nodes");
    expect(existsSync(resolve(JOURNAL_DIR, "manifest.json"))).toBe(true);

    const manifest = JSON.parse(
      readFileSync(resolve(JOURNAL_DIR, "manifest.json"), "utf-8"),
    );
    expect(manifest.nodes["deepcode-hello"]).toBeDefined();
  });
});

describeReal("deepcode real playbook run", () => {
  let runOutput = "";

  beforeAll(() => {
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

    const env = { ...process.env };
    if (process.env.DEEPCODE_COMMAND) {
      env.DEEPCODE_COMMAND = process.env.DEEPCODE_COMMAND;
    }

    const result = spawnSync("node", [CLI, "run", `--dir=${PROJECT_DIR}`], {
      cwd: REPO_ROOT,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
      env,
      timeout: 600_000,
    });

    runOutput = (result.stdout || "") + (result.stderr || "");
  }, 720_000);

  afterAll(() => {
    cleanJournal();
  });

  it("completes the DeepCode task", () => {
    expect(runOutput).toContain("Done: 1 ok, 0 failed");
  });

  it("uses the DeepCode provider", () => {
    expect(runOutput).toMatch(/AI Provider: deepcode \(deepcode\)/);
  });

  it("created the expected output file", () => {
    expect(readFileSync(resolve(PROJECT_DIR, "DEEPCODE_READY.txt"), "utf-8")).toContain(
      "deepcode-done",
    );
  });
});
