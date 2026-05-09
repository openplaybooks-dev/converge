/**
 * CLI Commands V2
 *
 * Gap-driven CLI commands that use the new orchestration system.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, join, basename } from "node:path";
import { getEpicsDir } from "@converge/core/journal/structure.ts";

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
  /** Comma-separated list of providers to enable (skips prompt if provided) */
  agents?: string;
  /** Default provider (skips prompt if provided) */
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

type ProviderId = "claude" | "acp" | "kimi" | "qwen" | "gemini" | "codex";

interface ProviderMeta {
  id: ProviderId;
  label: string;
  hint: string;
}

const PROVIDER_CATALOG: ProviderMeta[] = [
  { id: "claude", label: "Claude (Anthropic CLI)", hint: "recommended" },
  { id: "acp", label: "ACP (OpenAI / Kimi / any OpenAI-compatible)", hint: "custom endpoint" },
  { id: "kimi", label: "Kimi (Moonshot, direct API)", hint: "kimifn" },
  { id: "qwen", label: "Qwen (Alibaba)", hint: "" },
  { id: "gemini", label: "Gemini (Google)", hint: "" },
  { id: "codex", label: "Codex (OpenAI CLI)", hint: "codex exec" },
];

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

  // ── Coding agents ────────────────────────────────────────────────
  let selected: ProviderId[] = [];
  if (options.agents) {
    selected = parseAgentList(options.agents);
  } else if (auto) {
    selected = ["claude"];
  } else {
    const answer = await p.multiselect({
      message: "Coding agents to enable (space to toggle, enter to confirm)",
      options: PROVIDER_CATALOG.map((m) => ({
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
    selected = answer as ProviderId[];
  }
  if (selected.length === 0) selected = ["claude"];

  // ── Default agent ────────────────────────────────────────────────
  let defaultAgent =
    (options.defaultAgent?.trim() as ProviderId | undefined) ?? undefined;
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
          label: PROVIDER_CATALOG.find((m) => m.id === id)?.label ?? id,
        })),
        initialValue: selected[0],
      });
      if (p.isCancel(answer)) {
        p.cancel("Aborted.");
        process.exit(1);
      }
      defaultAgent = answer as ProviderId;
    }
  }

  // ── Scaffold files ───────────────────────────────────────────────
  const s = p.spinner();
  s.start("Writing project files");

  writeFileSync(
    join(convergeDir, "project.yaml"),
    renderProjectYaml({ name, description, selected, defaultAgent }),
    "utf8",
  );

  writeFileSync(join(convergeDir, ".gitignore"), "journal/\n", "utf8");

  s.stop("Project scaffolded");

  p.log.success(`Created .converge/project.yaml`);
  p.log.info(`Enabled agents: ${selected.join(", ")} (default: ${defaultAgent})`);

  const nextSteps = [
    "Fill in any API keys referenced in .converge/project.yaml (as ${ENV_VARS})",
    "Create a playbook:  converge new",
    "Or describe what you want:  converge new --from-prompt \"...\"",
  ];
  p.note(nextSteps.map((s, i) => `${i + 1}. ${s}`).join("\n"), "Next steps");
  p.outro("All set.");

  if (options.skills) {
    await installBundledSkills(projectDir, options);
  }
}

async function installBundledSkills(projectDir: string, options: InitOptions): Promise<void> {
  const p = await import("@clack/prompts");
  const { skillsInstallCommand } = await import("./commands-skills.ts");
  for (const target of [".claude/skills", ".codex/skills"]) {
    await skillsInstallCommand({
      dir: projectDir,
      target,
      force: options.force,
      verbose: options.verbose,
    });
  }

  p.note(
    [
      "Claude Code auto-discovers skills from .claude/skills/ — just type the skill name to invoke it.",
      "Codex reads skills from .codex/skills/ the same way.",
      "",
      "Installed:",
      "  converge-planning   — design playbooks, plan projects, decompose tasks",
      "  converge-control    — run, monitor, and troubleshoot playbook execution",
    ].join("\n"),
    "Claude Code + Codex integration",
  );
}

function parseAgentList(raw: string): ProviderId[] {
  const valid = new Set(PROVIDER_CATALOG.map((m) => m.id));
  const out: ProviderId[] = [];
  for (const part of raw.split(/[,\s]+/)) {
    const t = part.trim().toLowerCase();
    if (!t) continue;
    if (valid.has(t as ProviderId) && !out.includes(t as ProviderId)) {
      out.push(t as ProviderId);
    }
  }
  return out;
}

function renderProjectYaml(args: {
  name: string;
  description: string;
  selected: ProviderId[];
  defaultAgent: ProviderId;
}): string {
  const lines: string[] = [];
  lines.push("version: 2");
  lines.push(`name: ${args.name}`);
  if (args.description) lines.push(`description: ${yamlEscape(args.description)}`);
  lines.push("");
  lines.push("# AI provider configuration — one default, multiple enabled.");
  lines.push("# Replace ${ENV_VAR} placeholders with real keys or export them in your shell.");
  lines.push("ai:");
  lines.push(`  default: ${args.defaultAgent}`);
  lines.push("  providers:");
  for (const id of args.selected) {
    lines.push(...renderProviderBlock(id));
  }
  lines.push("");
  lines.push("variables: {}");
  lines.push("plugins: []");
  return lines.join("\n") + "\n";
}

function renderProviderBlock(id: ProviderId): string[] {
  switch (id) {
    case "claude":
      return [
        "    claude:",
        "      provider: claude",
        "      # Uses Anthropic's Claude CLI. Auth via ANTHROPIC_AUTH_TOKEN env var.",
      ];
    case "acp":
      return [
        "    acp:",
        "      provider: acp",
        "      apiKey: ${ACP_API_KEY}",
        "      baseUrl: https://api.moonshot.cn/v1",
        "      model: moonshot-v1-8k",
      ];
    case "kimi":
      return [
        "    kimi:",
        "      provider: kimi",
        "      apiKey: ${KIMI_API_KEY}",
      ];
    case "qwen":
      return [
        "    qwen:",
        "      provider: qwen",
        "      apiKey: ${QWEN_API_KEY}",
      ];
    case "gemini":
      return [
        "    gemini:",
        "      provider: gemini",
        "      apiKey: ${GEMINI_API_KEY}",
      ];
    case "codex":
      return [
        "    codex:",
        "      provider: codex",
        "      # Auth via CODEX_API_KEY or OPENAI_API_KEY env var.",
        "      env:",
        "        CODEX_API_KEY: ${CODEX_API_KEY}",
      ];
  }
}

function yamlEscape(v: string): string {
  if (!v) return '""';
  if (/[:#&*!|>'"%@`]/.test(v) || /^\s|\s$/.test(v)) {
    return JSON.stringify(v);
  }
  return v;
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
  const { TaskStateManager } = await import("@converge/core/checkpoint/state.ts");
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

  // V2 - use TaskStateManager methods
  completedTasks = await checkpointMgr.getCompletedTasks();
  failedTasks = await checkpointMgr.getFailedTasks();
  lockedTasks = await checkpointMgr.getLockedTasks();

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
