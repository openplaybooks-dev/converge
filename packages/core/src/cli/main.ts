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

import { resolve, join } from "node:path";
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
  timelineCommand,
  type InspectOptions,
} from "./commands-inspect.ts";
import { journalCommand } from "./commands-journal.ts";
import { JournalCleanup } from "../checkpoint/cleanup.ts";
import {
  initCommand,
  runCommand,
  statusCommand,
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
} from "../playbook/loader.ts";
import {
  generateEpicFromPlaybook,
  mergeRunConfig,
} from "../playbook/executor.ts";
import { initPlaybookJournal, appendTrend } from "../playbook/journal.ts";
import type { PlaybookRunConfig } from "../playbook/types.ts";
import { resolveConvergeConfig } from "../config/loader.ts";
import { validateConvergeConfig } from "../config/validator.ts";
import { HookRegistry } from "../hooks/registry.ts";
import type { HookEvent } from "../hooks/types.ts";
import { registerCleanupHandlers } from "../agent-manager/index.js";

/* ------------------------------------------------------------------ */
/*  Argument Parser                                                   */
/* ------------------------------------------------------------------ */

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
      // Short flags
      const flag = arg.slice(1);
      options[flag] = true;
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
🤖 Converge - AI-First Autonomous Framework

USAGE:
  converge <command> [options]

COMMANDS:
  run [epic/task]       Run autonomous agent loop (optionally filter to one epic or task)
  run --wbs [filter]    Run only WBS seeding phase (errors if already seeded)
  run --wbs --inc [f]   Incremental WBS re-seed (update + add tasks, keep progress)
  init                  Initialize new converge project
  verify                Verify config, structure, format, and detect issues
  status                Show project status and progress
  checkpoint            Show checkpoint (iteration, completed/locked tasks)
  reset <taskId...>     Reset task(s) to re-run (removes journals + WBS tasks)
  reset --all           Reset entire project to initial state
  cleanup               Remove orphaned journal directories for deleted/renamed tasks
  plugins               List loaded plugins
  tree [taskId|epicId]  Visualize project task tree (optionally filter to one task/epic)
  gantt                 Show Gantt chart timeline of execution order
  graph [filter]        Show task dependency graph (add --detail for data flow)
  journal [epicId]      Show execution history from logs (attempts, outcomes, timing)
  backlog               Show accumulated backlog items (tech debt, TODOs, etc.)
  trend                 Show weighted gap convergence trend across runs
  goals                 Evaluate project goals and generate remediation tasks
  validate              Validate checkpoint consistency with filesystem
  metrics               Show cost, token, tool, and model metrics from journal logs
  swebench              Run SWE-bench Lite evaluation (AI coding agent benchmark)
  inspect [sessionId]   Inspect execution sessions (detailed navigation and logs)
  timeline [sessionId]  DEPRECATED: Use 'inspect' instead
  plan <prompt>         Generate a playbook from a prompt (shorthand for run --playbook=plan)
  skills list           List available skills in the converge
  skills install        Install skills to a target directory (default: .claude/skills)
  playbook list         List available playbooks
  playbook info <name>  Show playbook details (inputs, DAG, run config, checks)
  playbook history <n>  Show execution history for a playbook
  help                  Show this help

OPTIONS (for 'run' command):
  --playbook=NAME       Run a named playbook (generate epic + execute)
  --step                Run only one iteration then exit (debug mode)
  --force               Force-run the filtered task, bypassing blocked/completed state
  --resume              Resume from interrupted state (recover stuck tasks)
  --restart             Reset all tasks to pending and start fresh
  --dry, --plan         Dry run mode - planning only, no execution
  --preflight           Preflight mode - run AI strategy selection but stop before executing tasks
  --unblock             With --step, find first blocked task and run through UnblockStrategy pipeline
  --converge            Compound convergence mode: weighted scoring, gap ledger, partial progress
  --wbs                 Run only the WBS seeding phase (use with filter)
  --inc                 With --wbs, allow re-seeding already-seeded WBS parents
  --max-iterations=N    Maximum iterations (default: 100)
  --max-duration=N      Maximum duration in ms (default: 259200000 / 72 hours)
  --check-interval=N    Check interval in ms (default: 5000 / 5 seconds)
  --auto-fix=BOOL       Enable auto-fixing (default: true)
  --self-plan=BOOL      Enable self-planning (default: true)
  --verbose             Enable verbose logging
  --dir=PATH            Project directory (default: current directory)

GLOBAL OPTIONS:
  --playbook=NAME       Scope to a named playbook (works on any command)
                        For 'run': generates epic from playbook template, then executes
                        For other commands: reads from that playbook's journal
  --dir=PATH            Project directory (default: current directory)

OPTIONS (for 'init' command):
  --name=NAME           Project name (required)
  --description=DESC    Project description

OPTIONS (for 'skills install' command):
  --target=PATH         Target directory (default: .claude/skills)
  --skill=NAME          Specific skill to install (default: install all)
  --force               Force overwrite existing skills
  --verbose             Show detailed installation info

OPTIONS (for 'plan' command):
  --prompt=TEXT         What to build (can also be passed as first positional arg)
  --name=NAME           Name for the generated playbook (default: derived from prompt)
  --update              Update an existing playbook instead of creating new

OPTIONS (for 'swebench' command):
  --instance=ID         Filter to specific instance(s), comma-separated
  --repo=REPO           Filter to specific repo(s), comma-separated
  --limit=N             Maximum number of instances to run
  --refresh             Force re-download of dataset

OPTIONS (for 'inspect' command):
  --session=ID          View specific session (omit to see all sessions)
  --last-session        Show only the latest session
  --last=N              Show last N sessions
  --task=ID             Filter by task ID
  --attempt=N           Drill into specific attempt number
  --phase=NAME          Filter to specific phase
  --events=TYPES        Show only specific event types (comma-separated)
  --converge            Show convergence graph progress for a task (requires --task)
  --dirs                Show directory structure
  --tools               Show detailed tool usage
  --toolDetails         Show full tool parameters and results
  --ai                  Show AI activity details
  --validation          Show validation check details
  --json                Export to JSON format
  --compact             Compact view (fewer details)
  --tree                Tree view of session directories

EXAMPLES:
  # Initialize a new project
  converge init --name="My Project"

  # Run autonomous agent loop
  converge run

  # Run only a specific epic
  converge run 02-ux-ui-design-screen-generation

  # Run only a specific task within an epic
  converge run 02-ux-ui-design-screen-generation/003-generate-all-screens

  # Run one step only (debug mode)
  converge run --step

  # Dry run - planning only, no execution (for debugging)
  converge run --step --dry

  # Run with custom settings
  converge run --max-iterations=50 --verbose

  # Re-seed WBS (errors if already seeded)
  converge run --wbs 03-build-screens

  # Incremental WBS re-seed (preserves child progress)
  converge run --wbs --inc 03-build-screens

  # Run without auto-fix (manual mode)
  converge run --auto-fix=false

  # Verify config, structure, format, deps
  converge verify

  # Check status
  converge status

  # Reset a task (removes journal, keeps output files)
  converge reset 003-generate-html-designs

  # Reset and delete WBS-generated task files
  converge reset 003-generate-html-designs --wbs

  # Reset and delete output files
  converge reset 003-generate-html-designs --outputs

  # Full reset (journal + WBS + outputs)
  converge reset 003-generate-html-designs --all

  # Reset multiple tasks at once
  converge reset 001-create-ux-overview 002-generate-design-system --all

  # Reset entire project to initial state
  converge reset --all

  # Clean up orphaned journals (for deleted/renamed tasks)
  converge cleanup

  # Clean up with verbose output
  converge cleanup --verbose

  # List available skills
  converge skills list

  # Install all skills to .claude/skills
  converge skills install

  # Install a specific skill
  converge skills install --skill=converge-control

  # Install to a custom directory
  converge skills install --target=custom-skills-dir

  # Force overwrite existing skills
  converge skills install --force

  # List available workflows
  converge workflow list

  # Show details about a workflow
  converge workflow info fix-issue

  # Run a workflow (creates task on main board + executes)
  converge workflow run fix-issue --issue=42
  converge workflow run develop-feature --feature="add dark mode"

  # Dry run — create task but don't execute
  converge workflow run fix-issue --issue=42 --dry

  # Show full task tree
  converge tree

  # Show only tasks in a specific epic
  converge tree 02-prepare-designs

  # Show a specific task and its WBS subtasks
  converge tree 002-generate-screen-prompts

  # Show Gantt chart timeline
  converge gantt

  # Show only blocked tasks
  converge gantt --only-blocked

  # Show only ready (runnable) tasks
  converge gantt --only-ready

  # Show execution history from journal
  converge journal

  # Show execution history for specific epic
  converge journal 03-implement-app

  # Show only tasks with retries (multiple attempts)
  converge journal --only-retries

  # Evaluate project goals
  converge goals

  # Evaluate with detail output for failed goals
  converge goals --verbose

  # Preview remediation plan without writing files
  converge goals --plan --dry

  # Auto-fix checkpoint inconsistencies
  converge verify --fix

  # Show all sessions timeline (default view)
  converge inspect

  # Show only the latest session
  converge inspect --last-session

  # Show last 5 sessions
  converge inspect --last=5

  # Inspect specific session
  converge inspect --session=2026-04-05T05-07-19-abc123

  # Show directory structure
  converge inspect --dirs

  # Filter by task
  converge inspect --session=<id> --task=001-gather-idea-generate-ux

  # Show detailed tool calls with parameters
  converge inspect --session=<id> --toolDetails

  # Show AI activity
  converge inspect --session=<id> --ai

  # Export to JSON
  converge inspect --session=<id> --json > session.json

AUTONOMOUS LOOP:
  The 'converge run' command starts an autonomous agent loop that:
  1. 🔍 Discovers gaps in the project
  2. 🎯 Prioritizes work (tasks → epics → project)
  3. 🧠 Self-plans approach based on gaps and history
  4. ⚡ Executes fixes automatically (if auto-fix enabled)
  5. 🔄 Re-evaluates and self-corrects
  6. 📊 Auto-writes to journals at .converge/journal/
  7. 🔁 Repeats until all gaps resolved or max iterations reached

DIRECTORY STRUCTURE:
  .converge/
  ├── journal/          # Hierarchical gap tracking and event logs
  │   ├── project/      # Project-level journal
  │   └── epics/        # Epic and task journals
  ├── config.yml        # Project configuration
  ├── epics/            # Epic definitions
  └── storage/          # Runtime storage

For more: https://github.com/myanlabs/converge
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
  const { command, options, positional } = parseArgs(process.argv.slice(2));

  // Register agent cleanup handlers
  registerCleanupHandlers();

  setupGracefulShutdown();

  // ── Global --playbook context ────────────────────────────────────
  // When --playbook is set on ANY command, set CONVERGE_PLAYBOOK so
  // journal paths route through journal/{playbook}/tasks/.
  // For 'run', the playbook also generates an epic from template.
  if (options.playbook && command !== "run" && command !== "plan") {
    process.env.CONVERGE_PLAYBOOK = String(options.playbook);
  }

  // Auto-detect playbook context for ALL commands when no explicit --playbook.
  // Scan the journal directory for playbook folders (e.g. journal/create-web/tasks/)
  // so journal paths, tree, status, etc. all route correctly.
  if (!process.env.CONVERGE_PLAYBOOK) {
    const autoSearchDir = resolve(options.dir || process.cwd());

    // Strategy 1: No project.yaml — try loading 'default' playbook
    const autoResolved = await resolveConvergeConfig(autoSearchDir);
    if (!autoResolved) {
      const autoPbName = "default";
      const autoPb = await loadPlaybook(autoPbName, autoSearchDir);
      if (autoPb) {
        process.env.CONVERGE_PLAYBOOK = autoPbName;
      }
    }

    // Strategy 2: project.yaml exists but no playbook set — detect from journal
    // When a previous playbook run created journal/{name}/tasks/, we need to
    // set CONVERGE_PLAYBOOK so path resolution matches the existing structure.
    if (!process.env.CONVERGE_PLAYBOOK) {
      const { existsSync, readdirSync, statSync } = await import("node:fs");
      const { join } = await import("node:path");
      const journalDir = join(autoSearchDir, ".converge", "journal");
      if (existsSync(journalDir)) {
        for (const entry of readdirSync(journalDir)) {
          if (entry === "epics" || entry === "project" || entry === "default")
            continue;
          const pbDir = join(journalDir, entry);
          if (!statSync(pbDir).isDirectory()) continue;
          const tasksDir = join(pbDir, "tasks");
          if (existsSync(tasksDir) && statSync(tasksDir).isDirectory()) {
            process.env.CONVERGE_PLAYBOOK = entry;
            break;
          }
        }
      }
    }

    // Strategy 3: Discover from .converge/playbooks/ — auto-select sole playbook
    // When there's exactly one playbook on disk, use it without requiring --playbook.
    if (!process.env.CONVERGE_PLAYBOOK) {
      const discovered = await discoverPlaybooks(autoSearchDir);
      if (discovered.length === 1) {
        process.env.CONVERGE_PLAYBOOK = discovered[0].def.name;
      }
    }
  }

  try {
    switch (command) {
      case "run": {
        // Auto-discover PROJECT.md from the target directory (or cwd)
        const searchDir = resolve(options.dir || process.cwd());
        const resolved = await resolveConvergeConfig(searchDir);

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
          let pbName = options.playbook
            ? String(options.playbook)
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
                maxIterations: pb.def.run?.maxIterations,
                milestone: (pb.def.run as any)?.milestone,
              },
              skills:
                typeof pb.def.skills === "object" &&
                !Array.isArray(pb.def.skills)
                  ? (pb.def.skills as Record<string, string>)
                  : undefined,
            };
            console.log(`\n📋 Loaded config from playbook: ${pbName}`);
            // Set CONVERGE_PLAYBOOK so journal paths route correctly
            // through journal/{playbook}/tasks/ even without --playbook flag
            process.env.CONVERGE_PLAYBOOK = pbName;
          }
        }

        // ── Playbook layer ───────────────────────────────────────────
        // --playbook=<name> wraps the run: load playbook, generate epic,
        // set journal context, then fall through to normal run with filter.
        let runFilter = positional[0] || options.filter;
        let playbookName: string | undefined;
        let playbookRunCfg: PlaybookRunConfig | undefined;
        const runStartTime = Date.now();

        if (options.playbook) {
          playbookName = String(options.playbook);
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
            "playbook",
            "step",
            "force",
            "resume",
            "restart",
            "converge",
            "unblock",
            "wbs",
            "inc",
            "preflight",
            "analyze",
            "max-iterations",
            "maxIterations",
            "max-duration",
            "maxDuration",
            "check-interval",
            "checkInterval",
            "auto-fix",
            "autoFix",
            "self-plan",
            "selfPlan",
            "mode",
          ]);
          const vars: Record<string, string> = {};
          for (const [key, value] of Object.entries(options)) {
            if (!cliKeys.has(key)) {
              vars[key] = String(value);
            }
          }

          let resolvedPb;
          try {
            resolvedPb = resolvePlaybook(pb, vars);
          } catch (err: any) {
            console.error(`\n   ${err.message}\n`);
            process.exit(1);
          }

          // Generate epic from template
          console.log(`\n   Playbook: ${playbookName}`);
          console.log(`   Epic: ${resolvedPb.epicId}`);
          await generateEpicFromPlaybook(resolvedPb, searchDir);

          // Merge playbook run config with CLI overrides
          const cliOverrides: Partial<PlaybookRunConfig> = {};
          if (options.mode)
            cliOverrides.mode = options.mode as PlaybookRunConfig["mode"];
          if (options.converge) cliOverrides.mode = "converge";
          if (options.step) cliOverrides.mode = "step";
          const durOpt = options["max-duration"] || options.maxDuration;
          if (durOpt !== undefined) {
            const dur = parseDuration(durOpt);
            if (dur !== undefined) cliOverrides.maxDuration = dur;
          }
          const iterOpt = options["max-iterations"] || options.maxIterations;
          if (iterOpt !== undefined)
            cliOverrides.maxIterations = Number(iterOpt);
          if (options.resume !== undefined)
            cliOverrides.resume = Boolean(options.resume);

          playbookRunCfg = mergeRunConfig(pb.def.run, cliOverrides);

          // Init playbook journal + set context
          await initPlaybookJournal(searchDir, playbookName);
          console.log(`   Mode: ${playbookRunCfg.mode}\n`);

          process.env.CONVERGE_PLAYBOOK = playbookName;
          runFilter = resolvedPb.epicId;
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
            step: options.step || playbookRunCfg?.mode === "step" || false,
            dry: isDry,
            analyze: options.preflight || options.analyze || false,
            unblock: options.unblock || false,
            converge:
              options.converge || playbookRunCfg?.mode === "converge" || false,
            wbs: options.wbs || false,
            inc: options.inc || false,
            maxIterations:
              options["max-iterations"] ||
              options.maxIterations ||
              playbookRunCfg?.maxIterations ||
              convergeConfig?.runtime?.maxIterations,
            maxDuration:
              options["max-duration"] ||
              options.maxDuration ||
              playbookRunCfg?.maxDuration,
            checkInterval: options["check-interval"] || options.checkInterval,
            autoFix: options["auto-fix"] ?? options.autoFix ?? true,
            selfPlan: options["self-plan"] ?? options.selfPlan ?? true,
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
          delete process.env.CONVERGE_PLAYBOOK;
        }
        break;
      }

      case "init": {
        if (!options.name && positional.length === 0) {
          console.error("❌ Error: Project name required");
          console.error('Usage: converge init --name="Project Name"');
          process.exit(1);
        }

        await initCommand({
          name: options.name || positional[0],
          description: options.description,
          dir: options.dir,
          verbose: options.verbose || options.v,
        });
        break;
      }

      case "verify": {
        const taskArg =
          typeof options.task === "string"
            ? options.task
            : options.task
              ? positional[0]
              : undefined;
        await verifyFullCommand({
          dir: options.dir,
          fix: options.fix || false,
          rules: options.rules || false,
          task: taskArg,
        });
        break;
      }

      case "status": {
        await statusCommand({
          dir: options.dir,
          verbose: options.verbose || options.v,
        });
        break;
      }

      case "checkpoint": {
        await checkpointCommand({
          dir: options.dir,
          verbose: options.verbose || options.v,
        });
        break;
      }

      case "reset": {
        if (!options.all && positional.length === 0) {
          console.error(
            "❌ Usage: converge reset <taskId> [taskId...] [--outputs] [--wbs] [--all]",
          );
          console.error(
            "   Example: converge reset 003-generate-html-designs --all",
          );
          console.error(
            "   Example: converge reset --all  # reset entire project",
          );
          process.exit(1);
        }
        await resetCommand(positional, {
          dir: options.dir,
          verbose: options.verbose || options.v,
          outputs: options.outputs || false,
          wbs: options.wbs || false,
          all: options.all || false,
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

      case "tree": {
        await treeCommand({
          root: options.dir || options.root,
          filter: positional[0] || options.filter,
          showPaths: options["show-paths"] || options.showPaths,
          showDescriptions:
            options["show-descriptions"] || options.showDescriptions,
          onlyIncomplete: options["only-incomplete"] || options.onlyIncomplete,
          maxDepth: options["max-depth"]
            ? Number(options["max-depth"])
            : undefined,
          showCursor: options["show-cursor"] || options.showCursor,
          detail: options.detail || false,
        });
        break;
      }

      case "gantt": {
        await ganttCommand({
          dir: options.dir,
          onlyBlocked: options["only-blocked"] || options.onlyBlocked,
          onlyReady: options["only-ready"] || options.onlyReady,
        });
        break;
      }

      case "graph": {
        await graphCommand({
          dir: options.dir,
          detail: options.detail || false,
          filter: positional[0] || options.filter,
        });
        break;
      }

      case "journal": {
        await journalCommand({
          root: options.dir || options.root,
          epic: positional[0] || options.epic,
          onlyRetries: options["only-retries"] || options.onlyRetries,
        });
        break;
      }

      case "backlog": {
        await backlogCommand({
          dir: options.dir,
          epic: positional[0] || options.epic,
          severity: options.severity as string,
          json: options.json || false,
        });
        break;
      }

      case "trend": {
        const { formatTrendTable } = await import("../converge/gap-ledger.ts");
        const trendProjectDir = resolve(options.dir || process.cwd());
        console.log("\n" + formatTrendTable(trendProjectDir) + "\n");
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

      case "cleanup": {
        const projectDir = resolve(options.dir || process.cwd());
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

        const prompt = options.prompt || positional[0];
        if (!prompt) {
          console.error("\n   ❌ Missing required --prompt");
          console.error(
            '   Usage: converge plan --prompt "Your plan description"',
          );
          console.error('      or: converge plan "Your plan description"\n');
          process.exit(1);
        }

        const planName =
          (options.name as string) ||
          String(prompt)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
            .slice(0, 50);

        const planSearchDir = resolve(options.dir || process.cwd());
        const planResolved = await resolveConvergeConfig(planSearchDir);

        let planHookRegistry: HookRegistry | undefined;
        let planConvergeConfig = planResolved?.config;

        if (planResolved) {
          const { config, configPath } = planResolved;
          console.log(`\n📋 Loaded config: ${configPath}`);
          const validated = validateConvergeConfig(config, configPath);
          planConvergeConfig = validated;
          planHookRegistry = new HookRegistry();
          if (validated.hooks) {
            planHookRegistry.registerAll(validated.hooks, "user");
          }
          activeRegistry = planHookRegistry;
        }

        if (!planConvergeConfig) {
          planConvergeConfig = {
            name: "plan",
            description: `Generate playbook: ${prompt}`,
            dir: planSearchDir,
            runtime: { maxIterations: 10 },
          };
          console.log(`\n📋 Plan: ${planName}`);
        }

        // Write inline TASK.md — no playbook template needed
        const planTaskDir = join(
          planSearchDir,
          ".converge",
          "playbooks",
          "plan",
          "tasks",
          "001-plan",
        );
        const planPlaybookDir = join(
          planSearchDir,
          ".converge",
          "playbooks",
          "plan",
        );
        if (!existsSync(planTaskDir)) {
          await mkdirFs(planTaskDir, { recursive: true });

          await writeFileFs(
            join(planPlaybookDir, "playbook.yml"),
            [
              "name: plan",
              `description: "Generate playbook: ${prompt}"`,
              "",
              "run:",
              "  mode: autonomous",
              "  maxIterations: 10",
              "  maxTaskAttempts: 3",
              "  resume: true",
            ].join("\n"),
            "utf8",
          );

          await writeFileFs(
            join(planTaskDir, "TASK.md"),
            buildPlanTaskMd(prompt, planName, !!options.update),
            "utf8",
          );
        }

        // Init journal + run
        const planPlaybookName = "plan";
        await initPlaybookJournal(planSearchDir, planPlaybookName);
        process.env.CONVERGE_PLAYBOOK = planPlaybookName;
        console.log(`   Mode: autonomous\n`);

        const planRunStartTime = Date.now();
        try {
          await runAutonomousCommand({
            dir: planConvergeConfig?.dir || options.dir,
            filter: "001-plan",
            force: options.force || false,
            resume: options.resume || false,
            restart: options.restart || false,
            step: options.step || false,
            dry: options.dry || false,
            analyze: false,
            unblock: false,
            converge: false,
            wbs: false,
            inc: false,
            maxIterations: 10,
            maxDuration: options["max-duration"] || options.maxDuration,
            checkInterval: options["check-interval"] || options.checkInterval,
            autoFix: true,
            selfPlan: false,
            verbose: options.verbose || options.v,
            convergeConfig: planConvergeConfig,
            hookRegistry: planHookRegistry,
          });

          await appendTrend(planSearchDir, planPlaybookName, {
            sessionId: `run-${new Date().toISOString()}`,
            timestamp: new Date().toISOString(),
            tasksTotal: 1,
            tasksComplete: 1,
            tasksFailed: 0,
            totalAttempts: 1,
            durationMs: Date.now() - planRunStartTime,
          });

          // Show next steps
          const generatedDir = join(
            planSearchDir,
            ".converge",
            "playbooks",
            planName,
          );
          if (existsSync(generatedDir)) {
            console.log(
              `\n✅ Playbook generated: .converge/playbooks/${planName}/`,
            );
            console.log(`\n   To run it:`);
            console.log(`   converge run --playbook=${planName}\n`);
          }
        } catch (err: any) {
          await appendTrend(planSearchDir, planPlaybookName, {
            sessionId: `run-${new Date().toISOString()}`,
            timestamp: new Date().toISOString(),
            tasksTotal: 1,
            tasksComplete: 0,
            tasksFailed: 1,
            totalAttempts: 1,
            durationMs: Date.now() - planRunStartTime,
          });
          throw err;
        } finally {
          delete process.env.CONVERGE_PLAYBOOK;
        }
        break;
      }

      case "skills": {
        const subcommand = positional[0] || "list";

        switch (subcommand) {
          case "list": {
            await skillsListCommand({
              verbose: options.verbose || options.v,
            });
            break;
          }

          case "install": {
            await skillsInstallCommand({
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
          session: options.session || positional[0], // Support both --session=<id> and positional arg
          last: options.last ? Number(options.last) : undefined,
          lastSession: options["last-session"] as boolean,
          task: options.task as string,
          attempt: options.attempt ? Number(options.attempt) : undefined,
          phase: options.phase as string,
          events: options.events as string,
          converge: options.converge as boolean,
          dirs: options.dirs as boolean,
          tools: options.tools as boolean,
          toolDetails: options.toolDetails as boolean,
          ai: options.ai as boolean,
          validation: options.validation as boolean,
          json: options.json as boolean,
          compact: options.compact as boolean,
          tree: options.tree as boolean,
          verbose: options.verbose || options.v,
        });
        break;
      }

      case "timeline": {
        // Deprecated: redirect to inspect
        await timelineCommand({
          dir: options.dir,
          session: positional[0],
          last: options.last ? Number(options.last) : undefined,
          task: options.task as string,
          events: options.events as string,
          tools: options.tools as boolean,
          ai: options.ai as boolean,
          json: options.json as boolean,
          compact: options.compact as boolean,
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
            const projectDir = resolve(options.dir || process.cwd());
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
        process.env.CONVERGE_PLAYBOOK = playbookName;
        const searchDir = resolve(options.dir || process.cwd());
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
          converge: false,
          wbs: false,
          inc: false,
          maxIterations: options["max-iterations"] || options.maxIterations || 500,
          maxDuration: options["max-duration"] || options.maxDuration,
          checkInterval: options["check-interval"] || options.checkInterval,
          autoFix: false,
          selfPlan: false,
          verbose: options.verbose || options.v,
        });

        delete process.env.CONVERGE_PLAYBOOK;
        break;
      }

      case "help":
      case "--help":
      case "-h":
      default: {
        showHelp();
        process.exit(0);
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

/* ------------------------------------------------------------------ */
/*  Plan prompt builder                                                */
/* ------------------------------------------------------------------ */

function buildPlanTaskMd(
  prompt: string,
  name: string,
  isUpdate = false,
): string {
  const guide = isUpdate ? "plan-existing-playbook" : "plan-new-playbook";
  const verb = isUpdate ? "Update" : "Generate";

  return `---
title: "${verb} Playbook — ${prompt}"
skills:
  - converge-planning
outputs:
  - .converge/playbooks/${name}/playbook.yml
checks:
  - id: playbook-yml-exists
    cmd: test -f .converge/playbooks/${name}/playbook.yml
    description: playbook.yml created
  - id: has-tasks-dir
    cmd: test -d .converge/playbooks/${name}/tasks
    description: Tasks directory created
  - id: has-task-files
    cmd: test $(find .converge/playbooks/${name}/tasks -name "TASK.md" 2>/dev/null | wc -l) -ge 2
    description: At least 2 TASK.md files generated
---

# ${verb} Playbook: ${prompt}

You are ${isUpdate ? "updating an existing" : "generating a new"} converge playbook from a user's prompt.

## Inputs

- **Prompt:** "${prompt}"
- **Playbook name:** "${name}"
- **Mode:** ${isUpdate ? "Update existing playbook" : "Create new playbook"}

## Instructions

1. Load the \`converge-planning\` skill
2. Read the guide: \`guides/${guide}.md\`
3. Follow the guide's steps exactly — it covers scanning, planning, writing files, and verification
4. Target output directory: \`.converge/playbooks/${name}/\`
`;
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
