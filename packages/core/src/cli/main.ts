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
  type InspectOptions,
} from "./commands-inspect.ts";
import { journalCommand } from "./commands-journal.ts";
import { JournalCleanup } from "../checkpoint/cleanup.ts";
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
} from "../playbook/loader.ts";
import {
  generateEpicFromPlaybook,
  mergeRunConfig,
} from "../playbook/executor.ts";
import { initPlaybookJournal, appendTrend } from "../playbook/journal.ts";
import {
  setPlaybookScope,
  clearPlaybookScope,
} from "../journal/structure.ts";
import type { PlaybookRunConfig } from "../playbook/types.ts";
import { showCommandHelp } from "./help.ts";
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
Converge - Autonomous Agent Framework

USAGE
  converge <command> [options]

WORKFLOW
  init                        Initialize new project
  plan <prompt>               Generate playbook from a prompt
  run [filter]                Execute autonomous agent loop
  reset <task...>             Reset task(s) for re-execution
  status [filter]             Show project status and task tree

INSPECTION
  inspect [--task=PATH]       Inspect execution sessions and tasks
  show <view>                 Visualize project data (gantt|graph|journal|backlog|trend)
  metrics                     Show cost, token, and model metrics

MANAGEMENT
  verify                      Verify config, structure, checkpoint consistency
  playbook <sub>              Manage playbooks (list|info|history)
  skills <sub>                Manage skills (list|install)
  goals                       Evaluate project goals and plan remediation

GLOBAL OPTIONS
  --dir=PATH                  Project directory (default: cwd)
  --playbook=NAME             Scope to a named playbook
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
  const { command, options, positional } = parseArgs(process.argv.slice(2));

  // Register agent cleanup handlers
  registerCleanupHandlers();

  setupGracefulShutdown();

  // ── Global --playbook context ────────────────────────────────────
  // When --playbook is set on ANY command, export the playbook scope so
  // scanner, journal, status, run — every code path — sees the same context.
  // Using setPlaybookScope() ensures CONVERGE_PLAYBOOK, CONVERGE_PLAYBOOK_DIR,
  // and CONVERGE_JOURNAL_ROOT stay in sync. `run` and `plan` were previously
  // excluded here and set the scope deep inside their handlers, which meant
  // any discovery/scan that ran before that point saw the wrong scope.
  const globalProjectDir = resolve(options.dir || process.cwd());
  if (options.playbook) {
    setPlaybookScope(String(options.playbook), globalProjectDir);
  }

  // Auto-detect playbook context when no explicit --playbook.
  if (!process.env.CONVERGE_PLAYBOOK) {
    // Strategy 1: No project.yaml — try loading 'default' playbook
    const autoResolved = await resolveConvergeConfig(globalProjectDir);
    if (!autoResolved) {
      const autoPb = await loadPlaybook("default", globalProjectDir);
      if (autoPb) setPlaybookScope("default", globalProjectDir);
    }

    // Strategy 2: project.yaml exists but no playbook set — detect from journal
    if (!process.env.CONVERGE_PLAYBOOK) {
      const { existsSync, readdirSync, statSync } = await import("node:fs");
      const { join } = await import("node:path");
      const journalDir = join(globalProjectDir, ".converge", "journal");
      if (existsSync(journalDir)) {
        for (const entry of readdirSync(journalDir)) {
          if (entry === "epics" || entry === "project" || entry === "default")
            continue;
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
                typeof (pb.def as any).skills === "object" &&
                !Array.isArray((pb.def as any).skills)
                  ? ((pb.def as any).skills as Record<string, string>)
                  : undefined,
            };
            console.log(`\n📋 Loaded config from playbook: ${pbName}`);
            // Export the full playbook scope (playbook, playbook dir, journal root)
            // so journal paths route correctly through journal/{playbook}/ even
            // without --playbook flag.
            setPlaybookScope(pbName, searchDir);
          }
        }

        // ── Playbook layer ───────────────────────────────────────────
        // --playbook=<name> wraps the run: load playbook, generate epic,
        // set journal context, then fall through to normal run with filter.
        let runFilter = positional[0] || options.filter;
        let playbookName: string | undefined;
        let playbookRunCfg: PlaybookRunConfig | undefined;
        let resolvedPb: import("../playbook/types.ts").ResolvedPlaybook | undefined;
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
            "unblock",
            "wbs",
            "inc",
            "preflight",
            "analyze",
            "add",
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
              "../dispatch/dispatch-runner.ts"
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
              `\n   Run "converge run --playbook=${playbookName}" to process.\n`,
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

          // Merge playbook run config with CLI overrides
          const cliOverrides: Partial<PlaybookRunConfig> = {};
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

          setPlaybookScope(playbookName, searchDir);
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
            step: options.step || false,
            dry: isDry,
            analyze: options.preflight || options.analyze || false,
            unblock: options.unblock || false,
            mode: playbookRunCfg?.mode,
            playbook: resolvedPb,
            stall: playbookRunCfg?.stall,
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
        if (options.checkpoint) {
          await checkpointCommand({
            dir: options.dir,
            verbose: options.verbose || options.v,
          });
        } else {
          await treeCommand({
            root: options.dir || options.root,
            filter: positional[0] || options.filter,
            playbook: options.playbook ? String(options.playbook) : undefined,
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
            const trendProjectDir = resolve(options.dir || process.cwd());
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
              "  mode: oneoff",
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
        setPlaybookScope(planPlaybookName, planSearchDir);
        console.log(`   Mode: oneoff\n`);

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
          clearPlaybookScope();
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
          task: options.task as string,
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
        const searchDir = resolve(options.dir || process.cwd());
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
          maxIterations: options["max-iterations"] || options.maxIterations || 500,
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
        const tbSearchDir = resolve(options.dir || process.cwd());
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
          maxIterations: options["max-iterations"] || options.maxIterations || 500,
          maxDuration: options["max-duration"] || options.maxDuration,
          checkInterval: options["check-interval"] || options.checkInterval,
          autoFix: false,
          selfPlan: false,
          verbose: options.verbose || options.v,
        });

        clearPlaybookScope();
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
