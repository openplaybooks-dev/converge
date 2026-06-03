/**
 * `converge add` — create a playbook from prompt, example, or GitHub.
 *
 * Requires `.converge/project.yaml` to exist (run `converge init` first).
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { copyFile, mkdir, readdir, readFile, rm } from "node:fs/promises";
import { join, resolve, basename } from "node:path";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";
import type { CommonOptions } from "./commands.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AddOptions extends CommonOptions {
  /** Playbook name (default: inferred from source). */
  name?: string;
  /** LLM prompt to generate a playbook. */
  fromPrompt?: string;
  /** Name of a built-in example to copy. */
  fromExample?: string;
  /** GitHub user/repo or URL to clone. */
  fromGithub?: string;
  /** Launch the browser studio instead of the CLI prompt flow. */
  ui?: boolean;
  /** Optional port for the browser studio. */
  port?: number;
  /** Overwrite existing playbook directory. */
  force?: boolean;
}

interface ExampleEntry {
  description: string;
  playbookName: string;
  hasApiKeys: boolean;
}

interface ExamplesCatalog {
  version: number;
  examples: Record<string, ExampleEntry>;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function addCommand(options: AddOptions = {}): Promise<void> {
  const projectDir = resolve(options.dir || process.cwd());
  const convergeDir = join(projectDir, ".converge");

  // 1. Guard: converge init must have been run first
  const projectYml = join(convergeDir, "project.yml");
  const projectYaml = join(convergeDir, "project.yaml");
  if (!existsSync(projectYml) && !existsSync(projectYaml)) {
    console.error(
      "❌ No .converge/project.yaml found. Run `converge init` first.",
    );
    process.exit(1);
  }

  // 2. Validate at most one source flag
  const sourceFlags = [
    options.fromPrompt,
    options.fromExample,
    options.fromGithub,
  ].filter(Boolean);
  if (sourceFlags.length > 1) {
    console.error(
      "❌ Only one of --from-prompt, --from-example, --from-github can be used.",
    );
    process.exit(1);
  }

  // 3. Dispatch
  if (options.ui) {
    // Normally handled by the early dispatch in main.ts (so it can own SIGINT);
    // delegate here too as a defensive fallback for direct callers.
    const { studioCommand } = await import("./commands-studio.ts");
    await studioCommand({
      port: options.port,
      dir: projectDir,
      open: true,
    });
    return;
  }

  if (options.fromPrompt) {
    await fromPromptSource(projectDir, options);
  } else if (options.fromExample) {
    await fromExampleSource(projectDir, options);
  } else if (options.fromGithub) {
    await fromGithubSource(projectDir, options);
  } else {
    await interactiveSource(projectDir, options);
  }
}

// ---------------------------------------------------------------------------
// Source: --from-prompt
// ---------------------------------------------------------------------------

async function fromPromptSource(
  projectDir: string,
  options: AddOptions,
): Promise<void> {
  const playbookName =
    options.name?.trim() || slugifyPrompt(options.fromPrompt!);
  const playbookDir = join(projectDir, ".converge", "playbooks", playbookName);

  if (existsSync(join(playbookDir, "playbook.yml"))) {
    if (!options.force) {
      console.error(
        `❌ Playbook "${playbookName}" already exists. Use --force to overwrite.`,
      );
      process.exit(1);
    }
    await rm(playbookDir, { recursive: true, force: true });
  }

  mkdirSync(playbookDir, { recursive: true });

  // Scaffold a minimal playbook.yml so analyzeRoot has a playbook root
  writeFileSync(
    join(playbookDir, "playbook.yml"),
    renderPlaybookYml({ name: playbookName }),
    "utf8",
  );

  console.log(`\n📋 Planning from prompt: "${options.fromPrompt}"\n`);

  try {
    const { analyzeRoot, implementStructurePhase } =
      await import("@openplaybooks/converge-core/planning/progressive-decomposition/index.ts");

    const meta = await analyzeRoot({
      nodePath: playbookDir,
      nodeKind: "playbook-root",
      playbookRoot: playbookDir,
      projectDir,
      prompt: options.fromPrompt,
      update: false,
    });

    await implementStructurePhase(
      {
        nodePath: playbookDir,
        nodeKind: "playbook-root",
        playbookRoot: playbookDir,
        projectDir,
        update: false,
      },
      meta,
    );

    const staticCount =
      meta.children?.filter((c) => c.kind !== "seed").length ?? 0;
    const seedCount =
      meta.children?.filter((c) => c.kind === "seed").length ?? 0;
    console.log(
      `\n✅ Playbook "${playbookName}": ${meta.children?.length ?? 0} top-level tasks` +
        ` (${staticCount} static, ${seedCount} seeds)`,
    );
    if (existsSync(join(playbookDir, "PLAN.md"))) {
      console.log(`   📋 .converge/playbooks/${playbookName}/PLAN.md`);
    }
  } catch (err: any) {
    console.error(`\n❌ Planning failed: ${err.message}`);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Source: --from-example
// ---------------------------------------------------------------------------

async function fromExampleSource(
  projectDir: string,
  options: AddOptions,
): Promise<void> {
  const catalog = await loadExamplesCatalog(projectDir);
  const exampleName = options.fromExample!;
  const entry = catalog.examples[exampleName];

  if (!entry) {
    const available = Object.keys(catalog.examples).sort();
    console.error(`❌ Unknown example "${exampleName}".`);
    console.error(`   Available: ${available.join(", ")}`);
    process.exit(1);
  }

  const playbookName = options.name?.trim() || entry.playbookName;
  const playbookDir = join(projectDir, ".converge", "playbooks", playbookName);

  if (existsSync(join(playbookDir, "playbook.yml"))) {
    if (!options.force) {
      console.error(
        `❌ Playbook "${playbookName}" already exists. Use --force to overwrite.`,
      );
      process.exit(1);
    }
    await rm(playbookDir, { recursive: true, force: true });
  }

  mkdirSync(playbookDir, { recursive: true });

  // Try local examples directory first (development), then GitHub raw
  const localExamplesDir = findLocalExamplesDir();
  let srcDir: string | null = null;
  let tmpDir: string | null = null;

  if (
    localExamplesDir &&
    existsSync(join(localExamplesDir, exampleName, ".converge"))
  ) {
    srcDir = join(localExamplesDir, exampleName, ".converge");
  } else {
    // Download from GitHub raw
    console.log(`   Downloading example "${exampleName}"...`);
    tmpDir = join(tmpdir(), `converge-example-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    await downloadExampleFromGitHub(exampleName, tmpDir);
    srcDir = tmpDir;
  }

  try {
    // Determine the source playbook directory inside .converge/playbooks/
    const srcPlaybooksDir = join(srcDir!, "playbooks");
    if (!existsSync(srcPlaybooksDir)) {
      console.error("❌ Example has no playbooks directory.");
      process.exit(1);
    }

    // Find which playbook to copy (match entry.playbookName or take first)
    const srcPlaybookName = findPlaybookInDir(
      srcPlaybooksDir,
      entry.playbookName,
    );
    if (!srcPlaybookName) {
      console.error("❌ No playbook found in example.");
      process.exit(1);
    }

    const srcPlaybookDir = join(srcPlaybooksDir, srcPlaybookName);

    // Copy playbook, filtering out runtime state
    const skipDirs = new Set(["inventory", "journal", "logs", "cache"]);
    await copyDirFiltered(srcPlaybookDir, playbookDir, skipDirs);

    // Sanitize API keys
    if (entry.hasApiKeys) {
      await sanitizeApiKeysInDir(playbookDir);
    }

    console.log(
      `✅ Example "${exampleName}" installed as playbook "${playbookName}"`,
    );
  } finally {
    if (tmpDir) {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

// ---------------------------------------------------------------------------
// Source: --from-github
// ---------------------------------------------------------------------------

async function fromGithubSource(
  projectDir: string,
  options: AddOptions,
): Promise<void> {
  const ref = options.fromGithub!;
  let repoUrl: string;
  let subpath = ".converge";

  if (ref.includes("://") || ref.startsWith("git@")) {
    repoUrl = ref;
  } else if (ref.includes("/")) {
    const parts = ref.split("/");
    repoUrl = `https://github.com/${parts[0]}/${parts[1]}.git`;
    if (parts.length > 2) {
      subpath = parts.slice(2).join("/");
    }
  } else {
    console.error("❌ Invalid GitHub reference. Use user/repo or full URL.");
    process.exit(1);
  }

  const playbookName =
    options.name?.trim() ||
    ref
      .replace(/\.git$/, "")
      .split("/")
      .pop()!
      .replace(/[^a-zA-Z0-9_.-]/g, "-");

  const playbookDir = join(projectDir, ".converge", "playbooks", playbookName);

  if (existsSync(join(playbookDir, "playbook.yml"))) {
    if (!options.force) {
      console.error(
        `❌ Playbook "${playbookName}" already exists. Use --force to overwrite.`,
      );
      process.exit(1);
    }
    await rm(playbookDir, { recursive: true, force: true });
  }

  mkdirSync(playbookDir, { recursive: true });

  const tmpDir = join(tmpdir(), `converge-gh-${Date.now()}`);

  try {
    console.log(`   Cloning ${repoUrl}...`);
    execSync(`git clone --depth 1 --single-branch "${repoUrl}" "${tmpDir}"`, {
      stdio: "pipe",
      timeout: 60_000,
    });

    const srcDir = join(tmpDir, subpath);
    if (!existsSync(srcDir)) {
      console.error(`❌ Path "${subpath}" not found in repository.`);
      process.exit(1);
    }

    // Determine if we got a .converge/ dir, a playbook dir, or something else
    const isConvergeDir =
      existsSync(join(srcDir, "project.yml")) ||
      existsSync(join(srcDir, "project.yaml"));

    const skipDirs = new Set(["inventory", "journal", "logs", "cache"]);

    if (isConvergeDir) {
      // srcDir is a .converge/ directory — look for playbooks inside
      const pbDir = join(srcDir, "playbooks");
      if (!existsSync(pbDir)) {
        console.error("❌ Repository has no playbooks/ directory.");
        process.exit(1);
      }
      const entries = readdirSync(pbDir, { withFileTypes: true }).filter(
        (e) =>
          e.isDirectory() &&
          (existsSync(join(pbDir, e.name, "playbook.yml")) ||
            existsSync(join(pbDir, e.name, "playbook.yaml"))),
      );
      if (entries.length === 0) {
        console.error("❌ No playbooks found in repository.");
        process.exit(1);
      }
      const srcPbName = entries[0].name;
      await copyDirFiltered(join(pbDir, srcPbName), playbookDir, skipDirs);
    } else {
      // srcDir might be a playbook directory itself
      await copyDirFiltered(srcDir, playbookDir, skipDirs);
    }

    // Sanitize any API keys found
    await sanitizeApiKeysInDir(playbookDir);

    console.log(`✅ Playbook "${playbookName}" created from GitHub`);
  } catch (err: any) {
    if (err.stderr) {
      console.error(`❌ Clone failed: ${err.stderr.toString()}`);
    } else {
      console.error(`❌ ${err.message}`);
    }
    process.exit(1);
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Interactive mode
// ---------------------------------------------------------------------------

async function interactiveSource(
  projectDir: string,
  options: AddOptions,
): Promise<void> {
  const p = await import("@clack/prompts");

  p.intro("Create a new playbook");

  const sourceType = await p.select({
    message: "How do you want to create this playbook?",
    options: [
      {
        value: "prompt",
        label: "Describe what you want",
        hint: "AI generates the playbook structure",
      },
      {
        value: "example",
        label: "Start from a built-in example",
        hint: "Copy an example playbook",
      },
      {
        value: "github",
        label: "Clone from GitHub",
        hint: "user/repo or full URL",
      },
    ],
  });

  if (p.isCancel(sourceType)) {
    p.cancel("Aborted.");
    process.exit(0);
  }

  const playbookName =
    options.name?.trim() ||
    ((await p.text({
      message: "Playbook name",
      placeholder: "my-playbook",
      defaultValue: "my-playbook",
      validate: (v: string) => {
        const t = v.trim();
        if (!t) return "Name is required.";
        if (!/^[a-zA-Z0-9_.-]+$/.test(t))
          return "Use letters, numbers, dashes, dots, or underscores only.";
        return undefined;
      },
    })) as string);

  if (p.isCancel(playbookName as any)) {
    p.cancel("Aborted.");
    process.exit(0);
  }

  switch (sourceType) {
    case "prompt": {
      const promptText = (await p.text({
        message: "What should the playbook do?",
        placeholder: "e.g., Build a REST API with user auth",
      })) as string;
      if (p.isCancel(promptText as any)) {
        p.cancel("Aborted.");
        process.exit(0);
      }
      await fromPromptSource(projectDir, {
        ...options,
        fromPrompt: promptText?.trim(),
        name: playbookName?.trim(),
      });
      break;
    }
    case "example": {
      const catalog = await loadExamplesCatalog(projectDir);
      const choices = Object.entries(catalog.examples).map(([name, entry]) => ({
        value: name,
        label: name,
        hint: entry.description.slice(0, 60),
      }));
      const exampleName = await p.select({
        message: "Choose an example",
        options: choices,
      });
      if (p.isCancel(exampleName)) {
        p.cancel("Aborted.");
        process.exit(0);
      }
      await fromExampleSource(projectDir, {
        ...options,
        fromExample: exampleName as string,
        name: playbookName?.trim(),
      });
      break;
    }
    case "github": {
      const ghRef = (await p.text({
        message: "GitHub repository",
        placeholder: "user/repo",
      })) as string;
      if (p.isCancel(ghRef as any)) {
        p.cancel("Aborted.");
        process.exit(0);
      }
      await fromGithubSource(projectDir, {
        ...options,
        fromGithub: ghRef?.trim(),
        name: playbookName?.trim(),
      });
      break;
    }
  }

  p.outro("Done.");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Render a minimal playbook.yml for new playbooks. */
function renderPlaybookYml(args: { name: string }): string {
  return [
    `name: ${args.name}`,
    "",
    "run:",
    "  mode: autonomous",
    "  maxTaskAttempts: 3",
    "  resume: true",
    "",
  ].join("\n");
}

/** Slugify a prompt into a playbook name (first 3 words, max 40 chars). */
function slugifyPrompt(prompt: string): string {
  return (
    prompt
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .split(/\s+/)
      .slice(0, 3)
      .join("-")
      .slice(0, 40)
      .replace(/^-+|-+$/g, "") || "my-playbook"
  );
}

/**
 * Load the examples catalog. Tries:
 * 1. Bundled JSON (for production installs)
 * 2. Local examples/ directory (for development)
 */
async function loadExamplesCatalog(
  _projectDir: string,
): Promise<ExamplesCatalog> {
  // Try the bundled catalog first
  try {
    const catalogPath = join(__dirname, "examples-catalog.json");
    if (existsSync(catalogPath)) {
      return JSON.parse(readFileSync(catalogPath, "utf8"));
    }
  } catch {
    // Fall through to local discovery
  }

  // Fallback: build from local examples directory (development mode)
  const localDir = findLocalExamplesDir();
  if (localDir && existsSync(localDir)) {
    return buildCatalogFromDir(localDir);
  }

  console.error(
    "❌ Examples catalog not found. Reinstall @openplaybooks/converge.",
  );
  process.exit(1);
}

/** Find the local examples/ directory (development mode). */
function findLocalExamplesDir(): string | null {
  // Walk up from __dirname looking for examples/
  let dir = __dirname;
  for (let i = 0; i < 6; i++) {
    const candidate = join(dir, "examples");
    if (existsSync(candidate)) return candidate;
    dir = join(dir, "..");
  }
  return null;
}

/** Build a catalog by scanning a local examples/ directory. */
function buildCatalogFromDir(examplesDir: string): ExamplesCatalog {
  const examples: Record<string, ExampleEntry> = {};

  for (const entry of readdirSync(examplesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const convergeDir = join(examplesDir, entry.name, ".converge");
    if (!existsSync(convergeDir)) continue;

    // Find playbook name
    const playbooksDir = join(convergeDir, "playbooks");
    let playbookName = "default";
    if (existsSync(playbooksDir)) {
      const pbs = readdirSync(playbooksDir, { withFileTypes: true }).filter(
        (e) => e.isDirectory(),
      );
      if (pbs.length > 0) playbookName = pbs[0].name;
    }

    // Read description from project.yaml
    let description = "";
    for (const fn of ["project.yaml", "project.yml"]) {
      const p = join(convergeDir, fn);
      if (existsSync(p)) {
        try {
          const { parse } = require("yaml") as typeof import("yaml");
          const c = parse(readFileSync(p, "utf8"));
          description = typeof c?.description === "string" ? c.description : "";
        } catch {
          /* ignore */
        }
        break;
      }
    }

    // Check for hardcoded API keys
    let hasApiKeys = false;
    try {
      const files = readdirSync(convergeDir, {
        recursive: true,
        withFileTypes: true,
      });
      for (const f of files) {
        if (!f.isFile()) continue;
        if (f.name.endsWith(".yml") || f.name.endsWith(".yaml")) {
          const content = readFileSync(
            join(f.parentPath ?? convergeDir, f.name),
            "utf8",
          );
          if (/\bsk-[a-zA-Z0-9_-]{20,}\b/.test(content)) {
            hasApiKeys = true;
            break;
          }
        }
      }
    } catch {
      /* ignore */
    }

    examples[entry.name] = { description, playbookName, hasApiKeys };
  }

  return { version: 1, examples };
}

/**
 * Download an example's .converge/ directory from GitHub raw.
 * Fetches the tarball of the examples/<name>/ directory.
 */
async function downloadExampleFromGitHub(
  exampleName: string,
  destDir: string,
): Promise<void> {
  const url = `https://api.github.com/repos/openplaybooks-dev/converge/contents/examples/${exampleName}/.converge`;
  const headers: Record<string, string> = {
    "User-Agent": "converge-cli",
    Accept: "application/vnd.github.v3+json",
  };
  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  // Use git clone --depth 1 --filter=blob:none --sparse for the single directory
  const tmpClone = join(tmpdir(), `converge-ex-clone-${Date.now()}`);
  try {
    execSync(
      `git clone --depth 1 --filter=blob:none --sparse https://github.com/openplaybooks-dev/converge.git "${tmpClone}"`,
      { stdio: "pipe", timeout: 60_000 },
    );
    execSync(
      `git -C "${tmpClone}" sparse-checkout set "examples/${exampleName}/.converge"`,
      { stdio: "pipe", timeout: 10_000 },
    );
    // Copy the .converge directory
    const srcConverge = join(tmpClone, "examples", exampleName, ".converge");
    if (!existsSync(srcConverge)) {
      throw new Error(`Example "${exampleName}" not found in repository.`);
    }
    await copyDirFiltered(srcConverge, destDir, new Set());
  } finally {
    await rm(tmpClone, { recursive: true, force: true }).catch(() => {});
  }
}

/** Find a playbook directory by name, or return the first available. */
function findPlaybookInDir(
  playbooksDir: string,
  preferredName: string,
): string | null {
  const entries = readdirSync(playbooksDir, { withFileTypes: true }).filter(
    (e) => e.isDirectory(),
  );
  if (entries.length === 0) return null;

  // Prefer exact match
  const match = entries.find((e) => e.name === preferredName);
  if (match) return match.name;

  return entries[0].name;
}

/**
 * Recursively copy a directory, skipping specified subdirectory names.
 */
async function copyDirFiltered(
  src: string,
  dest: string,
  skipDirs: Set<string>,
): Promise<void> {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    if (skipDirs.has(entry.name)) continue;
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDirFiltered(srcPath, destPath, skipDirs);
    } else {
      await copyFile(srcPath, destPath);
    }
  }
}

/**
 * Replace hardcoded API keys in YAML files with ${VAR} placeholders.
 */
async function sanitizeApiKeysInDir(dir: string): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      await sanitizeApiKeysInDir(fullPath);
    } else if (entry.name.endsWith(".yml") || entry.name.endsWith(".yaml")) {
      let content = await readFile(fullPath, "utf8");

      // Replace known key patterns with env var references
      const replacements: Array<[RegExp, string]> = [
        [
          /(ANTHROPIC_AUTH_TOKEN:\s*)(?:["'])?sk-[^\s"'\n]+(?:["'])?/g,
          '$1"${ANTHROPIC_AUTH_TOKEN}"',
        ],
        [
          /(ANTHROPIC_API_KEY:\s*)(?:["'])?sk-[^\s"'\n]+(?:["'])?/g,
          '$1"${ANTHROPIC_API_KEY}"',
        ],
        [
          /(CODEX_API_KEY:\s*)(?:["'])?sk-[^\s"'\n]+(?:["'])?/g,
          '$1"${CODEX_API_KEY}"',
        ],
        [
          /(OPENAI_API_KEY:\s*)(?:["'])?sk-[^\s"'\n]+(?:["'])?/g,
          '$1"${OPENAI_API_KEY}"',
        ],
        [/(apiKey:\s*)(?:["'])?sk-[^\s"'\n]+(?:["'])?/g, '$1"${API_KEY}"'],
      ];

      for (const [pattern, replacement] of replacements) {
        if (pattern.test(content)) {
          content = content.replace(pattern, replacement);
        }
      }

      // Fallback: any remaining sk-* tokens on their own line as env var values
      // Only replace if it looks like a secret (long enough)
      content = content.replace(
        /^(\s*\w+:\s*)(?:["'])?(sk-[a-zA-Z0-9_-]{30,})(?:["'])?/gm,
        (_m, key, _secret) => {
          const envVar = key.includes("AUTH_TOKEN")
            ? "ANTHROPIC_AUTH_TOKEN"
            : key.includes("API_KEY")
              ? "API_KEY"
              : key.includes("CODEX")
                ? "CODEX_API_KEY"
                : "API_KEY";
          return `${key}"\${${envVar}}"`;
        },
      );

      writeFileSync(fullPath, content, "utf8");
    }
  }
}
