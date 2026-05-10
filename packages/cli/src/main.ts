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

// When cwd has project indicators, prefer it over inherited INIT_CWD.
// INIT_CWD preserves the original directory when pnpm changes cwd, but it's also
// inherited by subprocesses spawned with explicit cwd (e.g. integration tests).
// If cwd lacks project indicators, fall back to INIT_CWD for the pnpm case.
const CWD = process.cwd();
const ORIGINAL_CWD =
  existsSync(join(CWD, ".converge")) ||
  existsSync(join(CWD, "playbook.yml")) ||
  existsSync(join(CWD, "playbook.yaml"))
    ? CWD
    : process.env.INIT_CWD || process.env.PWD || CWD;

import { resolve, dirname, join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runAutonomousCommand } from "./commands-run.ts";
import { metricsCommand } from "./commands-metrics.ts";
import { treeCommand } from "./commands-tree.ts";
import { compileCommand } from "./commands-compile.ts";
import { testCommand } from "./commands-test.ts";
import { seedCommand } from "./commands-seed.ts";
import { buildCommand } from "./commands-build.ts";
import { listCommand } from "./commands-list.ts";
import { resetCommand } from "./commands-reset.ts";
import { cleanCommand } from "./commands-clean.ts";
import { ganttCommand } from "./commands-gantt.ts";
import { graphCommand } from "./commands-graph.ts";
import { verifyCommand as verifyFullCommand } from "./commands-validate.ts";
import {
  inspectCommand,
  type InspectOptions,
} from "./commands-inspect.ts";
import { journalCommand } from "./commands-journal.ts";
import {
  initCommand,
  checkpointCommand,
  type InitOptions,
  type CommonOptions,
} from "./commands.ts";
import {
  depsListCommand,
  depsInstallCommand,
} from "./commands-deps.ts";
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
import { acquireRunLock, stopRun, readRunLock, isPidAlive } from "./run-lock.ts";

// Load .env file from the working directory or project root (API keys, backend config, etc.)
{
  for (const dir of [CWD, ORIGINAL_CWD]) {
    const envPath = join(dir, ".env");
    if (!existsSync(envPath)) continue;
    try {
      const content = readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        let value = trimmed.slice(eqIdx + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (key && !process.env[key]) {
          process.env[key] = value;
        }
      }
    } catch {
      // .env file unreadable — skip
    }
  }
}

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
/*  Version                                                           */
/* ------------------------------------------------------------------ */

function getVersion(): string {
  try {
    const pkgPath = join(dirname(fileURLToPath(import.meta.url)), "../package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    return pkg.version || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

/* ------------------------------------------------------------------ */
/*  Help Text                                                         */
/* ------------------------------------------------------------------ */

function showHelp(): void {
  console.log(`
Converge - Autonomous Agent Framework

USAGE
  converge <command> [options]

EXECUTE
  run                         Execute tasks via the convergence loop
  add                         Create a playbook from a prompt, example, or GitHub repo

INSPECT
  list (ls)                   Print tasks matching a selection
  show <view>                 Visualize: gantt, graph, journal, metrics, trend
  inspect                     Inspect execution sessions and tasks

MANAGE
  init                        Scaffold a new project
  clean                       Delete artifacts or reset task state

SELECTION FLAGS
  --select, -s <expr>         Select tasks by ID, tag, status, graph operators, etc.
  --exclude, -e <expr>        Subtract from the selection
  --selector <name>           Shortcut for --select selector:NAME
  --playbook=NAME             Which playbook (required when the project has >1)
  --state=PATH                Path to a prior target/ for state: comparisons
  --defer                     Use prior outputs instead of re-running upstream
  --full-refresh              Force non-incremental execution
  --fail-fast                 Stop on first uncorrectable failure
  --dry                       Print the would-run preview, no execution
  --step                      Run one iteration, then stop

GLOBAL OPTIONS
  --project-dir=PATH          Project directory (default: cwd)
  --verbose, -v               Verbose output

EXAMPLES
  converge init
  converge add --from-prompt "Build a REST API for user management"
  converge add --from-example hello-world
  converge run
  converge run --fail-fast
  converge run --resume
  converge run --dry
  converge list --exclude 'status:complete'
  converge show gantt
  converge show graph --detail
  converge show metrics
  converge inspect --task=01-setup
  converge clean --all --yes

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
 * The `run` command registers its own SIGINT/SIGTERM handlers in commands-run.ts
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
  const parsedArgs = parseArgs(rawArgs);
  const { command, options, positional } = parsedArgs;

  // Register agent cleanup handlers
  registerCleanupHandlers();

  setupGracefulShutdown();

  // ── Global playbook context ───────────────────────────────────────
  // When --playbook=NAME is set, establish the playbook scope so scanner,
  // journal, status, run — every code path — sees the same context.
  const globalProjectDir = resolve(options.dir || ORIGINAL_CWD);
  if (options.playbook) {
    setPlaybookScope(String(options.playbook), globalProjectDir);
  }

  // Auto-detect playbook context when no explicit playbook is set.
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

  // ── --version / -V (any position) ──────────────────────────────────
  if (options.version || options.V) {
    console.log(getVersion());
    process.exit(0);
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
  // events.jsonl, attempts/, Seed-spawned children) is preserved across
  // syncs by `syncPlaybookToJournal`.
  const SYNC_COMMANDS = new Set([
    "run",
    "status",
    "tree",
    "show",
    "inspect",
    "verify",
    "metrics",
    "benchmark",
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

  try {
    switch (command) {
      case "retry":
      case "run": {
        // Auto-discover PROJECT.md from the target directory (or cwd)
        const searchDir = resolve(options.dir || (command === "retry" ? process.cwd() : ORIGINAL_CWD));

        // retry = run --resume (explicitly reuse latest execution)
        if (command === "retry") {
          options.resume = true;
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
            console.error(`\n   Or use --playbook=NAME to target a specific playbook:`);
            console.error(`      converge run --playbook=my-playbook\n`);
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
        // Load playbook, generate epic, set journal context,
        // then fall through to normal run with filter.
        let runFilter = positional[0] || options.filter || options.select;
        let playbookName: string | undefined;
        let playbookRunCfg: PlaybookRunConfig | undefined;
        let resolvedPb: import("../task/playbook/types.ts").ResolvedPlaybook | undefined;
        const runStartTime = Date.now();
        const isDry = options.dry || options.plan || false;
        let releaseRunLock: (() => void) | undefined;

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
          if (errors.length > 0 && !isDry) {
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
            "seed",
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
            "events",
            "eventsFile",
          ]);
          const vars: Record<string, string> = {};
          for (const [key, value] of Object.entries(options)) {
            if (!cliKeys.has(key)) {
              vars[key] = String(value);
            }
          }

          // Dispatch --add (stamp task from seed template) was removed —
          // the dispatch-runner module was deleted in the Phase 1 cleanup.
          // To re-enable, re-implement stampDispatchTask in core or cli.

          try {
            resolvedPb = resolvePlaybook(pb, vars);
          } catch (err: any) {
            console.error(`\n   ${err.message}\n`);
            process.exit(1);
          }

          if (!isDry) {
            try {
              releaseRunLock = acquireRunLock(
                searchDir,
                playbookName,
                ["converge", command, ...process.argv.slice(3)].join(" "),
              );
            } catch (err: any) {
              console.error(`\n❌ ${err.message}`);
              process.exit(1);
            }
            const cleanupLock = () => releaseRunLock?.();
            process.once("exit", cleanupLock);
            process.once("SIGINT", () => { cleanupLock(); process.exit(130); });
            process.once("SIGTERM", () => { cleanupLock(); process.exit(143); });
          }

          console.log(`\n   Playbook: ${playbookName}`);
          console.log(`   Epic: ${resolvedPb.epicId}`);
          await generateEpicFromPlaybook(resolvedPb, searchDir);

          // Refresh playbook-level vars on every run, regardless of mode.
          // installPlaybook only runs on first install (and is skipped entirely
          // in loop/converge/dispatch modes), but CLI flags may differ each
          // invocation — so the root TASK.md's `vars:` frontmatter must be
          // rewritten unconditionally so Seed scripts see up-to-date values
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

          setPlaybookScope(playbookName, searchDir);
          // When --select is provided, use it as the run filter.
          // When omitted, leave runFilter undefined so all tasks are processed.
        }

        // ── Execute ──────────────────────────────────────────────────

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
            playbook: resolvedPb,
            stall: playbookRunCfg?.stall,
            seed: options.seed || false,
            inc: options.inc || false,
            fullRefresh: options["full-refresh"] || false,
            maxDuration:
              options["max-duration"] ||
              options.maxDuration ||
              playbookRunCfg?.maxDuration,
            checkInterval: options["check-interval"] || options.checkInterval,
            autoFix: options["auto-fix"] ?? options.autoFix ?? true,
            selfPlan: options["self-plan"] ?? options.selfPlan ?? true,
            skipCheckLint:
              options["skip-check-lint"] || options.skipCheckLint || false,
            eventsFile: options.events || options.eventsFile,
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
          releaseRunLock?.();
          clearPlaybookScope();
        }
        break;
      }

      case "stop": {
        const projectDir = resolve(options.dir || ORIGINAL_CWD);
        const playbookName = options.playbook ? String(options.playbook) : process.env.CONVERGE_PLAYBOOK || "default";
        const lock = readRunLock(projectDir, playbookName);
        if (!lock) {
          console.log(`No active run lock for playbook "${playbookName}".`);
          break;
        }
        const wasAlive = isPidAlive(lock.pid);
        stopRun(projectDir, playbookName);
        console.log(wasAlive
          ? `Stopped playbook "${playbookName}" run PID ${lock.pid}.`
          : `Removed stale run lock for playbook "${playbookName}".`);
        break;
      }

      case "init": {
        await initCommand({
          name: options.name,
          description: options.description,
          agents: options.agents || options.agent,
          defaultAgent: options["default-agent"] || options.defaultAgent,
          yes: options.yes || options.y || false,
          force: options.force || false,
          dir: options.dir,
          verbose: options.verbose || options.v,
          skills: options.skills || false,
        });
        break;
      }

      case "add": {
        const { addCommand } = await import("./commands-add.ts");
        await addCommand({
          name: options.name as string | undefined,
          fromPrompt:
            (options["from-prompt"] as string) ||
            (options.prompt as string) ||
            undefined,
          fromExample: options["from-example"] as string | undefined,
          fromGithub: options["from-github"] as string | undefined,
          force: (options.force || options.f) as boolean | undefined,
          dir: options.dir as string | undefined,
          verbose: (options.verbose || options.v) as boolean | undefined,
        });
        break;
      }

      case "verify": {
        const taskArg =
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
          let inferredPlaybook: string | undefined = options.playbook
            ? String(options.playbook)
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
            // Explicit playbook set; first positional becomes the filter.
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

      case "show": {
        const view = positional[0];
        if (!view) {
          console.log(
            '\n  Usage: converge show <view>\n\n  Views: gantt, graph, journal, metrics, trend\n\n  Run "converge show --help" for details.\n',
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
          case "trend": {
            const { formatTrendTable } = await import(
              "@converge/core/converge/index.ts"
            );
            const trendProjectDir = resolve(options.dir || ORIGINAL_CWD);
            console.log("\n" + formatTrendTable(trendProjectDir) + "\n");
            break;
          }
          case "metrics":
            await metricsCommand({
              dir: options.dir,
              playbook: options.playbook as string | undefined,
              byEpic: options["by-epic"] || false,
              byTask: options["by-task"] || false,
              byModel: options["by-model"] || false,
              top: options.top ? Number(options.top) : undefined,
              json: options.json || false,
              save: options.save || false,
            });
            break;
          default:
            console.error(`  Unknown view: "${view}"`);
            console.error(
              "  Available views: gantt, graph, journal, metrics, trend",
            );
            process.exit(1);
        }
        break;
      }

      case "clean": {
        await cleanCommand({
          dir: options.dir,
          playbook: options.playbook as string | undefined,
          select: options.select as string | undefined,
          exclude: options.exclude as string | undefined,
          orphaned: options.orphaned || false,
          all: options.all || false,
          yes: options.yes || options.y || false,
        });
        break;
      }

      case "plan": {
        // Two modes:
        //   1. Prompt mode (`converge plan -p "..."`) — call core.plan(),
        //      which builds the planner-playbook in code and runs it
        //      through the same `run()` the studio uses.
        //   2. Path mode (`converge plan <path> [--update]`) — re-plan a
        //      specific node in an existing playbook. Falls through to
        //      runPlanLayer directly since core.plan only handles fresh
        //      scaffolds.
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

        // ── Prompt mode → core.plan() ──────────────────────────────
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

          const { plan, consoleReporter, suggestPlaybookName } =
            await import("@converge/core");
          const { agentfn } = await import("@converge/agentfn");
          const planName =
            (options.name as string | undefined) ??
            (await suggestPlaybookName(prompt, agentfn));

          const result = await plan({
            goal: prompt,
            name: planName,
            projectDir: planSearchDir,
            update: isUpdate,
            reporter: consoleReporter(),
          });
          if (result.failed > 0) process.exitCode = 1;
          break;
        }

        // ── Path mode → runPlanLayer (internal) ────────────────────
        const { runPlanLayer } = await import(
          "@converge/core/planning/progressive-decomposition/index.ts"
        );

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
              const pbName = playbookRoot.split(/[/\\]/).pop() || "default";
              console.log(`\n   To run the playbook:`);
              console.log(`   converge run --playbook=${pbName}\n`);
            }
          }
        } catch (err: any) {
          console.error(`\n   ❌ plan failed: ${err.message}`);
          throw err;
        }
        break;
      }

      case "deps": {
        const subcommand = positional[0] || "list";

        switch (subcommand) {
          case "list": {
            await depsListCommand({
              dir: options.dir,
              verbose: options.verbose || options.v,
            });
            break;
          }

          case "install": {
            await depsInstallCommand({
              dir: options.dir,
              target: options.target,
              skill: positional[1],
              force: options.force || false,
              verbose: options.verbose || options.v,
            });
            break;
          }

          default: {
            console.error(`   Unknown deps subcommand: ${subcommand}`);
            console.error("   Usage: converge deps <list|install> [options]");
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

      case "metrics": {
        await metricsCommand({
          dir: options.dir,
          playbook: options.playbook as string | undefined,
          byEpic: options["by-epic"] || options.byEpic,
          byTask: options["by-task"] || options.byTask,
          byModel: options["by-model"] || options.byModel,
          top: options.top ? Number(options.top) : undefined,
          json: options.json as boolean,
          save: options.save as boolean,
        });
        break;
      }

      case "benchmark": {
        const { benchmarkCommand } = await import(
          "@converge/provider-benchmark"
        );
        await benchmarkCommand({
          journalDir: positional[0] as string | undefined,
          playbook: options.playbook as string | undefined,
          label: options.label as string | undefined,
          provider: options.provider as string | undefined,
          model: options.model as string | undefined,
          json: options.json as boolean,
          minimal: options.minimal as boolean,
          save: options.save as string | undefined,
          deep: options.deep as boolean,
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
          seed: false,
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
          seed: false,
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

      case "list":
      case "ls": {
        await listCommand({
          dir: options.dir || process.cwd(),
          select: options.select as string | undefined,
          state: options.state as string | undefined,
        });
        break;
      }

      case "build": {
        await buildCommand({
          dir: options.dir || ORIGINAL_CWD,
          select: options.select as string | undefined,
          exclude: options.exclude as string | undefined,
          failFast: options["fail-fast"] ?? true,
        });
        break;
      }

      case "compile": {
        await compileCommand({
          dir: options.dir || ORIGINAL_CWD,
          seed: options.seed || false,
          select: options.select as string | undefined,
        });
        break;
      }

      case "test": {
        await testCommand({
          dir: options.dir || ORIGINAL_CWD,
          select: options.select as string | undefined,
          exclude: options.exclude as string | undefined,
        });
        break;
      }

      case "seed": {
        await seedCommand({
          dir: options.dir || ORIGINAL_CWD,
          select: options.select as string | undefined,
          dry: options.dry as boolean | undefined,
        });
        break;
      }

      case "version":
      case "--version":
      case "-V": {
        console.log(getVersion());
        process.exit(0);
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

// `slugifyPrompt` and `suggestPlaybookName` previously lived here. They
// moved into `@converge/core` as part of the planner-as-playbook
// migration so the studio can use them without a CLI subprocess. Import
// from `@converge/core` if you need them.

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
