/**
 * Autonomous Run Command
 */

import type { CommonOptions } from "./commands.ts";
import type { ConvergeConfig } from "@openplaybooks/converge-core/config";
import type { HookRegistry } from "@openplaybooks/converge-core/hooks";
import { ensureHumanReviewHandoff } from "@openplaybooks/converge-core/task/review";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { shutdownController } from "./shutdown.ts";

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
    const { run, consoleReporter, loadPlaybookFromFolder } = await import(
      "@openplaybooks/converge-core"
    );
    const playbook = await loadPlaybookFromFolder(playbookDir);

    // --reset-failed: find hung/failed tasks and delete their checkpoint state
    // so the next run treats them as fresh. This is the operator-friendly
    // equivalent of `converge clean --select 'result:error+' --yes` but
    // scoped to only the tasks that actually need recovery.
    if (options.resetFailed) {
      const { readRuntimeLedgerState } = await import(
        "@openplaybooks/converge-core/task/goal/runtime-ledger"
      );
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
      seedOnly: options.seedFlag || false,
      state: options.state,
      defer: options.defer,
      workers: options.workers,
      reporter: consoleReporter(),
      hookRegistry: options.hookRegistry,
      interceptorRegistry: options.interceptorRegistry,
    });
    if (result.blocked && result.blockedTaskId) {
      const studioServer = await ensureHumanReviewStudioServer(projectDir);
      try {
        const reportUrl = await announceHumanReviewUrl(
          projectDir,
          playbook.def.name,
          result.blockedTaskId,
          studioServer,
        );
        const decision = await waitForHumanReviewDecision(
          projectDir,
          playbook.def.name,
          result.blockedTaskId,
          reportUrl,
        );
        if (decision === "approve") {
          const resumed = await run(playbook, {
            projectDir,
            playbookDir,
            maxTaskAttempts: options.maxTaskAttempts ?? 2,
            resume: true,
            select: options.filter as string | undefined,
            dry: options.dry || false,
            seedOnly: options.seedFlag || false,
            state: options.state,
            defer: options.defer,
            workers: options.workers,
            reporter: consoleReporter(),
            hookRegistry: options.hookRegistry,
          });
          if (resumed.failed > 0 || resumed.blocked) process.exitCode = 1;
          return;
        }
        if (decision === "cancelled") {
          process.exit(130);
        }
        process.exitCode = 1;
        return;
      } finally {
        await studioServer?.close().catch(() => {});
      }
    }
    if (result.failed > 0) process.exitCode = 1;
    return;
  } catch (error: any) {
    console.error(`\n❌ Run failed: ${error.message}`);
    if (options.verbose) console.error(error.stack);
    process.exitCode = 1;
    // Don't process.exit() — let the event loop drain so cleanup handlers
    // run and journal/runstate are properly written.
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHumanReviewDecision(
  projectDir: string,
  playbookName: string,
  taskId: string,
  reportUrl?: string,
): Promise<"approve" | "reject" | "cancelled" | null> {
  const reviewPath = join(
    projectDir,
    ".converge",
    "inventory",
    playbookName,
    "reports",
    `${taskId}.jsonl`,
  );
  console.log(`\n⏳ Waiting for feedback on ${taskId}...`);
  if (reportUrl) {
    console.log(`   🔗 Review: ${reportUrl}`);
  }
  while (true) {
    if (shutdownController.signal.aborted) {
      console.log(`\n   Cancelled waiting for feedback on ${taskId}.`);
      return "cancelled";
    }
    if (existsSync(reviewPath)) {
      try {
        const raw = await readFile(reviewPath, "utf8");
        const lines = raw.split("\n").filter(Boolean);
        for (let i = lines.length - 1; i >= 0; i--) {
          try {
            const entry = JSON.parse(lines[i]) as { decision?: string };
            if (entry.decision === "approve") {
              console.log(`   ✅ Feedback received: accept`);
              return "approve";
            }
            if (entry.decision === "reject" || entry.decision === "revise") {
              console.log(`   ⛔ Feedback received: ${entry.decision === "revise" ? "needs revision" : "rejected"}`);
              return "reject";
            }
          } catch (err: any) {
            // Handle concatenated JSON entries (multiple JSON objects merged without newlines).
            // Try splitting by '}{' and scanning each chunk.
            const line = lines[i];
            if (line?.includes('}{')) {
              // Split by '}{', re-wrap each piece as a separate JSON object
              const parts = line.split('}{');
              for (let c = parts.length - 1; c >= 0; c--) {
                const chunk = (c === 0 ? "" : "{") + parts[c] + (c === parts.length - 1 ? "" : "}");
                try {
                  const entry = JSON.parse(chunk) as { decision?: string };
                  if (entry.decision === "approve") {
                    console.log(`   ✅ Feedback received: accept`);
                    return "approve";
                  }
                  if (entry.decision === "revise" || entry.decision === "reject") {
                    console.log(`   ⛔ Feedback received: ${entry.decision === "revise" ? "needs revision" : "rejected"}`);
                    return "reject";
                  }
                } catch {
                  // skip malformed chunk
                }
              }
            }
            // keep scanning backwards on other parse errors
          }
        }
      } catch {
        // best effort
      }
    }
    await Promise.race([sleep(2000), waitForShutdownAbort()]);
  }
}

async function ensureHumanReviewStudioServer(_projectDir: string) {
  // TODO: re-implement with new studio package
  return null;
}

async function announceHumanReviewUrl(
  projectDir: string,
  playbookName: string,
  taskId: string,
  studioServer: { withAuth(path?: string): string } | null,
): Promise<string> {
  const handoff = await ensureHumanReviewHandoff(projectDir, playbookName, taskId);
  const reportRoute = `/studio/handoff/${encodeURIComponent(handoff.id)}`;
  if (studioServer) {
    return studioServer.withAuth(reportRoute);
  }
  const state = await readStudioServerState(projectDir);
  if (state && state.token) {
    return `${new URL(reportRoute, `http://${state.host}:${state.port}`).toString()}?token=${encodeURIComponent(state.token)}`;
  }
  return reportRoute;
}

function waitForShutdownAbort(): Promise<void> {
  if (shutdownController.signal.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    shutdownController.signal.addEventListener("abort", () => resolve(), {
      once: true,
    });
  });
}

async function readStudioServerState(projectDir: string): Promise<{
  host: string;
  port: number;
  token: string;
} | null> {
  const statePath = join(projectDir, ".converge", "ui", "studio-server.json");
  if (!existsSync(statePath)) return null;
  try {
    const raw = JSON.parse(await readFile(statePath, "utf8")) as {
      host?: unknown;
      port?: unknown;
      token?: unknown;
    };
    if (
      typeof raw.host !== "string" ||
      typeof raw.port !== "number" ||
      typeof raw.token !== "string"
    ) {
      return null;
    }
    return {
      host: raw.host,
      port: raw.port,
      token: raw.token,
    };
  } catch {
    return null;
  }
}
