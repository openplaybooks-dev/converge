#!/usr/bin/env node
/**
 * Converge CLI - Main Entry Point
 *
 * Commands:
 *   converge run         - Run autonomous agent loop
 *   converge init        - Initialize project
 *   converge verify      - Verify config, structure, format, and detect issues
 *   converge status      - Show project status
 *   converge plugins     - List plugins
 */

// Force UTF-8 encoding for Python subprocesses (fixes Windows codec errors)
process.env.PYTHONIOENCODING = "utf-8";
process.env.PYTHONUTF8 = "1";

// Preserve original working directory when run via pnpm
// pnpm changes cwd to package root, but we want to use the directory where the user ran the command
const ORIGINAL_CWD = process.env.INIT_CWD || process.env.PWD || process.cwd();

import { resolve, dirname, join } from "node:path";
import { existsSync } from "node:fs";
import { runAutonomousCommand } from "./commands-run.ts";
import { metricsCommand } from "./commands-metrics.ts";
import { treeCommand } from "./commands-tree.ts";
import { resetCommand } from "./commands-reset.ts";
import { ganttCommand } from "./commands-gantt.ts";
import { graphCommand } from "./commands-graph.ts";
import { backlogCommand } from "./commands-backlog.ts";
import { evaluateCommand } from "./commands-goals.ts";
import { verifyCommand as verifyFullCommand } from "./commands-validate.ts";
import {
  inspectCommand,
  type InspectOptions,
} from "./commands-inspect.ts";
import { journalCommand } from "./commands-journal.ts";
import { migrateCommand } from "./commands-migrate.ts";
import { studioCommand } from "./commands-studio.ts";
import { JournalCleanup } from "@converge/core/checkpoint/cleanup.ts";
import {
  initCommand,
  runCommand,
  pluginsCommand,
  checkpointCommand,
  type InitOptions,
  type RunOptions,
  type CommonOptions,
} from "./commands.ts";
import {
  skillsListCommand,
  skillsInstallCommand,
  type SkillsInstallOptions,
  type SkillsListOptions,
} from "./commands-skills.ts";
import {
  playbookListCommand,
  playbookInfoCommand,
  playbookHistoryCommand,
} from "./commands-playbook.ts";
import {
  loadPlaybook,
  validatePlaybook,
  resolvePlaybook,
  parseDuration,
  discoverPlaybooks,
} from "@converge/core/task/playbook/loader.ts";
import {
  generateEpicFromPlaybook,
  mergeRunConfig,
  injectVarsIntoTaskMd,
} from "@converge/core/task/playbook/executor.ts";
import { initPlaybookJournal, appendTrend } from "@converge/core/task/playbook/journal.ts";
import {
  setPlaybookScope,
  clearPlaybookScope,
} from "@converge/core/journal/structure.ts";
import type { PlaybookRunConfig } from "@converge/core/task/playbook/types.ts";
import { showCommandHelp } from "./help.ts";
import { resolveConvergeConfig } from "@converge/core/config/loader.ts";
import { validateConvergeConfig } from "@converge/core/config/validator.ts";
import { HookRegistry } from "@converge/core/hooks/registry.ts";
import type { HookEvent } from "@converge/core/hooks/types.ts";
import { registerCleanupHandlers } from "@converge/core/agents/index.js";

/* ------------------------------------------------------------------ */
/*  Argument Parser                                                   */
/* ------------------------------------------------------------------ */

/**
 * Detect if first arg is a path to project.yml, playbook.yml, task, or journal
 * Returns { dir, playbook?, task?, command } if path detected, null otherwise
 */
function detectPathBasedCommand(args: string[]): {
  dir: string;
  playbook?: string;
  task?: string;
  command: string;
} | null {
  if (args.length === 0) return null;

  const firstArg = args[0];

  // Check if it looks like a path (contains / or \ or ends with .yml/.yaml)
  if (!firstArg.includes("/") && !firstArg.includes("\\") && !firstArg.endsWith(".yml") && !firstArg.endsWith(".yaml")) {
    return null;
  }

  // Resolve to absolute path
  const absPath = resolve(firstArg);

  // Check if it's a project.yml or playbook.yml
  if (existsSync(absPath)) {
    const fileName = absPath.split(/[/\\]/).pop() || "";

    if (fileName === "project.yml" || fileName === "project.yaml") {
      // Path to project.yml - extract directory
      const dir = dirname(dirname(absPath)); // Remove .converge/project.yml
      const command = args[1] || "status";
      return { dir, command };
    }

    if (fileName === "playbook.yml" || fileName === "playbook.yaml") {
      // Path to playbook.yml - extract directory and playbook name
      const playbookDir = dirname(absPath);
      const playbookName = playbookDir.split(/[/\\]/).pop() || "default";

      // Navigate up to find project root (.converge/playbooks/name/playbook.yml)
      const playbooksDir = dirname(playbookDir);
      const convergeDir = dirname(playbooksDir);
      const dir = dirname(convergeDir);

      const command = args[1] || "status";
      return { dir, playbook: playbookName, command };
    }

    if (fileName === "TASK.md" || fileName === "TASK.yaml" || fileName === "TASK.yml") {
      // Path to TASK.md - extract directory, playbook, and task path
      const taskDir = dirname(absPath);
      const taskId = taskDir.split(/[/\\]/).pop() || "";

      // Navigate up to find playbook and project root
      // Structure: .converge/playbooks/{playbook}/tasks/{taskId}/TASK.md
      const tasksDir = dirname(taskDir);
      const playbookDir = dirname(tasksDir);
      const playbookName = playbookDir.split(/[/\\]/).pop() || "default";
      const playbooksDir = dirname(playbookDir);
      const convergeDir = dirname(playbooksDir);
      const dir = dirname(convergeDir);

      const command = args[1] || "inspect";
      return { dir, playbook: playbookName, task: taskId, command };
    }
  }

  // Check if it's a directory path
  if (existsSync(absPath)) {
    const pathParts = absPath.split(/[/\\]/);

    // Check if it's a task directory (contains TASK.md)
    if (existsSync(join(absPath, "TASK.md")) || existsSync(join(absPath, "TASK.yaml")) || existsSync(join(absPath, "TASK.yml"))) {
      const taskId = pathParts[pathParts.length - 1];
      const tasksDir = dirname(absPath);
      const playbookDir = dirname(tasksDir);
      const playbookName = playbookDir.split(/[/\\]/).pop() || "default";
      const playbooksDir = dirname(playbookDir);
      const convergeDir = dirname(playbooksDir);
      const dir = dirname(convergeDir);

      const command = args[1] || "inspect";
      return { dir, playbook: playbookName, task: taskId, command };
    }

    // Check if it's a journal session directory
    // Structure: .converge/journal/{playbook}/sessions/{sessionId}/
    if (pathParts.includes("journal") && pathParts.includes("sessions")) {
      const sessionIdx = pathParts.indexOf("sessions");
      const playbookIdx = pathParts.indexOf("journal") + 1;

      if (sessionIdx > playbookIdx && sessionIdx < pathParts.length - 1) {
        const playbookName = pathParts[playbookIdx];
        const convergeIdx = pathParts.indexOf(".converge");
        const dir = pathParts.slice(0, convergeIdx).join("/");

        const command = args[1] || "inspect";
        return { dir, playbook: playbookName, command };
      }
    }

    // Check if it's a journal playbook directory
    // Structure: .converge/journal/{playbook}/
    if (pathParts.includes("journal")) {
      const journalIdx = pathParts.indexOf("journal");
      if (journalIdx < pathParts.length - 1) {
        const playbookName = pathParts[journalIdx + 1];
        const convergeIdx = pathParts.indexOf(".converge");
        const dir = pathParts.slice(0, convergeIdx).join("/");

        const command = args[1] || "inspect";
        return { dir, playbook: playbookName, command };
      }
    }

    // Check if it's a directory containing .converge/project.yml
    if (existsSync(join(absPath, ".converge", "project.yml"))) {
      const command = args[1] || "status";
      return { dir: absPath, command };
    }
  }

  return null;
}

function parseArgs(args: string[]): {
  command: string;
  options: Record<string, any>;
  positional: string[];
} {
  const command = args[0] || "help";
  const positional: string[] = [];
  const options: Record<string, any> = {};

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith("--")) {
      const eqIndex = arg.indexOf("=");
      let key: string;
      let value: string | boolean;

      if (eqIndex !== -1) {
        // --key=value
        key = arg.slice(2, eqIndex);
        value = arg.slice(eqIndex + 1);
      } else {
        key = arg.slice(2);
        // Peek at next arg: if it exists and doesn't start with -, treat as value
        const next = args[i + 1];
        if (next !== undefined && !next.startsWith("-")) {
          value = next;
          i++; // consume next arg
        } else {
          value = true;
        }
      }

      // Parse boolean/number values
      if (value === "true") {
        options[key] = true;
      } else if (value === "false") {
        options[key] = false;
      } else if (
        typeof value === "string" &&
        !isNaN(Number(value)) &&
        value.trim() !== ""
      ) {
        options[key] = Number(value);
      } else {
        options[key] = value;
      }
    } else if (arg.startsWith("-")) {
      // Short flags. `-p` takes a value (alias of --prompt); other short
      // flags are booleans (e.g. -v, -h, -y).
      const flag = arg.slice(1);
      if (flag === "p") {
        const next = args[i + 1];
        if (next !== undefined && !next.startsWith("-")) {
          options.prompt = next;
          i++;
        } else {
          options.prompt = true;
        }
      } else {
        options[flag] = true;
      }
    } else {
      positional.push(arg);
    }
  }

  return { command, options, positional };
}

/* ------------------------------------------------------------------ */
/*  Help Text                                                         */
/* ------------------------------------------------------------------ */

function showHelp(): void {
  console.log(`
Converge - Autonomous Agent Framework

USAGE
  converge <command> [options]
  converge <path> <command> [options]

PATH-BASED EXECUTION
  converge path/to/project.yml <command>       Run command in project directory
  converge path/to/playbook.yml <command>      Run command with specific playbook
  converge path/to/TASK.md <command>           Run command for specific task
  converge path/to/task-dir <command>          Run command for task directory
  converge path/to/directory <command>         Run command in directory

  Examples:
    converge examples/game-assets/.converge/project.yml run
    converge examples/game-assets/.converge/playbooks/default/playbook.yml status
    converge examples/game-assets/.converge/playbooks/default/tasks/01-setup/TASK.md inspect
    converge examples/game-assets/.converge/playbooks/default/tasks/01-setup inspect
    converge examples/game-assets run

WORKFLOW
  init                        Initialize new project
  plan <path>                 Plan one layer at a node (PLAN.md proposal)
  run [filter]                Execute autonomous agent loop
  reset                       Delete journal state (whole root, playbook, or task subtree)
  status [filter]             Show project status and task tree

INSPECTION
  inspect [options]           Inspect execution sessions and tasks
  show <view>                 Visualize project data (gantt|graph|journal|backlog|trend)
  metrics                     Show cost, token, and model metrics

MANAGEMENT
  verify                      Verify config, structure, checkpoint consistency
  migrate                     Migrate V1 project structure to V2 (spawned tasks → journal)
  playbook <sub>              Manage playbooks (list|info|history)
  skills <sub>                Manage skills (list|install)
  goals                       Evaluate project goals and plan remediation

GLOBAL OPTIONS
  --dir=PATH                  Project directory (default: cwd)
  --verbose, -v               Verbose output

Run "converge <command> --help" for command-specific options and examples.
`);
}

/* ------------------------------------------------------------------ */
/*  Graceful Shutdown                                                 */
/* ------------------------------------------------------------------ */

/** Active hook registry — set when execution starts, for shutdown use */
let activeRegistry: HookRegistry | null = null;

/**
 * Global AbortController — signalled on SIGINT/SIGTERM so running child
 * processes (claudefn, agentfn) can be killed promptly.
 */
const shutdownController = new AbortController();

/**
 * Safety-net shutdown handler for non-run commands.
 * The `run` command registers its own SIGINT/SIGTERM handlers in autonomous-run.ts
 * and commands-run.ts which call process.exit() after cleanup. This is a fallback
 * that ensures the process eventually exits if those handlers don't fire.
 */
function setupGracefulShutdown(): void {
  let shutdownInitiated = false;

  const handler = async (signal: string) => {
    if (shutdownInitiated) return;
    shutdownInitiated = true;

    // Signal all child processes to abort
    shutdownController.abort();

    // Re-arm for force exit on second signal
    process.once(signal as NodeJS.Signals, () => {
      process.exit(1);
    });

    // Safety-net: give run-command handlers up to 10s to call process.exit()
    const SHUTDOWN_TIMEOUT_MS = 10_000;
    const deadline = Date.now() + SHUTDOWN_TIMEOUT_MS;

    const waitForCleanup = async () => {
      while (Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    };

    await waitForCleanup();
    process.exit(0);
  };

  process.on("SIGINT", () => handler("SIGINT"));
  process.on("SIGTERM", () => handler("SIGTERM"));
}

/* ------------------------------------------------------------------ */
/*  Main Entry Point                                                  */
/* ------------------------------------------------------------------ */

async function main(): Promise<void> {
  const rawArgs = process.argv.slice(2);

  // Check for path-based command first
  const pathCmd = detectPathBasedCommand(rawArgs);
  let parsedArgs: ReturnType<typeof parseArgs>;

  if (pathCmd) {
    // Path-based: converge path/to/project.yml run [options]
    // Reconstruct args with command first, then inject --dir and internal markers
    const remainingArgs = rawArgs.slice(pathCmd.playbook || pathCmd.task ? 2 : 2);
    const reconstructed = [pathCmd.command, ...remainingArgs];
    parsedArgs = parseArgs(reconstructed);

    // Inject path-based options
    parsedArgs.options.dir = pathCmd.dir;
    if (pathCmd.playbook) {
      parsedArgs.options.__playbook = pathCmd.playbook; // Internal marker, not exposed to users
    }
    if (pathCmd.task) {
      parsedArgs.options.__task = pathCmd.task; // Internal marker, not exposed to users
    }

    console.log(`\n📂 Path-based execution detected:`);
    console.log(`   Directory: ${pathCmd.dir}`);
    if (pathCmd.playbook) {
      console.log(`   Playbook: ${pathCmd.playbook}`);
    }
    if (pathCmd.task) {
      console.log(`   Task: ${pathCmd.task}`);
    }
    console.log(`   Command: ${pathCmd.command}\n`);
  } else {
    // Standard command-based: converge run [options]
    parsedArgs = parseArgs(rawArgs);
  }

  const { command, options, positional } = parsedArgs;

  // Register agent cleanup handlers
  registerCleanupHandlers();

  setupGracefulShutdown();

  // ── Global playbook context from path-based execution ───────────────
  // When a playbook path is detected (e.g., converge path/to/playbook.yml run),
  // set the playbook scope so scanner, journal, status, run — every code path —
  // sees the same context. Using setPlaybookScope() ensures CONVERGE_PLAYBOOK,
  // CONVERGE_PLAYBOOK_DIR, and CONVERGE_JOURNAL_ROOT stay in sync.
  const globalProjectDir = resolve(options.dir || ORIGINAL_CWD);
  if (options.__playbook) {
    setPlaybookScope(String(options.__playbook), globalProjectDir);
  }

  // Auto-detect playbook context when no explicit playbook path provided.
  if (!process.env.CONVERGE_PLAYBOOK) {
    // Strategy 1: No project.yaml — try loading 'default' playbook
    const autoResolved = await resolveConvergeConfig(globalProjectDir);
    if (!autoResolved) {
      const autoPb = await loadPlaybook("default", globalProjectDir);
      if (autoPb) setPlaybookScope("default", globalProjectDir);
    }

    // Strategy 2: project.yaml exists but no playbook set — detect from journal.
    //
    // Prefer the `default` playbook when it exists. Falling back to a non-default
    // playbook silently overrides what is almost always the user's intended scope
    // (we hit this when a sibling `realdevice` playbook hijacked status).
    // Only pick a non-default playbook when `default` is genuinely absent.
    if (!process.env.CONVERGE_PLAYBOOK) {
      const { existsSync, readdirSync, statSync } = await import("node:fs");
      const { join } = await import("node:path");
      const journalDir = join(globalProjectDir, ".converge", "journal");
      const playbooksDir = join(globalProjectDir, ".converge", "playbooks");
      const hasDefault =
        existsSync(join(playbooksDir, "default", "playbook.yml")) ||
        existsSync(join(playbooksDir, "default", "playbook.yaml")) ||
        existsSync(join(journalDir, "default", "tasks"));
      if (hasDefault) {
        setPlaybookScope("default", globalProjectDir);
      } else if (existsSync(journalDir)) {
        for (const entry of readdirSync(journalDir)) {
          if (entry === "epics" || entry === "project") continue;
          const pbDir = join(journalDir, entry);
          if (!statSync(pbDir).isDirectory()) continue;
          const tasksDir = join(pbDir, "tasks");
          if (existsSync(tasksDir) && statSync(tasksDir).isDirectory()) {
            setPlaybookScope(entry, globalProjectDir);
            break;
          }
        }
      }
    }

    // Strategy 3: Sole playbook in .converge/playbooks/
    if (!process.env.CONVERGE_PLAYBOOK) {
      const discovered = await discoverPlaybooks(globalProjectDir);
      if (discovered.length === 1) {
        setPlaybookScope(discovered[0].def.name, globalProjectDir);
      }
    }
  }

  // ── Per-command --help ────────────────────────────────────────────
  if (
    (options.help || options.h) &&
    command !== "help" &&
    command !== "--help" &&
    command !== "-h"
  ) {
    showCommandHelp(command);
    process.exit(0);
  }

  // ── Playbook → Journal sync (every state-touching command) ─────────
  // The journal is the single source of truth for task definitions AND
  // runtime state. Re-sync from `.converge/playbooks/` on each invocation
  // so author edits propagate immediately. Runtime state (checkpoints,
  // events.jsonl, attempts/, WBS-spawned children) is preserved across
  // syncs by `syncPlaybookToJournal`.
  const SYNC_COMMANDS = new Set([
    "run",
    "status",
    "tree",
    "show",
    "inspect",
    "verify",
    "metrics",
    "next",
    "step",
    "playbook",
  ]);
  if (
    SYNC_COMMANDS.has(command) &&
    existsSync(join(globalProjectDir, ".converge", "playbooks"))
  ) {
    try {
      const { syncAllPlaybooks } = await import(
        "@converge/core/playbook/sync.ts"
      );
      const r = await syncAllPlaybooks(globalProjectDir);
      if (r.aggregate.changed && process.env.CONVERGE_VERBOSE === "true") {
        console.log(
          `🔄 Synced playbooks → journal: ${r.aggregate.copied} copied, ${r.aggregate.removed} removed (${r.playbooks.join(", ")})`,
        );
      }
    } catch (err) {
      if (process.env.CONVERGE_DEBUG === "true") {
        console.warn(
          `⚠️  Playbook sync failed (non-fatal): ${(err as Error).message}`,
        );
      }
    }
  }

  // ── Backward-compat redirects ──────────────────────────────────
  const REDIRECTS: Record<string, string> = {
    tree: '"tree" has moved. Use "converge status" instead.',
    checkpoint: 'Use "converge status --checkpoint" instead.',
    gantt: 'Use "converge show gantt" instead.',
    graph: 'Use "converge show graph" instead.',
    journal: 'Use "converge show journal" instead.',
    backlog: 'Use "converge show backlog" instead.',
    trend: 'Use "converge show trend" instead.',
    timeline: '"timeline" was removed. Use "converge inspect" instead.',
    validate: 'Did you mean "converge verify"?',
    workflow: '"workflow" does not exist. Use "converge playbook" instead.',
  };

  if (command in REDIRECTS) {
    console.log(`\n  ${REDIRECTS[command]}\n`);
    process.exit(0);
  }

  try {
    switch (command) {
      case "run": {
        // Auto-discover PROJECT.md from the target directory (or cwd)
        const searchDir = resolve(options.dir || ORIGINAL_CWD);

        // User-facing `--playbook=NAME` routes through the same playbook
        // layer as path-based execution. Both funnel through __playbook,
        // which is the internal marker the resolver + vars injector check.
        if (options.playbook && !options.__playbook) {
          options.__playbook = options.playbook;
        }

        // ── Early validation: require local .converge/project.yml ────────
        // If running from a subdirectory without its own project.yml:
        //   - Error out (prevent accidentally using parent config)
        const localConvergeDir = join(searchDir, ".converge");
        const localProjectYml = join(localConvergeDir, "project.yml");
        const localProjectYaml = join(localConvergeDir, "project.yaml");
        const localProjectMd = join(localConvergeDir, "PROJECT.md");

        const hasLocalProject =
          existsSync(localProjectYml) ||
          existsSync(localProjectYaml) ||
          existsSync(localProjectMd);

        let resolved = await resolveConvergeConfig(searchDir);

        // If resolved config is from a DIFFERENT directory than searchDir, and
        // searchDir has no local project config:
        if (resolved && !hasLocalProject) {
          const resolvedDir = dirname(resolved.configPath);
          const resolvedIsParent = resolvedDir !== searchDir;
          if (resolvedIsParent) {
            // Error out - parent config not allowed
            console.error(`\n❌ No .converge/project.yml found in: ${searchDir}`);
            console.error(`\n   Converge found a config in a parent directory:`);
            console.error(`   ${resolved.configPath}`);
            console.error(`\n   To run converge in this directory, create a local project config:`);
            console.error(`      - .converge/project.yml (recommended)`);
            console.error(`      - .converge/project.yaml`);
            console.error(`      - .converge/PROJECT.md`);
            console.error(`\n   Or use path-based execution to target a specific playbook:`);
            console.error(`      converge path/to/playbook.yml run\n`);
            process.exit(1);
          }
        }

        let hookRegistry: HookRegistry | undefined;
        let convergeConfig = resolved?.config;

        if (resolved) {
          const { config, configPath } = resolved;
          console.log(`\n📋 Loaded config: ${configPath}`);

          // Validate config
          const validated = validateConvergeConfig(config, configPath);
          convergeConfig = validated;

          // Build HookRegistry from user hooks
          hookRegistry = new HookRegistry();
          if (validated.hooks) {
            hookRegistry.registerAll(validated.hooks, "user");
          }
          activeRegistry = hookRegistry;
        } else {
          // No PROJECT.md — try synthesizing config from playbook
          let pbName = options.__playbook
            ? String(options.__playbook)
            : process.env.CONVERGE_PLAYBOOK || "default";
          let pb = await loadPlaybook(pbName, searchDir);
          // If 'default' not found, auto-select sole playbook
          if (!pb && pbName === "default") {
            const discovered = await discoverPlaybooks(searchDir);
            if (discovered.length === 1) {
              pbName = discovered[0].def.name;
              pb = discovered[0];
            }
          }
          if (pb) {
            convergeConfig = {
              name: pb.def.name || pbName,
              description: pb.def.description,
              dir: searchDir,
              plugins: pb.def.run?.mode ? undefined : undefined,
              runtime: {
                milestone: (pb.def.run as any)?.milestone,
              },
              skills:
                typeof (pb.def as any).skills === "object" &&
                !Array.isArray((pb.def as any).skills)
                  ? ((pb.def as any).skills as Record<string, string>)
                  : undefined,
            };
            console.log(`\n📋 Loaded config from playbook: ${pbName}`);
            // Export the full playbook scope (playbook, playbook dir, journal root)
            // so journal paths route correctly through journal/{playbook}/ even
            // without explicit playbook path.
            setPlaybookScope(pbName, searchDir);
          }
        }

        // ── Validate: require .converge/project.yml ──────────────────────
        // If no config found and no playbook found, error out early with clear message
        if (!convergeConfig) {
          // Check if .converge directory exists at all
          const convergeDir = join(searchDir, ".converge");
          const projectYml = join(convergeDir, "project.yml");
          const projectYaml = join(convergeDir, "project.yaml");
          const projectMd = join(convergeDir, "PROJECT.md");

          if (!existsSync(convergeDir)) {
            console.error(`\n❌ No .converge directory found at: ${convergeDir}`);
            console.error(`\n   To run converge in this directory, you need either:`);
            console.error(`   - A .converge/project.yml file (recommended)`);
            console.error(`   - A .converge/project.yaml file`);
            console.error(`   - A .converge/PROJECT.md file`);
            console.error(`\n   Run "converge init" to initialize a new project.\n`);
            process.exit(1);
          }

          // .converge exists but no project.yml
          console.error(`\n❌ No project.yml found in .converge/`);
          console.error(`   Location: ${convergeDir}`);
          console.error(`\n   The following config files are recognized:`);
          if (existsSync(projectYml)) {
            console.error(`   - .converge/project.yml (found)`);
          } else {
            console.error(`   - .converge/project.yml (not found)`);
          }
          if (existsSync(projectYaml)) {
            console.error(`   - .converge/project.yaml (found)`);
          } else {
            console.error(`   - .converge/project.yaml (not found)`);
          }
          if (existsSync(projectMd)) {
            console.error(`   - .converge/PROJECT.md (found)`);
          } else {
            console.error(`   - .converge/PROJECT.md (not found)`);
          }
          console.error(`\n   Run "converge init" to create a project.yml, or create one manually.\n`);
          process.exit(1);
        }

        // ── Playbook layer ───────────────────────────────────────────
        // Path-based playbook execution: load playbook, generate epic,
        // set journal context, then fall through to normal run with filter.
        let runFilter = positional[0] || options.filter;
        let playbookName: string | undefined;
        let playbookRunCfg: PlaybookRunConfig | undefined;
        let resolvedPb: import("../task/playbook/types.ts").ResolvedPlaybook | undefined;
        const runStartTime = Date.now();

        if (options.__playbook) {
          playbookName = String(options.__playbook);
          const pb = await loadPlaybook(playbookName, searchDir);
          if (!pb) {
            console.error(`\n   Playbook "${playbookName}" not found.`);
            console.error(
              '   Run "converge playbook list" to see available playbooks.\n',
            );
            process.exit(1);
          }

          const errors = validatePlaybook(pb.def, pb.templateDir);
          if (errors.length > 0) {
            console.error(`\n   Playbook "${playbookName}" has errors:`);
            for (const err of errors) console.error(`      - ${err}`);
            process.exit(1);
          }

          // Extract playbook input variables from CLI options
          const cliKeys = new Set([
            "dir",
            "verbose",
            "v",
            "dry",
            "plan",
            "__playbook",
            "step",
            "force",
            "resume",
            "restart",
            "unblock",
            "wbs",
            "inc",
            "preflight",
            "analyze",
            "add",
            "max-duration",
            "maxDuration",
            "check-interval",
            "checkInterval",
            "auto-fix",
            "autoFix",
            "self-plan",
            "selfPlan",
            "skip-check-lint",
            "skipCheckLint",
          ]);
          const vars: Record<string, string> = {};
          for (const [key, value] of Object.entries(options)) {
            if (!cliKeys.has(key)) {
              vars[key] = String(value);
            }
          }

          // ── Dispatch --add: stamp task from wbs template and exit ──
          if (options.add && pb.def.run?.mode === "dispatch") {
            const { stampDispatchTask } = await import(
              "../runners/dispatch/dispatch-runner.ts"
            );
            const playbookDir = join(
              searchDir,
              ".converge",
              "playbooks",
              playbookName,
            );
            const taskDir = await stampDispatchTask(playbookDir, vars);
            const relTask = taskDir.replace(searchDir + "/", "");
            console.log(`\n   ✅ Task created: ${relTask}`);
            console.log(`      Inputs: ${JSON.stringify(vars)}`);
            console.log(
              `\n   Run "converge ${playbookDir}/playbook.yml run" to process.\n`,
            );
            process.exit(0);
          }

          // For dispatch mode (queue processing), inputs come from each task's vars.
          // Skip required input validation — just resolve with empty placeholders.
          if (pb.def.run?.mode === "dispatch" && !options.add) {
            const placeholderVars: Record<string, string> = {};
            if (pb.def.inputs) {
              for (const [key, input] of Object.entries(pb.def.inputs)) {
                if (input.required && !vars[key]) {
                  placeholderVars[key] = `{{${key}}}`;
                }
              }
            }
            try {
              resolvedPb = resolvePlaybook(pb, { ...placeholderVars, ...vars });
            } catch (err: any) {
              console.error(`\n   ${err.message}\n`);
              process.exit(1);
            }
          } else {
            try {
              resolvedPb = resolvePlaybook(pb, vars);
            } catch (err: any) {
              console.error(`\n   ${err.message}\n`);
              process.exit(1);
            }
          }

          // Generate epic from template
          // Converge/loop modes skip this — they stamp a fresh epic each epoch
          console.log(`\n   Playbook: ${playbookName}`);
          console.log(`   Epic: ${resolvedPb.epicId}`);
          const effectiveMode = pb.def.run?.mode;
          if (effectiveMode !== "converge" && effectiveMode !== "loop" && effectiveMode !== "dispatch") {
            await generateEpicFromPlaybook(resolvedPb, searchDir);
          }

          // Refresh playbook-level vars on every run, regardless of mode.
          // installPlaybook only runs on first install (and is skipped entirely
          // in loop/converge/dispatch modes), but CLI flags may differ each
          // invocation — so the root TASK.md's `vars:` frontmatter must be
          // rewritten unconditionally so WBS scripts see up-to-date values
          // via ctx.vars.
          {
            const rootTaskMd = join(
              searchDir,
              ".converge",
              "playbooks",
              playbookName,
              "TASK.md",
            );
            await injectVarsIntoTaskMd(rootTaskMd, resolvedPb.vars);
          }

          // Merge playbook run config with CLI overrides
          const cliOverrides: Partial<PlaybookRunConfig> = {};
          const durOpt = options["max-duration"] || options.maxDuration;
          if (durOpt !== undefined) {
            const dur = parseDuration(durOpt);
            if (dur !== undefined) cliOverrides.maxDuration = dur;
          }
          if (options.resume !== undefined)
            cliOverrides.resume = Boolean(options.resume);

          playbookRunCfg = mergeRunConfig(pb.def.run, cliOverrides);

          // Init playbook journal + set context
          await initPlaybookJournal(searchDir, playbookName);
          console.log(`   Mode: ${playbookRunCfg.mode}\n`);

          setPlaybookScope(playbookName, searchDir);
          // Filter by the playbook/root-task id so the scanner finds the task
          // tree on disk. epicId may be suffixed with the key input's value for
          // collision avoidance across concurrent runs, but task tree paths are
          // named by playbookName.
          runFilter = playbookName;
        }

        // ── Execute ──────────────────────────────────────────────────
        const isDry = options.dry || options.plan || false;

        try {
          await runAutonomousCommand({
            dir: convergeConfig?.dir || options.dir,
            filter: runFilter,
            force: options.force || false,
            resume: options.resume || playbookRunCfg?.resume || false,
            restart: options.restart || false,
            step: options.step || false,
            dry: isDry,
            analyze: options.preflight || options.analyze || false,
            unblock: options.unblock || false,
            mode: playbookRunCfg?.mode,
            playbook: resolvedPb,
            stall: playbookRunCfg?.stall,
            wbs: options.wbs || false,
            inc: options.inc || false,
            maxDuration:
              options["max-duration"] ||
              options.maxDuration ||
              playbookRunCfg?.maxDuration,
            checkInterval: options["check-interval"] || options.checkInterval,
            autoFix: options["auto-fix"] ?? options.autoFix ?? true,
            selfPlan: options["self-plan"] ?? options.selfPlan ?? true,
            skipCheckLint:
              options["skip-check-lint"] || options.skipCheckLint || false,
            verbose: options.verbose || options.v,
            convergeConfig,
            hookRegistry,
          });

          // Append trend entry for playbook
          if (playbookName) {
            await appendTrend(searchDir, playbookName, {
              sessionId: `run-${new Date().toISOString()}`,
              timestamp: new Date().toISOString(),
              tasksTotal: 0,
              tasksComplete: 0,
              tasksFailed: 0,
              totalAttempts: 0,
              durationMs: Date.now() - runStartTime,
            });
          }
        } catch (err: any) {
          if (playbookName) {
            await appendTrend(searchDir, playbookName, {
              sessionId: `run-${new Date().toISOString()}`,
              timestamp: new Date().toISOString(),
              tasksTotal: 0,
              tasksComplete: 0,
              tasksFailed: 0,
              totalAttempts: 0,
              durationMs: Date.now() - runStartTime,
            });
          }
          throw err;
        } finally {
          clearPlaybookScope();
        }
        break;
      }

      case "init": {
        await initCommand({
          name: options.name || positional[0],
          description: options.description,
          agents: options.agents || options.agent,
          defaultAgent: options["default-agent"] || options.defaultAgent,
          yes: options.yes || options.y || false,
          force: options.force || false,
          dir: options.dir,
          verbose: options.verbose || options.v,
        });
        break;
      }

      case "verify": {
        const taskArg =
          options.__task ||
          (typeof options.task === "string"
            ? options.task
            : options.task
              ? positional[0]
              : undefined);
        await verifyFullCommand({
          dir: options.dir,
          fix: options.fix || false,
          rules: options.rules || false,
          task: taskArg,
        });
        break;
      }

      case "status": {
        if (options.checkpoint) {
          await checkpointCommand({
            dir: options.dir || ORIGINAL_CWD,
            verbose: options.verbose || options.v,
          });
        } else {
          // Positional args:
          //   converge status                       → all playbooks (or auto-detected)
          //   converge status <playbook>            → scope to playbook by name
          //   converge status <playbook> <task>     → scope to playbook, then filter
          //   converge status <task>                → filter only (when first arg is not a playbook name)
          //
          // Path-form (converge .../playbook.yml status, converge .../TASK.md status, etc.)
          // is already handled by detectPathBasedCommand and sets options.__playbook
          // and options.__task before reaching here.
          let inferredPlaybook: string | undefined = options.__playbook
            ? String(options.__playbook)
            : undefined;
          let inferredFilter: string | undefined = options.filter
            ? String(options.filter)
            : undefined;

          if (!inferredPlaybook && positional[0]) {
            const candidate = positional[0];
            const projectDir = resolve(options.dir || options.root || ORIGINAL_CWD);

            // Try resolving as a path (relative or absolute) into a playbook scope.
            // Accept: .../playbook.yml | .../journal/<pb>(/...) | .../playbooks/<pb>(/...) | <pb-dir>
            const tryAsPath = (raw: string): string | undefined => {
              if (!raw.includes("/") && !raw.includes("\\")) return undefined;
              const abs = resolve(projectDir, raw);
              const parts = abs.split(/[/\\]/);
              const pbIdx = parts.indexOf("playbooks");
              if (pbIdx !== -1 && pbIdx + 1 < parts.length) {
                return parts[pbIdx + 1];
              }
              const jIdx = parts.indexOf("journal");
              if (jIdx !== -1 && jIdx + 1 < parts.length) {
                return parts[jIdx + 1];
              }
              return undefined;
            };

            const pbFromPath = tryAsPath(candidate);
            if (pbFromPath) {
              inferredPlaybook = pbFromPath;
              if (positional[1]) inferredFilter = positional[1];
            } else {
              const pbDir = join(projectDir, ".converge", "playbooks", candidate);
              const journalDir = join(projectDir, ".converge", "journal", candidate);
              const isPlaybookName =
                existsSync(join(pbDir, "playbook.yml")) ||
                existsSync(join(pbDir, "playbook.yaml")) ||
                existsSync(join(journalDir, "tasks"));
              if (isPlaybookName) {
                inferredPlaybook = candidate;
                if (positional[1]) inferredFilter = positional[1];
              } else {
                // Treat as filter when it doesn't match a known playbook.
                inferredFilter = candidate;
              }
            }
          } else if (inferredPlaybook && positional[0] && !inferredFilter) {
            // Path-form set __playbook; first positional becomes the filter.
            inferredFilter = positional[0];
          }

          // Honor an explicit playbook-name positional even when auto-detect
          // already set CONVERGE_PLAYBOOK to something else.
          if (inferredPlaybook && process.env.CONVERGE_PLAYBOOK !== inferredPlaybook) {
            setPlaybookScope(inferredPlaybook, globalProjectDir);
          }

          await treeCommand({
            root: options.dir || options.root || ORIGINAL_CWD,
            filter: inferredFilter,
            playbook: inferredPlaybook,
            showPaths: options["show-paths"] || options.showPaths,
            showDescriptions:
              options["show-descriptions"] || options.showDescriptions,
            onlyIncomplete:
              options["only-incomplete"] || options.onlyIncomplete,
            maxDepth: options["max-depth"]
              ? Number(options["max-depth"])
              : undefined,
            showCursor: options["show-cursor"] || options.showCursor,
            detail: options.detail || false,
          });
        }
        break;
      }

      case "reset": {
        await resetCommand(positional, {
          dir: options.dir,
          verbose: options.verbose || options.v,
          all: options.all || false,
          yes: options.yes || options.y || false,
        });
        break;
      }

      case "plugins": {
        await pluginsCommand({
          dir: options.dir,
          verbose: options.verbose || options.v,
        });
        break;
      }

      case "show": {
        const view = positional[0];
        if (!view) {
          console.log(
            '\n  Usage: converge show <view>\n\n  Views: gantt, graph, journal, backlog, trend\n\n  Run "converge show --help" for details.\n',
          );
          process.exit(0);
        }

        switch (view) {
          case "gantt":
            await ganttCommand({
              dir: options.dir,
              onlyBlocked: options["only-blocked"] || options.onlyBlocked,
              onlyReady: options["only-ready"] || options.onlyReady,
            });
            break;
          case "graph":
            await graphCommand({
              dir: options.dir,
              detail: options.detail || false,
              filter: positional[1] || options.filter,
            });
            break;
          case "journal":
            await journalCommand({
              root: options.dir || options.root,
              epic: positional[1] || options.epic,
              onlyRetries: options["only-retries"] || options.onlyRetries,
            });
            break;
          case "backlog":
            await backlogCommand({
              dir: options.dir,
              epic: positional[1] || options.epic,
              severity: options.severity as string,
              json: options.json || false,
            });
            break;
          case "trend": {
            const { formatTrendTable } = await import(
              "../converge/gap-ledger.ts"
            );
            const trendProjectDir = resolve(options.dir || ORIGINAL_CWD);
            console.log("\n" + formatTrendTable(trendProjectDir) + "\n");
            break;
          }
          default:
            console.error(`  Unknown view: "${view}"`);
            console.error(
              "  Available views: gantt, graph, journal, backlog, trend",
            );
            process.exit(1);
        }
        break;
      }

      case "goals": {
        await evaluateCommand({
          dir: options.dir,
          verbose: options.verbose || options.v,
          plan: options.plan || false,
          dry: options.dry || false,
          goal: positional[0],
        });
        break;
      }

      case "migrate": {
        await migrateCommand({
          dir: options.dir,
          apply: options.apply || false,
          force: options.force || false,
          verbose: options.verbose || options.v || false,
        });
        break;
      }

      case "cleanup": {
        const projectDir = resolve(options.dir || ORIGINAL_CWD);
        console.log("🧹 Cleaning up orphaned journals...\n");

        const cleanup = new JournalCleanup(projectDir);
        const result = await cleanup.run(options.verbose || options.v);

        if (result.removed === 0) {
          console.log("✓ No orphaned journals found - everything is clean!");
        } else {
          console.log(
            `\n✅ Cleanup complete - removed ${result.removed} orphaned journal(s)`,
          );
        }
        break;
      }

      case "plan": {
        const { mkdir: mkdirFs, writeFile: writeFileFs } =
          await import("node:fs/promises");
        const { runPlanLayer } = await import(
          "@converge/core/planning/progressive-decomposition/index.ts"
        );
        const { agentfn } = await import("@converge/agentfn");

        // Per docs/design/progressive-decomposition.md:
        //   converge plan <path> [-p "<prompt>"] [--update]
        //
        // <path> is a playbook root (where playbook.yml lives) or a task
        // directory (where TASK.md lives). Without a path, fall back to
        // prompt-mode: derive a name and scaffold a fresh playbook root,
        // then plan there.
        //
        // Each invocation calls `runPlanLayer` once; that function does
        // one shallow LLM plan call per node and recursively plans
        // static-container children in-process. No subprocess spawn, no
        // meta-task playbook, no agent-driven recursion.
        const planSearchDir = resolve(options.dir || ORIGINAL_CWD);
        const promptArg =
          typeof options.prompt === "string"
            ? (options.prompt as string)
            : undefined;
        const isUpdate = !!options.update;

        const firstPositional = positional[0];
        let nodePath: string | undefined;
        let prompt: string | undefined = promptArg;

        if (firstPositional) {
          const looksLikePath =
            firstPositional.includes("/") ||
            firstPositional.includes("\\") ||
            existsSync(resolve(planSearchDir, firstPositional));
          if (looksLikePath) {
            nodePath = resolve(planSearchDir, firstPositional);
          } else if (!prompt) {
            prompt = firstPositional;
          }
        }

        let planName = options.name as string | undefined;
        if (!nodePath) {
          if (!prompt) {
            console.error("\n   ❌ Missing <path> or --prompt");
            console.error(
              '   Usage: converge plan <path> [-p "<prompt>"] [--update]',
            );
            console.error(
              '      or: converge plan -p "Your plan description"\n',
            );
            process.exit(1);
          }
          if (!planName) {
            planName = await suggestPlaybookName(prompt, agentfn);
          }
          const newPlaybookDir = join(
            planSearchDir,
            ".converge",
            "playbooks",
            planName,
          );
          if (!existsSync(newPlaybookDir)) {
            await mkdirFs(newPlaybookDir, { recursive: true });
            await writeFileFs(
              join(newPlaybookDir, "playbook.yml"),
              [
                `name: ${planName}`,
                `description: "${prompt.replace(/"/g, '\\"')}"`,
                "",
                "run:",
                "  mode: autonomous",
                "  maxTaskAttempts: 3",
                "  resume: true",
              ].join("\n"),
              "utf8",
            );
          }
          nodePath = newPlaybookDir;
        }

        const hasPlaybookYml =
          existsSync(join(nodePath, "playbook.yml")) ||
          existsSync(join(nodePath, "playbook.yaml"));
        const hasTaskMd = existsSync(join(nodePath, "TASK.md"));
        if (!hasPlaybookYml && !hasTaskMd) {
          console.error(
            `\n   ❌ ${nodePath} is neither a playbook root (playbook.yml) nor a task directory (TASK.md).`,
          );
          console.error(
            "   Pass a path to an existing node, or use -p to scaffold a fresh playbook.\n",
          );
          process.exit(1);
        }

        const nodeKind: "playbook-root" | "task" = hasPlaybookYml
          ? "playbook-root"
          : "task";

        let playbookRoot = nodePath;
        if (nodeKind === "task") {
          let cur = nodePath;
          while (
            !existsSync(join(cur, "playbook.yml")) &&
            !existsSync(join(cur, "playbook.yaml"))
          ) {
            const parent = dirname(cur);
            if (parent === cur) {
              console.error(
                `\n   ❌ Could not find playbook.yml above ${nodePath}\n`,
              );
              process.exit(1);
            }
            cur = parent;
          }
          playbookRoot = cur;
        }

        console.log(`\n📋 converge plan`);
        console.log(`   Node: ${nodePath}`);
        console.log(`   Kind: ${nodeKind}`);
        if (prompt) console.log(`   Prompt: ${prompt}`);
        if (isUpdate) console.log(`   --update`);

        const planStart = Date.now();
        try {
          await runPlanLayer({
            nodePath,
            nodeKind,
            playbookRoot,
            projectDir: planSearchDir,
            prompt,
            update: isUpdate,
          });

          if (existsSync(join(nodePath, "PLAN.md"))) {
            const relNode = nodePath.startsWith(planSearchDir + "/")
              ? nodePath.slice(planSearchDir.length + 1)
              : nodePath;
            const elapsed = ((Date.now() - planStart) / 1000).toFixed(1);
            console.log(
              `\n✅ Plan written: ${relNode}/PLAN.md (${elapsed}s)`,
            );
            if (nodeKind === "playbook-root") {
              console.log(`\n   To run the playbook:`);
              console.log(`   converge ${relNode}/playbook.yml run\n`);
            }
          }
        } catch (err: any) {
          console.error(`\n   ❌ plan failed: ${err.message}`);
          throw err;
        }
        break;
      }

      case "skills": {
        const subcommand = positional[0] || "list";

        switch (subcommand) {
          case "list": {
            await skillsListCommand({
              dir: options.dir,
              verbose: options.verbose || options.v,
            });
            break;
          }

          case "install": {
            await skillsInstallCommand({
              dir: options.dir,
              target: options.target,
              skill: options.skill,
              force: options.force || false,
              verbose: options.verbose || options.v,
            });
            break;
          }

          default: {
            console.error(`❌ Unknown skills subcommand: ${subcommand}`);
            console.error("Usage: converge skills <list|install> [options]");
            process.exit(1);
          }
        }
        break;
      }

      case "playbook": {
        const subcommand = positional[0] || "list";

        switch (subcommand) {
          case "list": {
            await playbookListCommand({
              dir: options.dir,
              verbose: options.verbose || options.v,
            });
            break;
          }

          case "info": {
            const playbookInfoName = positional[1];
            if (!playbookInfoName) {
              console.error("   Usage: converge playbook info <name>");
              process.exit(1);
            }
            await playbookInfoCommand(playbookInfoName, {
              dir: options.dir,
            });
            break;
          }

          case "history": {
            const playbookHistName = positional[1];
            if (!playbookHistName) {
              console.error("   Usage: converge playbook history <name>");
              process.exit(1);
            }
            await playbookHistoryCommand(playbookHistName, {
              dir: options.dir,
              last: options.last ? Number(options.last) : undefined,
            });
            break;
          }

          default: {
            console.error(`   Unknown playbook subcommand: ${subcommand}`);
            console.error(
              "   Usage: converge playbook <list|info|history> [options]",
            );
            process.exit(1);
          }
        }
        break;
      }

      case "inspect": {
        await inspectCommand({
          dir: options.dir,
          task: options.__task || options.task as string,
          converge: options.converge as boolean,
          json: options.json as boolean,
          depth: options.depth != null ? Number(options.depth) : undefined,
          sessions: options.sessions as boolean,
          verbose: options.verbose || options.v,
        });
        break;
      }

      case "shims": {
        const shimName = positional[0];
        if (!shimName) {
          console.error("❌ Usage: converge shims <name> [args...]");
          console.error("   Available shims: grep, wc, jq, find");
          console.error(
            '   Example: converge shims grep -q "export default" src/App.tsx',
          );
          process.exit(1);
        }

        const { dirname: shimDirname, join: shimJoin } =
          await import("node:path");
        const { fileURLToPath: shimFileURLToPath } = await import("node:url");
        const { existsSync: shimExists } = await import("node:fs");
        const { execSync: shimExec } = await import("node:child_process");

        const shimThisDir = shimDirname(shimFileURLToPath(import.meta.url));
        const shimsDir = shimJoin(shimThisDir, "..", "shims");
        const jsPath = shimJoin(shimsDir, shimName + ".js");
        const tsPath = shimJoin(shimsDir, shimName + ".ts");

        let runner: string;
        let shimPath: string;
        if (shimExists(jsPath)) {
          runner = "node";
          shimPath = jsPath;
        } else if (shimExists(tsPath)) {
          runner = "tsx";
          shimPath = tsPath;
        } else {
          console.error(`❌ Shim not found: ${shimName}`);
          console.error(`   Looked in: ${shimsDir}`);
          process.exit(1);
        }

        // Pass raw args after shim name — bypass parsed options to preserve flags like -q
        const rawArgs = process.argv.slice(2);
        const shimNameIdx = rawArgs.indexOf(shimName);
        const rawShimArgs = rawArgs
          .slice(shimNameIdx + 1)
          .filter((a) => a !== "--");
        const shimArgs = rawShimArgs
          .map((a) => (a.includes(" ") ? `"${a}"` : a))
          .join(" ");
        const shimCmd = `${runner} "${shimPath}" ${shimArgs}`.trim();

        console.log(`🔧 Shim: ${shimName}`);
        console.log(`   Path: ${shimPath}`);
        console.log(`   Runner: ${runner}`);
        console.log(`   Command: ${shimCmd}`);

        if (rawShimArgs.length > 0) {
          console.log(`\n   Executing...\n`);
          try {
            const projectDir = resolve(options.dir || ORIGINAL_CWD);
            const output = shimExec(shimCmd, {
              cwd: projectDir,
              stdio: "pipe",
              encoding: "utf-8",
            });
            if (output) console.log(output);
            console.log(`   ✅ Exit code: 0`);
          } catch (err: any) {
            if (err.stdout) console.log(err.stdout);
            if (err.stderr) console.error(err.stderr);
            console.log(`   ❌ Exit code: ${err.status}`);
            process.exit(err.status || 1);
          }
        }
        break;
      }

      case "metrics": {
        await metricsCommand({
          dir: options.dir,
          byEpic: options["by-epic"] || options.byEpic,
          byTask: options["by-task"] || options.byTask,
          byModel: options["by-model"] || options.byModel,
          top: options.top ? Number(options.top) : undefined,
          json: options.json as boolean,
          save: options.save as boolean,
        });
        break;
      }

      case "swebench": {
        const { swebenchCommand } = await import("@converge/swebench");
        const { playbookName, epicId } = await swebenchCommand({
          dir: options.dir,
          instance: options.instance as string,
          repo: options.repo as string,
          limit: options.limit ? Number(options.limit) : undefined,
          refresh: options.refresh as boolean,
          verbose: options.verbose || options.v,
        });

        // Set playbook context and delegate to run
        const searchDir = resolve(options.dir || ORIGINAL_CWD);
        setPlaybookScope(playbookName, searchDir);
        await initPlaybookJournal(searchDir, playbookName);

        await runAutonomousCommand({
          dir: options.dir,
          filter: epicId,
          force: options.force || false,
          resume: options.resume || true,
          restart: options.restart || false,
          step: options.step || false,
          dry: options.dry || false,
          analyze: false,
          unblock: false,
          wbs: false,
          inc: false,
          maxDuration: options["max-duration"] || options.maxDuration,
          checkInterval: options["check-interval"] || options.checkInterval,
          autoFix: false,
          selfPlan: false,
          verbose: options.verbose || options.v,
        });

        clearPlaybookScope();
        break;
      }

      case "tbench": {
        const { tbenchCommand } = await import("@converge/tbench");
        const tbTasksDir = options["tasks-dir"] || options.tasksDir;
        if (!tbTasksDir) {
          console.error("\n  --tasks-dir is required for tbench command.\n");
          process.exit(1);
        }
        const { playbookName, epicId } = await tbenchCommand({
          dir: options.dir,
          tasksDir: tbTasksDir as string,
          task: options.task as string,
          category: options.category as string,
          difficulty: options.difficulty as string,
          limit: options.limit ? Number(options.limit) : undefined,
          verbose: options.verbose || options.v,
        });

        // Set playbook context and delegate to run
        const tbSearchDir = resolve(options.dir || ORIGINAL_CWD);
        setPlaybookScope(playbookName, tbSearchDir);
        await initPlaybookJournal(tbSearchDir, playbookName);

        await runAutonomousCommand({
          dir: options.dir,
          filter: epicId,
          force: options.force || false,
          resume: options.resume || true,
          restart: options.restart || false,
          step: options.step || false,
          dry: options.dry || false,
          analyze: false,
          unblock: false,
          wbs: false,
          inc: false,
          maxDuration: options["max-duration"] || options.maxDuration,
          checkInterval: options["check-interval"] || options.checkInterval,
          autoFix: false,
          selfPlan: false,
          verbose: options.verbose || options.v,
        });

        clearPlaybookScope();
        break;
      }

      case "studio": {
        await studioCommand(
          {
            dev: !!options.dev,
            port: options.port ? Number(options.port) : undefined,
            host: options.host as string | undefined,
          },
          options.verbose || options.v,
        );
        break;
      }

      case "help":
      case "--help":
      case "-h": {
        showHelp();
        process.exit(0);
      }

      default: {
        console.error(`\n  Unknown command: "${command}"`);
        console.error('  Run "converge help" to see all commands.\n');
        process.exit(1);
      }
    }

    process.exit(0);
  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`);
    if (options.verbose || options.v) {
      console.error("\nStack trace:");
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Progressive-decomposition planning lives in commands-plan.ts. The CLI
// case "plan" delegates to runPlanLayer, which owns scope packet
// gathering, the LLM call, and TS-driven recursion.

function slugifyPrompt(prompt: string): string {
  return prompt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

// Ask the LLM for a 2-5 word kebab-case playbook name. Falls back to the
// raw slugified prompt on any failure so `converge plan` always produces
// a usable directory name.
async function suggestPlaybookName(
  prompt: string,
  agentfn: typeof import("@converge/agentfn").agentfn,
): Promise<string> {
  const fallback = slugifyPrompt(prompt) || "plan";
  try {
    const fn = agentfn({
      timeoutMs: 60_000,
      enableSkills: false,
    });
    const namingPrompt = [
      "You name a new converge playbook from the user's intent.",
      "Reply with ONLY a kebab-case slug, 2-5 words, lowercase a-z and",
      "digits and hyphens, no extension, no quotes, no explanation.",
      "Capture the noun (what is built), not the verb (build/create).",
      "",
      "Examples:",
      '  intent: "create a new playbook to implement mission control for converge"',
      "  name:   mission-control",
      "",
      '  intent: "build a baby-tracker mobile app with sleep and feed logs"',
      "  name:   baby-tracker-app",
      "",
      `intent: "${prompt.replace(/"/g, '\\"')}"`,
      "name:",
    ].join("\n");
    const result = await fn(namingPrompt);
    const raw = String(result.raw ?? result.data ?? "").trim();
    const match = raw.match(/[a-z0-9]+(?:-[a-z0-9]+)+/);
    const slug = match ? match[0] : "";
    if (slug.length >= 3 && slug.length <= 50) return slug;
  } catch {
    // fall through
  }
  return fallback;
}

// Run if executed directly (cross-platform: handles symlinks and Windows path format differences)
import { pathToFileURL } from "node:url";
import { realpathSync } from "node:fs";
const _resolvedArgv = (() => {
  try {
    return realpathSync(process.argv[1]);
  } catch {
    return process.argv[1];
  }
})();
const _isMain =
  _resolvedArgv &&
  (import.meta.url === `file://${_resolvedArgv}` ||
    import.meta.url === pathToFileURL(_resolvedArgv).href);
if (_isMain) main();

export { main };
