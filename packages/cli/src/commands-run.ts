/**
 * Autonomous Run Command
 */

import type { CommonOptions } from "./commands.ts";
import type { ConvergeConfig } from "@converge/core/config/types.ts";
import type { HookRegistry } from "@converge/core/hooks/registry.ts";
import { join } from "node:path";

export interface AutoRunOptions extends CommonOptions {
  /** Run only one step then exit */
  step?: boolean;

  /** Dry run — show what would execute without running */
  dry?: boolean;

  /** Preflight mode — run AI strategy selection but stop before executing tasks */
  analyze?: boolean;

  /** Filter to a specific epic or task (e.g. "99-test" or "99-test/skill-invoke-test") */
  filter?: string;

  /** Force-run the filtered task even if blocked, completed, or failed */
  force?: boolean;

  /** Resume: recover interrupted/running tasks from a previous session */
  resume?: boolean;

  /** Restart: reset all tasks to pending and start fresh */
  restart?: boolean;

  /** Unblock mode — find first blocked task and run through UnblockStrategy pipeline */
  unblock?: boolean;

  /** Playbook run mode (resolved from playbook.yml) */
  mode?: "oneoff" | "converge" | "loop" | "dispatch";

  /** Resolved playbook (for converge/loop modes) */
  playbook?: import("../task/playbook/types.ts").ResolvedPlaybook;

  /** Stall configuration from playbook */
  stall?: { maxConsecutive?: number; backoffMs?: number };

  /** Seed-only mode — run only the Seed seeding phase */
  seedFlag?: boolean;

  /** Incremental re-seed — allow re-seeding already-seeded Seed parents */
  inc?: boolean;

  /** Force non-incremental execution; rebuild from scratch */
  fullRefresh?: boolean;

  /** Maximum duration in ms for the entire run */
  maxDuration?: number;

  /** Check interval in ms */
  checkInterval?: number;

  /** Enable auto-fixing */
  autoFix?: boolean;

  /** Enable self-planning */
  selfPlan?: boolean;

  /** Loaded PROJECT.md or project.yaml config (auto-discovered by CLI) */
  convergeConfig?: ConvergeConfig;

  /** Pre-built hook registry from config hooks */
  hookRegistry?: HookRegistry;

  /** Skip the pre-flight check linter (fail-open). */
  skipCheckLint?: boolean;

  /** Abort if cost preflight estimate exceeds vars.budget_cents. Default false (warn only). */
  budgetStrict?: boolean;

  /**
   * Optional path to an NDJSON file. When set, the runner emits one line
   * per state transition (iteration, task start/complete, gap, escalation)
   * so babysitters don't have to grep prose logs. Path is opened append.
   */
  eventsFile?: string;
}

/* ------------------------------------------------------------------ */

/**
 * Usage:
 *   converge run                # Full autonomous loop (snap → execute → snap)
 *   converge run --dry          # Preview full queue without executing
 *   converge run --step         # Execute the next single task
 *   converge run --step --dry   # Preview next task without executing
 */
export async function runAutonomousCommand(
  options: AutoRunOptions = {},
): Promise<void> {
  try {
    if (!options.convergeConfig) {
      throw new Error(
        "No .converge/PROJECT.md or .converge/project.yaml found. Please create a .converge/PROJECT.md or .converge/project.yaml file.",
      );
    }

    const projectDir = options.dir || process.cwd();

    // ── DAG execution (ONLY path) ─────────────────────────────────────
    let playbookDir: string;
    let playbookName: string;

    if (options.playbook) {
      playbookDir = options.playbook.templateDir;
      playbookName = options.playbook.def.name;
    } else {
      // Auto-detect default playbook
      playbookName = "default";
      playbookDir = join(projectDir, ".converge", "playbooks", playbookName);
    }

    // Programmatic execution. The CLI's role here is to translate argv
    // flags into RunOptions and pipe RunEvents to the console — the
    // orchestration loop lives in @converge/core/run, where the studio
    // and any other consumer can drive it the same way.
    const { run, consoleReporter, loadPlaybookFromFolder } = await import(
      "@converge/core"
    );
    const playbook = await loadPlaybookFromFolder(playbookDir);
    const result = await run(playbook, {
      projectDir,
      playbookDir,
      maxTaskAttempts: options.maxTaskAttempts ?? 2,
      resume: options.resume || false,
      select: options.filter as string | undefined,
      fullRefresh: options.fullRefresh || false,
      dry: options.dry || false,
      seedOnly: options.seedFlag || false,
      reporter: consoleReporter(),
    });
    if (result.failed > 0) process.exitCode = 1;
    return;
  } catch (error: any) {
    console.error(`\n❌ Run failed: ${error.message}`);
    if (options.verbose) console.error(error.stack);
    process.exit(1);
  }
}
