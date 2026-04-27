/**
 * CLI Commands V2
 *
 * Gap-driven CLI commands that use the new orchestration system.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, join, basename } from "node:path";
import { getEpicsDir } from "@converge/core/journal/structure.ts";
import {
  createFilesystemStorage,
  createStatusManager,
  createProjectContext,
  createProjectOrchestratorV2,
  createResumabilityManager,
  createDynamicPlanner,
  loadPluginsV2,
  formatPluginListV2,
  DEFAULT_CONVERGENCE_CONFIG,
  type ProjectConfig,
  type ConvergenceConfig,
} from "@converge/core";
import { autonomousRun, type AutonomousRunConfig } from "./autonomous-run.ts";

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

export interface RunOptions extends CommonOptions {
  /** Maximum consecutive stalls */
  maxStalls?: number;
  /** Enable parallel execution */
  parallel?: boolean;
  /** Maximum parallel tasks */
  maxParallel?: number;
  /** Enable checkpoints */
  checkpoints?: boolean;
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
}

/* ────────────────────────────────────────────────────────────────── */
/*  Command: init                                                      */
/* ────────────────────────────────────────────────────────────────── */

type ProviderId = "claude" | "acp" | "kimi" | "qwen" | "gemini";

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

  const tasksDir = join(convergeDir, "playbooks", "default", "tasks");
  mkdirSync(tasksDir, { recursive: true });

  writeFileSync(
    join(convergeDir, "project.yaml"),
    renderProjectYaml({ name, description, selected, defaultAgent }),
    "utf8",
  );

  writeFileSync(
    join(convergeDir, "playbooks", "default", "playbook.yml"),
    renderPlaybookYml({ name, description }),
    "utf8",
  );

  writeFileSync(join(convergeDir, ".gitignore"), "journal/\n", "utf8");

  s.stop("Project scaffolded");

  p.log.success(`Created .converge/project.yaml`);
  p.log.info(`Enabled agents: ${selected.join(", ")} (default: ${defaultAgent})`);

  const nextSteps = [
    "Fill in any API keys referenced in .converge/project.yaml (as ${ENV_VARS})",
    "Describe what you want to build:  converge plan \"…\"",
    "Or add a task manually and run:   converge run",
  ];
  p.note(nextSteps.map((s, i) => `${i + 1}. ${s}`).join("\n"), "Next steps");
  p.outro("All set.");
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
  }
}

function renderPlaybookYml(args: { name: string; description: string }): string {
  return [
    "name: default",
    `description: ${yamlEscape(args.description || args.name)}`,
    "",
    "run:",
    "  mode: autonomous",
    "  maxTaskAttempts: 3",
    "  resume: true",
  ].join("\n") + "\n";
}

function yamlEscape(v: string): string {
  if (!v) return '""';
  if (/[:#&*!|>'"%@`]/.test(v) || /^\s|\s$/.test(v)) {
    return JSON.stringify(v);
  }
  return v;
}

/* ────────────────────────────────────────────────────────────────── */
/*  Command: run                                                       */
/* ────────────────────────────────────────────────────────────────── */

/**
 * Run the convergence loop
 */
export async function runCommand(options: RunOptions = {}): Promise<void> {
  const projectDir = resolve(options.dir || process.cwd());
  const convergeDir = `${projectDir}/.converge`;

  console.log("🚀 Running Converge V2 convergence loop...\n");

  // Check if initialized
  if (!existsSync(convergeDir)) {
    console.error("❌ Error: Project not initialized. Run: converge init");
    process.exit(1);
  }

  // Create storage
  const storage = createFilesystemStorage(convergeDir);
  if (!storage.isInitialized()) {
    console.error("❌ Error: Invalid .converge/ directory");
    process.exit(1);
  }

  // Load project config
  const projectConfig = storage.readProject();
  console.log(`📦 Project: ${projectConfig.name}`);
  console.log(`📋 Goals: ${projectConfig.goals.length}`);
  console.log(`📦 Epics: ${projectConfig.epics.length}\n`);

  // Load plugins
  console.log("🔌 Loading plugins...");
  const pluginState = await loadPluginsV2(projectConfig.plugins, projectDir);
  console.log(`✅ Loaded ${pluginState.loaded.length} plugins\n`);

  if (options.verbose) {
    console.log(formatPluginListV2(pluginState));
    console.log();
  }

  // Create context
  const statusManager = createStatusManager(storage);
  const projectCtx = createProjectContext(
    projectDir,
    projectConfig,
    storage,
    pluginState.loaded,
  );

  // Create orchestrator
  const orchestrator = createProjectOrchestratorV2(storage, statusManager);

  // Build convergence config
  const convergenceConfig: ConvergenceConfig = {
    maxIterations: DEFAULT_CONVERGENCE_CONFIG.maxIterations,
    maxStallCount:
      options.maxStalls || DEFAULT_CONVERGENCE_CONFIG.maxStallCount,
    enableCheckpoints:
      options.checkpoints ?? DEFAULT_CONVERGENCE_CONFIG.enableCheckpoints,
    parallelExecution:
      options.parallel ?? DEFAULT_CONVERGENCE_CONFIG.parallelExecution,
    maxParallelTasks:
      options.maxParallel || DEFAULT_CONVERGENCE_CONFIG.maxParallelTasks,
  };

  console.log("⚙️  Convergence config:");
  console.log(`   Max stalls: ${convergenceConfig.maxStallCount}`);
  console.log(`   Parallel execution: ${convergenceConfig.parallelExecution}`);
  console.log(`   Checkpoints: ${convergenceConfig.enableCheckpoints}\n`);

  // Run orchestration
  const startTime = Date.now();
  const result = await orchestrator.run(projectCtx, convergenceConfig);
  const duration = (Date.now() - startTime) / 1000;

  // Display results
  console.log("\n" + "═".repeat(60));
  console.log("📊 CONVERGENCE RESULTS");
  console.log("═".repeat(60));
  console.log();
  console.log(
    `Status: ${result.converged ? "✅ CONVERGED" : "❌ NOT CONVERGED"}`,
  );
  console.log(`Reason: ${result.terminationReason}`);
  console.log();
  console.log("Metrics:");
  console.log(`  Iterations: ${result.summary.totalIterations}`);
  console.log(`  Gaps Resolved: ${result.summary.totalGapsResolved}`);
  console.log(`  Tasks Executed: ${result.summary.totalTasksExecuted}`);
  console.log(
    `  Tasks Succeeded: ${result.summary.totalTasksExecuted - result.summary.totalTasksExecuted}`,
  );
  console.log(`  Duration: ${duration.toFixed(2)}s`);
  console.log();

  if (result.error) {
    console.log("Error Details:");
    console.log(`  Message: ${result.error.message}`);
    console.log();
  }

  console.log("═".repeat(60));

  process.exit(result.converged ? 0 : 1);
}

/* ────────────────────────────────────────────────────────────────── */
/*  Command: resume                                                    */
/* ────────────────────────────────────────────────────────────────── */

/**
 * Resume from checkpoint
 */
export async function resumeCommand(
  options: CommonOptions = {},
): Promise<void> {
  const projectDir = resolve(options.dir || process.cwd());
  const convergeDir = `${projectDir}/.converge`;

  console.log("🔄 Resuming from checkpoint...\n");

  // Check if initialized
  if (!existsSync(convergeDir)) {
    console.error("❌ Error: Project not initialized. Run: converge init");
    process.exit(1);
  }

  // Create storage
  const storage = createFilesystemStorage(convergeDir);
  const statusManager = createStatusManager(storage);
  const resumability = createResumabilityManager(storage, statusManager);

  // Check if can resume
  if (!resumability.canResume()) {
    console.log("ℹ️  No checkpoint found, starting fresh...\n");
    return runCommand(options as RunOptions);
  }

  // Load project config
  const projectConfig = storage.readProject();

  // Load plugins
  const pluginState = await loadPluginsV2(projectConfig.plugins, projectDir);

  // Create context
  const projectCtx = createProjectContext(
    projectDir,
    projectConfig,
    storage,
    pluginState.loaded,
  );

  // Get resume point
  const resumePoint = await resumability.getResumePoint(projectCtx);
  if (!resumePoint) {
    console.error("❌ Error: Failed to load resume point");
    process.exit(1);
  }

  console.log("📍 Resume Point:");
  console.log(`   Checkpoint: ${resumePoint.checkpointId}`);
  console.log(`   Iteration: ${resumePoint.iteration}`);
  console.log(`   Phase: ${resumePoint.phase}`);
  console.log();
  console.log("📊 State Comparison:");
  console.log(`   Checkpoint gaps: ${resumePoint.checkpointGaps.length}`);
  console.log(`   Current gaps: ${resumePoint.currentGaps.length}`);
  console.log(`   Changed: ${resumePoint.gapsChanged ? "Yes" : "No"}`);
  console.log();

  // Create orchestrator and resume
  const orchestrator = createProjectOrchestratorV2(storage, statusManager);
  const result = await orchestrator.resume(projectCtx);

  // Display results (same as run command)
  console.log("\n" + "═".repeat(60));
  console.log("📊 RESUME RESULTS");
  console.log("═".repeat(60));
  console.log();
  console.log(
    `Status: ${result.converged ? "✅ CONVERGED" : "❌ NOT CONVERGED"}`,
  );
  console.log(`Reason: ${result.terminationReason}`);
  console.log(`Total Iterations: ${result.summary.totalIterations}`);
  console.log(`Gaps Resolved: ${result.summary.totalGapsResolved}`);
  console.log();

  process.exit(result.converged ? 0 : 1);
}

/* ────────────────────────────────────────────────────────────────── */
/*  Command: status                                                    */
/* ────────────────────────────────────────────────────────────────── */

/**
 * Show project status
 */
export async function statusCommand(
  options: CommonOptions = {},
): Promise<void> {
  const projectDir = resolve(options.dir || process.cwd());
  const convergeDir = `${projectDir}/.converge`;

  // Check if initialized
  if (!existsSync(convergeDir)) {
    console.error("❌ Error: Project not initialized");
    process.exit(1);
  }

  // Try legacy project.yaml first; if missing, use task-tree status
  const projectYamlPath = `${convergeDir}/project.yaml`;
  if (!existsSync(projectYamlPath)) {
    // Playbook-based project — show status from task tree
    const { TaskTree } = await import("@converge/core/task/tree/index.ts");
    const { treeNodesToTaskNodes, getTaskStates } =
      await import("./next-task.ts");
    const { resolveConvergeConfig } = await import("@converge/core/config/loader.ts");

    const resolved = await resolveConvergeConfig(projectDir);
    const config = resolved?.config ?? { name: "project", dir: projectDir };
    const taskTree = await TaskTree.load(projectDir, config);
    const tree = treeNodesToTaskNodes(taskTree, projectDir);
    const states = await getTaskStates(projectDir, tree);

    const completed = tree.filter((n) =>
      states.completed.has(n.journalTaskId),
    ).length;
    const failed = tree.filter((n) =>
      states.failed.has(n.journalTaskId),
    ).length;
    const blocked = tree.filter((n) =>
      states.blocked.has(n.journalTaskId),
    ).length;
    const pending = tree.length - completed - failed;

    console.log("📊 Project Status\n");
    console.log(`Tasks: ${tree.length}`);
    console.log(`  ✅ Completed: ${completed}`);
    console.log(`  ❌ Failed: ${failed}`);
    if (blocked > 0) console.log(`  🚫 Blocked: ${blocked}`);
    console.log(`  ○  Pending: ${pending}`);
    return;
  }

  // Create storage
  const storage = createFilesystemStorage(convergeDir);
  const statusManager = createStatusManager(storage);
  const projectConfig = storage.readProject();

  console.log("📊 Project Status\n");
  console.log(`Name: ${projectConfig.name}`);
  console.log(`Version: ${projectConfig.version}`);
  console.log();
  console.log("Goals:");
  for (const goal of projectConfig.goals) {
    console.log(`  • ${goal}`);
  }
  console.log();
  console.log("Epics:");
  for (const epicId of projectConfig.epics) {
    const playbookConfig = storage.readPlaybookConfig(epicId);
    const playbookStatus = statusManager.getPlaybookStatus(epicId);
    const tasks = storage.listTasks(epicId);
    const completed = tasks.filter((t) =>
      statusManager.isTaskCompleted(epicId, t),
    ).length;

    console.log(
      `  ${playbookStatus.status === "completed" ? "✅" : "⏳"} ${playbookConfig.title}`,
    );
    console.log(`     Status: ${playbookStatus.status}`);
    console.log(`     Tasks: ${completed}/${tasks.length} completed`);
    if (playbookStatus.currentGaps.length > 0) {
      console.log(`     Gaps: ${playbookStatus.currentGaps.length}`);
    }
  }
  console.log();

  // Show checkpoint info
  const resumability = createResumabilityManager(storage, statusManager);
  if (resumability.canResume()) {
    const checkpoints = resumability.listCheckpoints();
    console.log(`Checkpoints: ${checkpoints.length} available`);
  }
}

/* ────────────────────────────────────────────────────────────────── */
/*  Command: add-goal                                                  */
/* ────────────────────────────────────────────────────────────────── */

/**
 * Add a goal dynamically
 */
export async function addGoalCommand(
  goal: string,
  options: CommonOptions = {},
): Promise<void> {
  const projectDir = resolve(options.dir || process.cwd());
  const convergeDir = `${projectDir}/.converge`;

  if (!existsSync(convergeDir)) {
    console.error("❌ Error: Project not initialized");
    process.exit(1);
  }

  // Load and update config
  const storage = createFilesystemStorage(convergeDir);
  const projectConfig = storage.readProject();

  if (projectConfig.goals.includes(goal)) {
    console.log("ℹ️  Goal already exists");
    return;
  }

  projectConfig.goals.push(goal);
  projectConfig.metadata = {
    created: projectConfig.metadata?.created ?? new Date().toISOString(),
    ...projectConfig.metadata,
    updated: new Date().toISOString(),
  };

  storage.writeProject(projectConfig);
  console.log(`✅ Added goal: ${goal}`);
}

/* ────────────────────────────────────────────────────────────────── */
/*  Command: remove-goal                                               */
/* ────────────────────────────────────────────────────────────────── */

/**
 * Remove a goal dynamically
 */
export async function removeGoalCommand(
  goal: string,
  options: CommonOptions = {},
): Promise<void> {
  const projectDir = resolve(options.dir || process.cwd());
  const convergeDir = `${projectDir}/.converge`;

  if (!existsSync(convergeDir)) {
    console.error("❌ Error: Project not initialized");
    process.exit(1);
  }

  // Load and update config
  const storage = createFilesystemStorage(convergeDir);
  const projectConfig = storage.readProject();

  const index = projectConfig.goals.indexOf(goal);
  if (index === -1) {
    console.log("ℹ️  Goal not found");
    return;
  }

  projectConfig.goals.splice(index, 1);
  projectConfig.metadata = {
    created: projectConfig.metadata?.created ?? new Date().toISOString(),
    ...projectConfig.metadata,
    updated: new Date().toISOString(),
  };

  storage.writeProject(projectConfig);
  console.log(`✅ Removed goal: ${goal}`);
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
  const { CheckpointManager } = await import("@converge/core/checkpoint/manager.ts");
  const { readdir, readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const { existsSync } = await import("node:fs");
  const checkpointMgr = new CheckpointManager(projectDir);
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

  if (checkpoint.version === 1) {
    completedTasks = checkpoint.completedTasks;
    failedTasks = checkpoint.failedTasks || [];
    lockedTasks = checkpoint.lockedTasks;
  } else {
    // V2 - use CheckpointManager methods
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

/* ────────────────────────────────────────────────────────────────── */
/*  Command: reset                                                     */
/* ────────────────────────────────────────────────────────────────── */

/**
 * Reset one or more tasks so they can be re-run.
 *
 * Usage:
 *   converge reset 003-generate-all-screens
 *   converge reset 02-ux-ui-design-screen-generation/003-generate-all-screens
 *   converge reset 003-generate-all-screens --outputs   # also delete output files
 *
 * What it does:
 *   1. Removes task from completedTasks + lockedTasks in .checkpoint.json
 *   2. Deletes the task's status.json from the journal
 *   3. Clears the task's gaps.yml (empty) so gap detection re-runs fresh
 *   4. With --outputs: also deletes the task's declared output files/globs
 *      and, for yields tasks, the entire outputDir so yields re-generates
 */
export async function resetCommand(
  taskIds: string[],
  options: CommonOptions & { outputs?: boolean } = {},
): Promise<void> {
  if (taskIds.length === 0) {
    console.error("❌ Usage: converge reset <taskId> [taskId...] [--outputs]");
    console.error("   Example: converge reset 003-generate-all-screens");
    process.exit(1);
  }

  const projectDir = resolve(options.dir || process.cwd());
  const { CheckpointManager } = await import("@converge/core/checkpoint/manager.ts");
  const { readdir, readFile, rm, writeFile, mkdir } =
    await import("node:fs/promises");
  const { join, dirname } = await import("node:path");
  const { existsSync } = await import("node:fs");

  const checkpointMgr = new CheckpointManager(projectDir);
  const checkpoint = await checkpointMgr.load();

  if (!checkpoint) {
    console.log("ℹ️  No checkpoint found — nothing to reset.");
    return;
  }

  // ── resolve full status for each requested task ID ─────────────────
  // Walk the journal to find status.json files matching any of the IDs.
  type StatusEntry = {
    taskId: string;
    epicId: string;
    focusPath: string;
    yieldsCreated?: string[];
    checklist: Array<{ id: string; type: string; details?: string }>;
  };
  const journalEpicsDir = getEpicsDir(projectDir);
  const statusFiles: Array<{ filePath: string; status: StatusEntry }> = [];

  if (existsSync(journalEpicsDir)) {
    async function scanStatus(dir: string): Promise<void> {
      let entries;
      try {
        entries = await readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        const p = join(dir, entry.name);
        if (entry.isDirectory()) {
          await scanStatus(p);
        } else if (entry.name === "status.json") {
          try {
            const s = JSON.parse(await readFile(p, "utf-8")) as StatusEntry;
            statusFiles.push({ filePath: p, status: s });
          } catch {
            /* skip */
          }
        }
      }
    }
    await scanStatus(journalEpicsDir);
  }

  // Match requested IDs against collected status entries.
  // A match is: exact taskId, exact focusPath, or leaf segment of focusPath.
  const toReset: Array<{ filePath: string; status: StatusEntry }> = [];
  for (const requested of taskIds) {
    const matches = statusFiles.filter(
      ({ status }) =>
        status.taskId === requested ||
        status.focusPath === requested ||
        status.taskId.split("/").pop() === requested ||
        status.focusPath.split("/").pop() === requested,
    );
    if (matches.length === 0) {
      // No status.json found — still reset by ID alone (checkpoint + gaps)
      toReset.push({
        filePath: "",
        status: {
          taskId: requested,
          epicId: "",
          focusPath: requested,
          checklist: [],
        },
      });
    } else {
      toReset.push(...matches);
    }
  }

  // ── reset each task ────────────────────────────────────────────────
  let checkpointModified = false;

  for (const { filePath, status } of toReset) {
    const displayId = status.focusPath || status.taskId;
    console.log(`\n🔄 Resetting: ${displayId}`);

    // 1. Remove from checkpoint
    const leafId = status.taskId;
    const fullId = status.focusPath.replace("/", "."); // epicId.taskId scope format

    if (checkpoint.version === 1) {
      // V1 - modify arrays directly
      const before = checkpoint.completedTasks.length;
      checkpoint.completedTasks = checkpoint.completedTasks.filter(
        (t) => t !== leafId && t !== status.focusPath && t !== fullId,
      );
      checkpoint.lockedTasks = checkpoint.lockedTasks.filter(
        (t) => t !== leafId && t !== status.focusPath && t !== fullId,
      );
      if (checkpoint.completedTasks.length < before) {
        console.log("   ✅ Removed from checkpoint");
        checkpointModified = true;
      } else {
        console.log("   ℹ️  Not found in checkpoint (already unlocked)");
        checkpointModified = true; // save anyway to be safe
      }
    } else if (checkpoint.version === 2) {
      // V2 - use CheckpointManager methods
      // Try all possible task ID formats
      const taskIdsToRemove = [leafId, status.focusPath, fullId];
      let removed = false;

      for (const taskId of taskIdsToRemove) {
        try {
          await checkpointMgr.removeFromCompleted(
            taskId,
            status.epicId || undefined,
          );
          removed = true;
        } catch {
          // Task might not exist in this format, try next
        }
      }

      if (removed) {
        console.log("   ✅ Removed from checkpoint");
      } else {
        console.log("   ℹ️  Not found in checkpoint (already unlocked)");
      }
      checkpointModified = true;
    }

    // 2. Delete status.json
    if (filePath && existsSync(filePath)) {
      await rm(filePath);
      console.log("   ✅ Deleted status.json");
    }

    // 3. Clear gaps.yml (write empty) so gap detection starts fresh
    if (status.epicId) {
      const { writeGaps } = await import("@converge/core/journal/writer.ts");
      const scope = `${status.epicId}.${status.taskId}`;
      await writeGaps(projectDir, "task", scope, []);
      console.log("   ✅ Cleared gaps.yml");
    }

    // 4. Optionally delete output files
    if (options.outputs) {
      // Delete yields output directory (contains generated subtask files)
      const yieldsOutputDirs = status.checklist
        .filter((i) => i.type === "subtask" && i.details)
        .map((i) => dirname(join(projectDir, /* relative */ i.details ?? "")));
      const uniqueDirs = [...new Set(yieldsOutputDirs)];
      for (const dir of uniqueDirs) {
        if (existsSync(dir)) {
          await rm(dir, { recursive: true });
          console.log(`   🗑️  Deleted output dir: ${dir}`);
        }
      }

      // Delete individually listed yields-created files
      if (status.yieldsCreated) {
        // yieldsCreated paths are relative to the yieldsOutputDir configured
        // in the task. We resolve them relative to the epics dir.
        const epicsDir = join(projectDir, ".converge", "epics");
        for (const f of status.yieldsCreated) {
          // Try both relative-to-project and relative-to-epics
          for (const base of [projectDir, epicsDir]) {
            const abs = join(base, f);
            if (existsSync(abs)) {
              await rm(abs);
              console.log(`   🗑️  Deleted: ${f}`);
              break;
            }
          }
        }
      }

      // Delete declared output globs (for non-yields leaf tasks)
      const outputItems = status.checklist.filter(
        (i) => i.type === "output" && i.details,
      );
      for (const item of outputItems) {
        const pattern = item.details!;
        if (pattern.includes("*") || pattern.includes("?")) {
          const { glob } = await import("glob");
          const matches = await glob(pattern, { cwd: projectDir });
          for (const m of matches) {
            const abs = join(projectDir, m);
            if (existsSync(abs)) {
              await rm(abs);
              console.log(`   🗑️  Deleted: ${m}`);
            }
          }
        } else {
          const abs = join(projectDir, pattern);
          if (existsSync(abs)) {
            await rm(abs);
            console.log(`   🗑️  Deleted: ${pattern}`);
          }
        }
      }
    }

    console.log(`   ✔  ${displayId} reset — will re-run on next converge run`);
  }

  // ── save updated checkpoint ────────────────────────────────────────
  if (checkpointModified) {
    checkpoint.timestamp = new Date().toISOString();
    await checkpointMgr.save(checkpoint);
    console.log("\n✅ Checkpoint updated");
  }

  if (options.outputs) {
    console.log(
      "\n💡 Output files deleted. Task will regenerate from scratch.",
    );
  } else {
    console.log(
      "\n💡 Run: converge run --step   to re-execute the reset task(s)",
    );
    console.log("   Add --outputs to also delete generated output files.");
  }
}

/* ────────────────────────────────────────────────────────────────── */
/*  Command: plugins                                                   */
/* ────────────────────────────────────────────────────────────────── */

/**
 * List loaded plugins
 */
export async function pluginsCommand(
  options: CommonOptions = {},
): Promise<void> {
  const projectDir = resolve(options.dir || process.cwd());
  const convergeDir = `${projectDir}/.converge`;

  if (!existsSync(convergeDir)) {
    console.error("❌ Error: Project not initialized");
    process.exit(1);
  }

  const storage = createFilesystemStorage(convergeDir);
  const projectConfig = storage.readProject();

  console.log("🔌 Loading plugins...\n");
  const pluginState = await loadPluginsV2(projectConfig.plugins, projectDir);

  console.log(formatPluginListV2(pluginState));
}
