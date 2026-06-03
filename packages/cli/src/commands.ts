/**
 * CLI Commands V2
 *
 * Gap-driven CLI commands that use the new orchestration system.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, join, basename } from "node:path";
import { getEpicsDir } from "@openplaybooks/converge-core/journal";

/* ────────────────────────────────────────────────────────────────── */
/*  Command Options                                                    */
/* ────────────────────────────────────────────────────────────────── */

export interface CommonOptions {
  /** Project directory (default: current directory) */
  dir?: string;
  /** Verbose logging */
  verbose?: boolean;
  /** Quiet mode (errors only) */
  quiet?: boolean;
}

export interface InitOptions extends CommonOptions {
  /** Project name (skips prompt if provided) */
  name?: string;
  /** Project description (skips prompt if provided) */
  description?: string;
  /** Agent CLI / host backend (claude, codex, gemini, kimi, qwen, acp, deepcode). */
  backend?: string;
  /** LLM inference provider (oauth, anthropic, openai, minimax, deepseek, …). */
  provider?: string;
  /** Comma-separated list of additional backends to enable (multi-agent). */
  agents?: string;
  /** Default backend (skips prompt if provided; must be in --agents if set) */
  defaultAgent?: string;
  /** Skip all prompts and use defaults */
  yes?: boolean;
  /** Overwrite existing .converge/ directory */
  force?: boolean;
  /** Install bundled skills to .claude/skills/ and .codex/skills/ */
  skills?: boolean;
}

/* ────────────────────────────────────────────────────────────────── */
/*  Command: init                                                      */
/* ────────────────────────────────────────────────────────────────── */

/**
 * Init has two orthogonal axes:
 *
 *   --backend   the agent CLI that executes the agent loop
 *               (claude, codex, gemini, kimi, qwen, acp, deepcode)
 *
 *   --provider  the LLM inference endpoint the backend talks to
 *               (oauth, anthropic, openai, kimi, qwen, gemini,
 *                minimax, deepseek, custom)
 *
 * `kimi`, `qwen`, `gemini` happen to name both a backend (the vendor's CLI)
 * and a provider (their LLM API). They're separate concepts living in
 * separate type unions; sharing the string is just a coincidence.
 */
type BackendId =
  | "claude"
  | "codex"
  | "gemini"
  | "kimi"
  | "qwen"
  | "acp"
  | "deepcode";
type ProviderId =
  | "anthropic-oauth"
  | "anthropic"
  | "openai"
  | "kimi"
  | "qwen"
  | "gemini"
  | "minimax"
  | "deepseek"
  | "custom";

interface BackendMeta {
  id: BackendId;
  label: string;
  hint: string;
  /** Provider used when --provider is omitted. */
  defaultProvider: ProviderId;
}

interface ProviderMeta {
  id: ProviderId;
  label: string;
  hint: string;
  /** Backends this provider can route under. */
  forBackends: readonly BackendId[];
  /**
   * Env block to splice under the backend's block in project.yaml when this
   * provider is selected. Per-backend because the same provider can target
   * different env-var conventions per host CLI (rare but possible).
   * `null` value = no env needed (e.g. OAuth).
   */
  envFor: Partial<Record<BackendId, Record<string, string> | null>>;
}

const BACKEND_CATALOG: BackendMeta[] = [
  {
    id: "claude",
    label: "Claude (Anthropic CLI)",
    hint: "recommended",
    defaultProvider: "anthropic-oauth",
  },
  {
    id: "codex",
    label: "Codex (OpenAI CLI)",
    hint: "codex exec",
    defaultProvider: "openai",
  },
  {
    id: "gemini",
    label: "Gemini (Google CLI)",
    hint: "",
    defaultProvider: "gemini",
  },
  {
    id: "kimi",
    label: "Kimi (Moonshot CLI)",
    hint: "kimifn",
    defaultProvider: "kimi",
  },
  {
    id: "qwen",
    label: "Qwen (Alibaba CLI)",
    hint: "",
    defaultProvider: "qwen",
  },
  {
    id: "acp",
    label: "ACP (OpenAI / any OpenAI-compatible)",
    hint: "custom endpoint",
    defaultProvider: "custom",
  },
  {
    id: "deepcode",
    label: "DeepCode (HKUDS CLI)",
    hint: "requires DeepCode CLI",
    defaultProvider: "custom",
  },
];

const PROVIDER_CATALOG: ProviderMeta[] = [
  {
    id: "anthropic-oauth",
    label: "Anthropic OAuth (no env vars)",
    hint: "claude login — uses ~/.claude/.credentials.json",
    forBackends: ["claude"],
    envFor: { claude: null },
  },
  {
    id: "anthropic",
    label: "Anthropic direct API",
    hint: "ANTHROPIC_API_KEY",
    forBackends: ["claude"],
    envFor: { claude: { ANTHROPIC_API_KEY: "${ANTHROPIC_API_KEY}" } },
  },
  {
    id: "minimax",
    label: "MiniMax (Anthropic-compatible)",
    hint: "cheap, single-model — MINIMAX_API_KEY",
    forBackends: ["claude"],
    // https://platform.minimax.io/docs/token-plan/claude-code
    envFor: {
      claude: {
        ANTHROPIC_BASE_URL: "https://api.minimax.io/anthropic",
        ANTHROPIC_AUTH_TOKEN: "${MINIMAX_API_KEY}",
        ANTHROPIC_MODEL: "MiniMax-M2.7",
        ANTHROPIC_DEFAULT_SONNET_MODEL: "MiniMax-M2.7",
        ANTHROPIC_DEFAULT_OPUS_MODEL: "MiniMax-M2.7",
        ANTHROPIC_DEFAULT_HAIKU_MODEL: "MiniMax-M2.7",
        API_TIMEOUT_MS: "3000000",
        CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
      },
    },
  },
  {
    id: "deepseek",
    label: "DeepSeek (Anthropic-compatible)",
    hint: "cheap, two-tier model — DEEPSEEK_API_KEY",
    forBackends: ["claude"],
    // https://api-docs.deepseek.com/quick_start/agent_integrations/claude_code
    envFor: {
      claude: {
        ANTHROPIC_BASE_URL: "https://api.deepseek.com/anthropic",
        ANTHROPIC_AUTH_TOKEN: "${DEEPSEEK_API_KEY}",
        ANTHROPIC_MODEL: "deepseek-v4-pro",
        ANTHROPIC_DEFAULT_OPUS_MODEL: "deepseek-v4-pro",
        ANTHROPIC_DEFAULT_SONNET_MODEL: "deepseek-v4-pro",
        ANTHROPIC_DEFAULT_HAIKU_MODEL: "deepseek-v4-flash",
        CLAUDE_CODE_SUBAGENT_MODEL: "deepseek-v4-flash",
        CLAUDE_CODE_EFFORT_LEVEL: "max",
      },
    },
  },
  {
    id: "openai",
    label: "OpenAI direct API",
    hint: "CODEX_API_KEY or OPENAI_API_KEY",
    forBackends: ["codex"],
    envFor: { codex: { CODEX_API_KEY: "${CODEX_API_KEY}" } },
  },
  {
    id: "kimi",
    label: "Kimi (Moonshot direct)",
    hint: "KIMI_API_KEY",
    forBackends: ["kimi"],
    envFor: { kimi: null },
  },
  {
    id: "qwen",
    label: "Qwen (Alibaba direct)",
    hint: "QWEN_API_KEY",
    forBackends: ["qwen"],
    envFor: { qwen: null },
  },
  {
    id: "gemini",
    label: "Gemini (Google direct)",
    hint: "GEMINI_API_KEY",
    forBackends: ["gemini"],
    envFor: { gemini: null },
  },
  {
    id: "custom",
    label: "Custom — edit project.yaml afterwards",
    hint: "any OpenAI-compatible or vendor-specific endpoint",
    forBackends: [
      "claude",
      "codex",
      "gemini",
      "kimi",
      "qwen",
      "acp",
      "deepcode",
    ],
    envFor: {},
  },
];

function findBackend(raw?: string | boolean): BackendMeta | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim().toLowerCase();
  return BACKEND_CATALOG.find((b) => b.id === value) ?? null;
}

function findProvider(raw?: string | boolean): ProviderMeta | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim().toLowerCase();
  return PROVIDER_CATALOG.find((p) => p.id === value) ?? null;
}

function providerSupportsBackend(
  provider: ProviderMeta,
  backend: BackendId,
): boolean {
  return provider.forBackends.includes(backend);
}

/**
 * Initialize a new converge project.
 *
 * Interactive by default: prompts for project name, AI providers, and default
 * agent. Non-interactive when stdin is not a TTY or when --yes is passed, in
 * which case sensible defaults are used (name=cwd basename, provider=claude).
 * Individual flags (--name, --agents, --default-agent) skip their prompts.
 */
export async function initCommand(options: InitOptions): Promise<void> {
  const projectDir = resolve(options.dir || process.cwd());
  const convergeDir = join(projectDir, ".converge");
  const p = await import("@clack/prompts");

  const isTTY = Boolean(process.stdin.isTTY && process.stdout.isTTY);
  const auto = options.yes === true || !isTTY;

  p.intro("🌀 Converge — initialize a new project");

  // ── Handle existing .converge/ ──────────────────────────────────
  if (existsSync(convergeDir)) {
    if (options.force) {
      const { rmSync } = await import("node:fs");
      rmSync(convergeDir, { recursive: true, force: true });
      p.log.warn("Removed existing .converge/ (--force)");
    } else if (options.skills) {
      // Existing project + --skills: skip scaffolding, just install skills
      p.log.info("Project already initialized — installing skills only.");
      await installBundledSkills(projectDir, options);
      return;
    } else if (auto) {
      p.cancel(
        "Project already initialized (.converge/ exists). Re-run with --force to overwrite.",
      );
      process.exit(1);
    } else {
      const overwrite = await p.confirm({
        message: ".converge/ already exists. Overwrite it?",
        initialValue: false,
      });
      if (p.isCancel(overwrite) || !overwrite) {
        p.cancel("Aborted — existing project left untouched.");
        process.exit(1);
      }
      const { rmSync } = await import("node:fs");
      rmSync(convergeDir, { recursive: true, force: true });
    }
  }

  const defaultName = basename(projectDir).replace(/[^a-zA-Z0-9_-]+/g, "-");

  // ── Backend resolution (which agent CLI) ────────────────────────
  const requestedBackend = findBackend(options.backend);
  if (options.backend && !requestedBackend) {
    console.error(
      `❌ Unknown backend "${options.backend}". Valid: ${BACKEND_CATALOG.map((b) => b.id).join(", ")}`,
    );
    process.exit(1);
  }
  let backendMeta = requestedBackend ?? BACKEND_CATALOG[0];

  // ── Provider resolution (which LLM endpoint) ────────────────────
  const requestedProvider = findProvider(options.provider);
  if (options.provider && !requestedProvider) {
    console.error(
      `❌ Unknown provider "${options.provider}". Valid: ${PROVIDER_CATALOG.map((pp) => pp.id).join(", ")}`,
    );
    process.exit(1);
  }
  if (
    requestedProvider &&
    !providerSupportsBackend(requestedProvider, backendMeta.id)
  ) {
    const valid = PROVIDER_CATALOG.filter((pp) =>
      pp.forBackends.includes(backendMeta.id),
    )
      .map((pp) => pp.id)
      .join(", ");
    console.error(
      `❌ Provider "${requestedProvider.id}" does not support backend "${backendMeta.id}". Valid for ${backendMeta.id}: ${valid}`,
    );
    process.exit(1);
  }
  let providerMeta =
    requestedProvider ??
    PROVIDER_CATALOG.find((pp) => pp.id === backendMeta.defaultProvider)!;

  // ── Project name ─────────────────────────────────────────────────
  let name = options.name?.trim();
  if (!name) {
    if (auto) {
      name = defaultName;
    } else {
      const answer = await p.text({
        message: "Project name",
        placeholder: defaultName,
        defaultValue: defaultName,
        validate: (v) => {
          const t = v.trim();
          if (t && !/^[a-zA-Z0-9_.-]+$/.test(t)) {
            return "Use letters, numbers, dashes, dots or underscores only.";
          }
          return undefined;
        },
      });
      if (p.isCancel(answer)) {
        p.cancel("Aborted.");
        process.exit(1);
      }
      name = (answer || defaultName).trim();
    }
  }

  // ── Description (optional) ───────────────────────────────────────
  let description = options.description?.trim();
  if (description === undefined) {
    if (auto) {
      description = "";
    } else {
      const answer = await p.text({
        message: "Short description (optional)",
        placeholder: "What does this project do?",
        defaultValue: "",
      });
      if (p.isCancel(answer)) {
        p.cancel("Aborted.");
        process.exit(1);
      }
      description = (answer ?? "").trim();
    }
  }

  // ── Backend (interactive) ────────────────────────────────────────
  if (!options.backend && !auto && !options.agents) {
    const answer = await p.select({
      message: "Backend (agent CLI)",
      options: BACKEND_CATALOG.map((b) => ({
        value: b.id,
        label: b.label,
        hint: b.hint || undefined,
      })),
      initialValue: backendMeta.id,
    });
    if (p.isCancel(answer)) {
      p.cancel("Aborted.");
      process.exit(1);
    }
    backendMeta = findBackend(answer)!;
    // Re-resolve default provider for the chosen backend if user didn't pin one
    if (!requestedProvider) {
      providerMeta = PROVIDER_CATALOG.find(
        (pp) => pp.id === backendMeta.defaultProvider,
      )!;
    }
  }

  // ── Provider (interactive) ───────────────────────────────────────
  if (!options.provider && !auto) {
    const choices = PROVIDER_CATALOG.filter((pp) =>
      pp.forBackends.includes(backendMeta.id),
    );
    if (choices.length > 1) {
      const answer = await p.select({
        message: `Provider (LLM endpoint) for ${backendMeta.label}`,
        options: choices.map((pp) => ({
          value: pp.id,
          label: pp.label,
          hint: pp.hint || undefined,
        })),
        initialValue: backendMeta.defaultProvider,
      });
      if (p.isCancel(answer)) {
        p.cancel("Aborted.");
        process.exit(1);
      }
      providerMeta = findProvider(answer)!;
    } else if (choices.length === 1) {
      providerMeta = choices[0];
    }
  }

  // ── Coding agents (multi-backend mode) ───────────────────────────
  let selected: BackendId[] = [];
  if (options.agents) {
    selected = parseAgentList(options.agents);
  } else {
    selected = [backendMeta.id];
  }
  if (selected.length === 0) selected = ["claude"];

  // ── Default agent ────────────────────────────────────────────────
  let defaultAgent =
    (options.defaultAgent?.trim() as BackendId | undefined) ?? undefined;
  if (defaultAgent && !selected.includes(defaultAgent)) {
    p.log.warn(
      `--default-agent=${defaultAgent} is not in the selected set; ignoring.`,
    );
    defaultAgent = undefined;
  }
  if (!defaultAgent) {
    if (selected.length === 1 || auto) {
      defaultAgent = selected[0];
    } else {
      const answer = await p.select({
        message: "Which agent should be the default?",
        options: selected.map((id) => ({
          value: id,
          label: BACKEND_CATALOG.find((m) => m.id === id)?.label ?? id,
        })),
        initialValue: selected[0],
      });
      if (p.isCancel(answer)) {
        p.cancel("Aborted.");
        process.exit(1);
      }
      defaultAgent = answer as BackendId;
    }
  }

  // ── Scaffold files ───────────────────────────────────────────────
  const s = p.spinner();
  s.start("Writing project files");
  mkdirSync(convergeDir, { recursive: true });

  // Resolve the env block for the default backend from the chosen provider.
  // For multi-agent setups, non-default backends get bare blocks; users can
  // edit project.yaml to add provider routing for those if needed.
  const defaultProviderEnv = providerMeta.envFor[defaultAgent] ?? undefined;

  writeFileSync(
    join(convergeDir, "project.yaml"),
    renderProjectYaml({
      name,
      description,
      selected,
      defaultAgent,
      defaultProviderEnv: defaultProviderEnv ?? undefined,
    }),
    "utf8",
  );

  writeFileSync(
    join(convergeDir, ".gitignore"),
    "# Execution artifacts (non-committed)\njournal/\ntarget/\n",
    "utf8",
  );

  s.stop("Project scaffolded");

  p.log.success(`Created .converge/project.yaml`);
  p.log.info(
    `Enabled agents: ${selected.join(", ")} (default: ${defaultAgent})`,
  );
  p.log.info(
    `Backend → Provider: ${backendMeta.label} → ${providerMeta.label}`,
  );

  const nextSteps = [
    "Fill in any API keys referenced in .converge/project.yaml (as ${ENV_VARS})",
    "Copy a built-in playbook:  converge add --from-example hello-world",
    "Or design one with AI:  /converge-planning  (inside Claude Code, if --skills was passed)",
  ];
  p.note(nextSteps.map((s, i) => `${i + 1}. ${s}`).join("\n"), "Next steps");
  p.outro("All set.");

  if (options.skills) {
    await installBundledSkills(projectDir, options);
  }
}

async function installBundledSkills(
  projectDir: string,
  options: InitOptions,
): Promise<void> {
  const p = await import("@clack/prompts");
  const { skillsInstallCommand } = await import("./commands-skills.ts");
  for (const target of [".claude/skills", ".codex/skills"]) {
    await skillsInstallCommand({
      dir: projectDir,
      target,
      // --skills always refreshes the bundled copies. Decoupled from --force,
      // which governs .converge/ overwrite — re-running `converge init --skills`
      // on an initialized project must update the skills without touching state.
      force: true,
      verbose: options.verbose,
    });
  }

  p.note(
    [
      "Claude Code auto-discovers skills from .claude/skills/ — just type the skill name to invoke it.",
      "Codex reads skills from .codex/skills/ the same way.",
      "",
      "Installed (refreshed if already present):",
      "  converge-planning   — design playbooks, plan projects, decompose tasks",
      "  converge-control    — run, monitor, and troubleshoot playbook execution",
    ].join("\n"),
    "Claude Code + Codex integration",
  );
}

function parseAgentList(raw: string): BackendId[] {
  const valid = new Set(BACKEND_CATALOG.map((m) => m.id));
  const out: BackendId[] = [];
  for (const part of raw.split(/[,\s]+/)) {
    const t = part.trim().toLowerCase();
    if (!t) continue;
    if (valid.has(t as BackendId) && !out.includes(t as BackendId)) {
      out.push(t as BackendId);
    }
  }
  return out;
}

async function promptSelectedAgents(
  p: typeof import("@clack/prompts"),
): Promise<BackendId[]> {
  const answer = await p.multiselect({
    message: "Coding agents to enable (space to toggle, enter to confirm)",
    options: BACKEND_CATALOG.map((m) => ({
      value: m.id,
      label: m.label,
      hint: m.hint || undefined,
    })),
    initialValues: ["claude"],
    required: true,
  });
  if (p.isCancel(answer)) {
    p.cancel("Aborted.");
    process.exit(1);
  }
  return answer as BackendId[];
}

function renderProjectYaml(args: {
  name: string;
  description: string;
  selected: BackendId[];
  defaultAgent: BackendId;
  /** Env block spliced under the *default* backend's `env:` sub-block. */
  defaultProviderEnv?: Record<string, string>;
}): string {
  const lines: string[] = [];
  lines.push("version: 2");
  lines.push(`name: ${args.name}`);
  if (args.description)
    lines.push(`description: ${yamlEscape(args.description)}`);
  lines.push("");
  lines.push("# AI provider configuration — one default, multiple enabled.");
  lines.push(
    "# Replace $VAR placeholders with real keys or export them in your shell.",
  );
  lines.push("ai:");
  lines.push(`  default: ${args.defaultAgent}`);
  lines.push("  providers:");
  for (const id of args.selected) {
    const env = id === args.defaultAgent ? args.defaultProviderEnv : undefined;
    lines.push(...renderProviderBlock(id, env));
  }
  lines.push("");
  lines.push("variables: {}");
  lines.push("plugins: []");
  return lines.join("\n") + "\n";
}

function renderProviderBlock(
  id: BackendId,
  env?: Record<string, string>,
): string[] {
  const block: string[] = [`    ${id}:`, `      provider: ${id}`];
  switch (id) {
    case "claude":
      if (!env) {
        block.push(
          "      # Uses Anthropic's Claude CLI. Auth via ANTHROPIC_AUTH_TOKEN env var.",
        );
      }
      break;
    case "acp":
      block.push(
        "      apiKey: ${ACP_API_KEY}",
        "      baseUrl: https://api.moonshot.cn/v1",
        "      model: moonshot-v1-8k",
      );
      break;
    case "kimi":
      block.push("      apiKey: ${KIMI_API_KEY}");
      break;
    case "qwen":
      block.push("      apiKey: ${QWEN_API_KEY}");
      break;
    case "gemini":
      block.push("      apiKey: ${GEMINI_API_KEY}");
      break;
    case "codex":
      if (!env) {
        block.push(
          "      # Auth via CODEX_API_KEY or OPENAI_API_KEY env var.",
          "      env:",
          "        CODEX_API_KEY: ${CODEX_API_KEY}",
        );
      }
      break;
    case "deepcode":
      if (!env) {
        block.push(
          "      # Requires HKUDS DeepCode to be installed and configured.",
          "      env:",
          "        DEEPCODE_CONFIG_PATH: ${DEEPCODE_CONFIG_PATH}",
        );
      }
      break;
  }
  // Splice provider-supplied env (proxy routing, etc.) when present.
  if (env && Object.keys(env).length > 0) {
    block.push("      env:");
    for (const [k, v] of Object.entries(env)) {
      block.push(`        ${k}: ${yamlScalar(v)}`);
    }
  }
  return block;
}

function yamlEscape(v: string): string {
  if (!v) return '""';
  if (/[:#&*!|>'"%@`]/.test(v) || /^\s|\s$/.test(v)) {
    return JSON.stringify(v);
  }
  return v;
}

/**
 * YAML scalar emitter for env-block values. Quotes anything YAML would
 * coerce (pure numbers, booleans, null-likes); leaves placeholders like
 * `${VAR}` and plain strings bare. Falls through to yamlEscape for the
 * rest so embedded `:`/`#` etc. still get quoted correctly.
 */
function yamlScalar(v: string): string {
  if (/^-?[0-9]+(\.[0-9]+)?$/.test(v)) return `"${v}"`;
  if (/^(true|false|null|yes|no|on|off|~)$/i.test(v)) return `"${v}"`;
  return yamlEscape(v);
}

/* ────────────────────────────────────────────────────────────────── */
/*  Command: checkpoint                                                */
/* ────────────────────────────────────────────────────────────────── */

/**
 * Show the current checkpoint with full hierarchical task detail.
 *
 * For each completed task the command enriches the flat checkpoint entry
 * with data from the task's status.json (phase, yields files, checklist)
 * so you can see exactly what was done and what still needs to run.
 */
export async function checkpointCommand(
  options: CommonOptions = {},
): Promise<void> {
  const projectDir = resolve(options.dir || process.cwd());
  const { TaskStateManager } =
    await import("@openplaybooks/converge-core/checkpoint");
  const { readdir, readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const { existsSync } = await import("node:fs");
  const checkpointMgr = new TaskStateManager(projectDir);
  const checkpoint = await checkpointMgr.load();

  if (!checkpoint) {
    console.log("ℹ️  No checkpoint found — project has not been run yet.");
    console.log("   Run: converge run --step");
    return;
  }

  // ── header ────────────────────────────────────────────────────────
  const age = Date.now() - new Date(checkpoint.timestamp).getTime();
  const ageStr =
    age < 60000
      ? `${Math.round(age / 1000)}s ago`
      : age < 3600000
        ? `${Math.round(age / 60000)}m ago`
        : `${Math.round(age / 3600000)}h ago`;

  console.log("📍 Converge Checkpoint\n");
  console.log(`   Saved:         ${checkpoint.timestamp} (${ageStr})`);
  console.log(`   Iteration:     ${checkpoint.iteration}`);
  console.log(`   Gaps Resolved: ${checkpoint.totalGapsResolved}`);
  console.log(`   Errors:        ${checkpoint.totalErrors}`);
  if (checkpoint.lastSuccessfulIteration) {
    console.log(`   Last Success:  ${checkpoint.lastSuccessfulIteration}`);
  }
  console.log();

  // ── load all status.json files from the journal ────────────────────
  // Build a map: taskId → TaskStatus (any depth) so we can enrich
  // the flat checkpoint task list with full hierarchical detail.
  type TaskStatusAny = {
    taskId: string;
    epicId: string;
    focusPath: string;
    status: string;
    title?: string;
    agent?: string;
    isYieldsOnly?: boolean;
    startedAt?: string;
    completedAt?: string;
    durationMs?: number;
    attempt: number;
    gapsResolved: number;
    gapsFailed: number;
    yieldsCreated?: string[];
    checklist: Array<{
      id: string;
      type: string;
      description: string;
      details?: string;
      done: boolean;
      doneAt?: string;
    }>;
  };
  const statusMap = new Map<string, TaskStatusAny>();

  const journalEpicsDir = getEpicsDir(projectDir);
  if (existsSync(journalEpicsDir)) {
    // Walk: epics/{epicId}/tasks/{taskId…}/status.json (any depth)
    async function scanForStatus(dir: string): Promise<void> {
      let entries;
      try {
        entries = await readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        const entryPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          await scanForStatus(entryPath);
        } else if (entry.name === "status.json") {
          try {
            const raw = await readFile(entryPath, "utf-8");
            const s = JSON.parse(raw) as TaskStatusAny;
            // Index by leaf taskId and by full focusPath (e.g. "epicId/taskId")
            statusMap.set(s.taskId, s);
            statusMap.set(s.focusPath, s);
            // Also index by leaf segment of focusPath for partial matches
            const leaf = s.taskId.split("/").pop();
            if (leaf) statusMap.set(leaf, s);
          } catch {
            /* corrupt status.json — skip */
          }
        }
      }
    }
    await scanForStatus(journalEpicsDir);
  }

  // ── helper: render a single task block ───────────────────────────
  function renderTask(taskId: string, prefix = "   "): void {
    const status =
      statusMap.get(taskId) ?? statusMap.get(taskId.split("/").pop() ?? taskId);

    if (!status) {
      // No status.json — show flat entry
      console.log(`${prefix}• ${taskId}`);
      return;
    }

    const stateIcon =
      status.status === "complete"
        ? "✅"
        : status.status === "running"
          ? "🔄"
          : status.status === "failed"
            ? "❌"
            : "⏳";
    const phase = status.isYieldsOnly ? "yields" : "task";
    const titleSuffix =
      status.title && status.title !== taskId ? ` — ${status.title}` : "";
    console.log(`${prefix}• ${status.focusPath}${titleSuffix}`);

    const detail: string[] = [
      `${stateIcon} ${status.status}`,
      `phase: ${phase}`,
    ];
    if (status.agent) detail.push(`agent: ${status.agent}`);
    if (status.durationMs)
      detail.push(`${(status.durationMs / 1000).toFixed(1)}s`);
    console.log(`${prefix}  ${detail.join("  |  ")}`);

    // Yields: show created files
    if (
      status.isYieldsOnly &&
      status.yieldsCreated &&
      status.yieldsCreated.length > 0
    ) {
      console.log(
        `${prefix}  Yields created (${status.yieldsCreated.length}):`,
      );
      for (const f of status.yieldsCreated) {
        console.log(`${prefix}    📄 ${f}`);
      }
    }

    // Checklist
    if (status.checklist && status.checklist.length > 0) {
      const subtasks = status.checklist.filter((i) => i.type === "subtask");
      const outputs = status.checklist.filter((i) => i.type === "output");
      const checks = status.checklist.filter((i) => i.type === "check");

      if (subtasks.length > 0) {
        const doneCount = subtasks.filter((i) => i.done).length;
        console.log(
          `${prefix}  Subtasks (${doneCount}/${subtasks.length} complete):`,
        );
        for (const item of subtasks) {
          const icon = item.done ? "✅" : "⏳";
          // Try to load sub-status for richer detail
          const subStatus = statusMap.get(item.id.replace("subtask:", ""));
          const subTitle = subStatus?.title ?? item.description;
          const subPhase = subStatus?.isYieldsOnly ? " [yields]" : "";
          console.log(
            `${prefix}    ${icon} ${item.description}${subTitle !== item.description ? ` — ${subTitle}` : ""}${subPhase}`,
          );
        }
      }

      if (outputs.length > 0) {
        console.log(`${prefix}  Outputs:`);
        for (const item of outputs) {
          const icon = item.done ? "✅" : "⏳";
          console.log(`${prefix}    ${icon} ${item.description}`);
        }
      }

      if (checks.length > 0) {
        console.log(`${prefix}  Checks:`);
        for (const item of checks) {
          const icon = item.done ? "✅" : "⏳";
          const cmd = item.details ? `  \`${item.details}\`` : "";
          console.log(`${prefix}    ${icon} ${item.description}${cmd}`);
        }
      }
    }
  }

  // ── completed tasks ───────────────────────────────────────────────
  let completedTasks: string[];
  let failedTasks: string[];
  let lockedTasks: string[];

  // RFC 0033: Read from inventory (committed store) first, fall back to
  // journal checkpoint for tasks not yet mirrored.
  const playbookName = process.env.CONVERGE_PLAYBOOK || "default";
  let inventoryState: Map<string, { status: string }> | undefined;
  try {
    const { readTaskInventoryState } =
      await import("@openplaybooks/converge-core/task/goal");
    const inv = readTaskInventoryState(projectDir, playbookName);
    inventoryState = new Map();
    for (const [id, task] of inv) {
      inventoryState.set(id, { status: (task as any).status ?? "todo" });
    }
  } catch {
    // Inventory not available yet — rely on journal checkpoint.
  }

  if (inventoryState && inventoryState.size > 0) {
    completedTasks = [...inventoryState]
      .filter(([, v]) => v.status === "done")
      .map(([id]) => id);
    failedTasks = [...inventoryState]
      .filter(([, v]) => v.status === "dropped")
      .map(([id]) => id);
    lockedTasks = [...inventoryState]
      .filter(([, v]) => v.status === "blocked")
      .map(([id]) => id);
  } else {
    // V2 fallback - use TaskStateManager methods
    completedTasks = await checkpointMgr.getCompletedTasks();
    failedTasks = await checkpointMgr.getFailedTasks();
    lockedTasks = await checkpointMgr.getLockedTasks();
  }

  if (completedTasks.length > 0) {
    console.log(`   ✅ Completed Tasks (${completedTasks.length}):`);
    console.log();
    for (const t of completedTasks) {
      renderTask(t, "   ");
      console.log();
    }
  } else {
    console.log("   ✅ Completed Tasks: none\n");
  }

  // ── failed tasks ──────────────────────────────────────────────────
  if (failedTasks.length > 0) {
    console.log(`   ❌ Failed Tasks (${failedTasks.length}):`);
    console.log();
    for (const t of failedTasks) {
      renderTask(t, "   ");
      console.log();
    }
  }

  // ── pending (locked but not completed or failed) ──────────────────
  const pendingLocked = lockedTasks.filter(
    (t) => !completedTasks.includes(t) && !failedTasks.includes(t),
  );
  if (pendingLocked.length > 0) {
    console.log(`   🔒 Additionally Locked (${pendingLocked.length}):`);
    for (const t of pendingLocked) {
      console.log(`      • ${t}`);
    }
    console.log();
  }

  console.log("   💡 To reset failed tasks: converge reset <task-id>");
}
