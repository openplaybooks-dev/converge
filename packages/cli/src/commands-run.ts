/**
 * Autonomous Run Command
 */

import type { CommonOptions } from "./commands.ts";
import type { ConvergeConfig } from "@openplaybooks/converge-core/config";
import type { HookRegistry } from "@openplaybooks/converge-core/hooks";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { shutdownController } from "./shutdown.ts";
import { readRuntimeLedgerState } from "@openplaybooks/converge-core/task/goal";

/**
 * Watch a task's review JSONL for the next non-pending verdict and
 * return it. Polls at 2s intervals. Returns "cancelled" on shutdown
 * signal (Ctrl+C). Sees verdicts written from any source — `converge
 * review` CLI, the Studio API, or anything else that appends to the
 * canonical inventory path.
 */
async function waitForReviewVerdict(
  projectDir: string,
  playbookName: string,
  taskId: string,
  minVerdicts: number,
): Promise<"approve" | "revise" | "reject" | "cancelled"> {
  const path = join(
    projectDir,
    ".converge",
    "inventory",
    playbookName,
    "reports",
    `${taskId}.jsonl`,
  );
  while (true) {
    if (shutdownController.signal.aborted) return "cancelled";
    const raw = await safeRead(path);
    if (raw) {
      const lines = raw.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length > minVerdicts) {
        for (let i = lines.length - 1; i >= 0; i--) {
          try {
            const entry = JSON.parse(lines[i]!) as { decision?: string };
            if (
              entry.decision === "approve" ||
              entry.decision === "revise" ||
              entry.decision === "reject"
            ) {
              return entry.decision;
            }
          } catch {
            /* skip malformed */
          }
        }
      }
    }
    await Promise.race([
      new Promise((r) => setTimeout(r, 2000)),
      new Promise<void>((r) => {
        if (shutdownController.signal.aborted) return r();
        shutdownController.signal.addEventListener("abort", () => r(), {
          once: true,
        });
      }),
    ]);
  }
}

function countVerdicts(raw: string | null): number {
  if (!raw) return 0;
  return raw.split(/\r?\n/).filter((l) => l.trim()).length;
}

async function safeRead(path: string): Promise<string | null> {
  if (!existsSync(path)) return null;
  try {
    return await readFile(path, "utf8");
  } catch {
    return null;
  }
}

function pickReviewArtifact(
  outputs: string[] | undefined,
  handoffArtifact?: string,
): string | undefined {
  if (handoffArtifact) return handoffArtifact;
  if (!outputs || outputs.length === 0) return undefined;
  return (
    outputs.find((p) => /\.html?$/i.test(p)) ??
    outputs.find((p) => /\.md$/i.test(p)) ??
    outputs[0]
  );
}

export interface AutoRunOptions extends CommonOptions {
  /** Run only one step then exit */
  step?: boolean;

  /** Dry run — show what would execute without running */
  dry?: boolean;

  /** RFC 0021: run stub.cmd for tasks with stub: blocks instead of real executors */
  stubMode?: boolean;

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

  /** Reset all failed/hung tasks before running */
  resetFailed?: boolean;

  /** Unblock mode — find first blocked task and run through UnblockStrategy pipeline */
  unblock?: boolean;

  /** Resolved playbook. */
  playbook?: import("../task/playbook/types.ts").ResolvedPlaybook;

  /** Stall configuration from playbook */
  stall?: { maxConsecutive?: number; backoffMs?: number };

  /** Seed-only mode — run only the Seed seeding phase */
  seedFlag?: boolean;

  /** Incremental re-seed — allow re-seeding already-seeded Seed parents */
  inc?: boolean;

  /**
   * Path to a prior run's manifest.json (or directory containing one).
   * Used by --defer to reuse unchanged tasks from a known-good run.
   */
  state?: string;

  /**
   * dbt-style cross-state reuse. Requires --state to point at a prior
   * manifest. Tasks whose upstream_hash matches a "complete" prior
   * are pre-marked complete in the current run.
   */
  defer?: boolean;

  /** Maximum duration in ms for the entire run */
  maxDuration?: number;

  /** Number of worker slots the coordinator may dispatch to. */
  workers?: number;

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

  /** Pre-built interceptor registry from plugin interceptors */
  interceptorRegistry?: import("@openplaybooks/converge-core").InterceptorRegistry;

  /** Skip the pre-flight check linter (fail-open). */
  skipCheckLint?: boolean;

  /** Skip pre-flight env-var and outputs-exist checks. */
  skipPreflight?: boolean;

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
    // orchestration loop lives in @openplaybooks/converge-core/run, where the studio
    // and any other consumer can drive it the same way.
    const { run, consoleReporter, loadPlaybookFromFolder } =
      await import("@openplaybooks/converge-core");
    const playbook = await loadPlaybookFromFolder(playbookDir);

    // --reset-failed: find hung/failed tasks and delete their checkpoint state
    // so the next run treats them as fresh. This is the operator-friendly
    // equivalent of `converge clean --select 'result:error+' --yes` but
    // scoped to only the tasks that actually need recovery.
    if (options.resetFailed) {
      const { readRuntimeLedgerState } =
        await import("@openplaybooks/converge-core/task/goal/runtime-ledger");
      const { join: pathJoin } = await import("node:path");
      const { existsSync, readdirSync, rmSync } = await import("node:fs");
      let resetCount = 0;

      const ledger = readRuntimeLedgerState(projectDir, playbookName);
      for (const task of ledger.tasks) {
        if (task.status === "failed" || task.status === "error") {
          const cpPath = pathJoin(
            projectDir,
            ".converge",
            "journal",
            playbookName,
            "tasks",
            task.id,
            "checkpoint.json",
          );
          const execPath = pathJoin(
            projectDir,
            ".converge",
            "journal",
            playbookName,
            "tasks",
            task.id,
            "exec",
          );
          try {
            if (existsSync(cpPath)) rmSync(cpPath);
            if (existsSync(execPath)) rmSync(execPath, { recursive: true });
            resetCount++;
          } catch {
            // Non-fatal: task dir may not exist yet
          }
        }
      }

      if (resetCount > 0) {
        console.log(
          `converge run: --reset-failed cleaned ${resetCount} failed task(s)`,
        );
      } else {
        console.log(`converge run: --reset-failed: no failed tasks to clean`);
      }
    }

    const result = await run(playbook, {
      projectDir,
      playbookDir,
      maxTaskAttempts: options.maxTaskAttempts ?? 2,
      resume: options.resume ?? false,
      select: options.filter as string | undefined,
      dry: options.dry || false,
      stubMode: options.stubMode || false,
      seedOnly: options.seedFlag || false,
      state: options.state,
      defer: options.defer,
      workers: options.workers,
      reporter: consoleReporter(),
      hookRegistry: options.hookRegistry,
      interceptorRegistry: options.interceptorRegistry,
    });
    // Watch for review verdicts and resume in-process so the user can
    // approve from another terminal (or the Studio) without re-invoking
    // the CLI. The loop ends when no task is blocked-awaiting-review.
    let current = result;
    let seenVerdicts = 0;
    while (current.blocked && current.blockedTaskId) {
      const id = current.blockedTaskId;
      const ledger = readRuntimeLedgerState(projectDir, playbook.def.name);
      const task = ledger.tasks.find((t) => t.id === id);
      const artifact = pickReviewArtifact(
        task?.outputs,
        task?.handoff?.artifact,
      );
      console.log("");
      console.log(`⏸  awaiting-review · task=${id}`);
      if (artifact) {
        console.log(`   report: ${artifact}`);
      }
      console.log(`   approve: converge review ${id} --approve`);
      console.log(`   revise:  converge review ${id} --revise "<note>"`);
      console.log(`   reject:  converge review ${id} --reject "<note>"`);
      console.log(
        `   (or use the Studio UI; runner is watching for verdicts…)`,
      );

      const decision = await waitForReviewVerdict(
        projectDir,
        playbook.def.name,
        id,
        seenVerdicts,
      );
      if (decision === "cancelled") {
        process.exitCode = 130;
        return;
      }
      console.log(`   ↻ received ${decision}; resuming`);
      const verdictPath = join(
        projectDir,
        ".converge",
        "inventory",
        playbook.def.name,
        "reports",
        `${id}.jsonl`,
      );
      seenVerdicts = countVerdicts(await safeRead(verdictPath));
      current = await run(playbook, {
        projectDir,
        playbookDir,
        maxTaskAttempts: options.maxTaskAttempts ?? 2,
        resume: true,
        select: options.filter as string | undefined,
        dry: options.dry || false,
        stubMode: options.stubMode || false,
        seedOnly: options.seedFlag || false,
        state: options.state,
        defer: options.defer,
        workers: options.workers,
        reporter: consoleReporter(),
        hookRegistry: options.hookRegistry,
        interceptorRegistry: options.interceptorRegistry,
      });
    }
    if (current.failed > 0) process.exitCode = 1;
    return;
  } catch (error: any) {
    console.error(`\n❌ Run failed: ${error.message}`);
    if (options.verbose) console.error(error.stack);
    process.exitCode = 1;
    // Don't process.exit() — let the event loop drain so cleanup handlers
    // run and journal/runstate are properly written.
  }
}
