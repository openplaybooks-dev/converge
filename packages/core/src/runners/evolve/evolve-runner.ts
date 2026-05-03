/**
 * Evolve Runner — epoch-based feedback loop.
 *
 * Each epoch:
 *   1. Reset playbook tasks to pending
 *   2. autonomousRun() seeds WBS + executes children (with epoch vars)
 *   3. Check results: all tasks passed → converged; stalled → stop
 *
 * Tasks live directly in .converge/playbooks/{name}/tasks/ — no epic
 * stamping or copying. The WBS scripts receive the epoch number via vars.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import type { ResolvedPlaybook } from "../../task/playbook/types.ts";
import type { ConvergeConfig } from "../../config/types.ts";
import type { HookRegistry } from "../../hooks/registry.ts";
import { TaskStateManager } from "../../checkpoint/state.ts";
import {
  closeOrphanedEvolveRuns,
  appendEvolveEntry,
  formatEvolveTrendTable,
} from "./evolve-ledger.ts";

/**
 * autonomousRun lives in the CLI package (it's the top-level interactive run
 * loop). core can't depend on cli without a cycle, so the caller injects it
 * through config. Shape mirrors `cli/src/autonomous-run.ts` one-for-one.
 */
export interface AutonomousRunner {
  (input: {
    projectDir: string;
    convergeConfig: ConvergeConfig;
    hookRegistry?: HookRegistry;
    maxIterations?: number;
    maxTaskAttempts?: number;
    maxRunDurationMs?: number;
    verbose?: boolean;
    filter?: string;
    force?: boolean;
    resume?: boolean;
    restart?: boolean;
    epochVars?: Record<string, string>;
  }): Promise<{
    completed: boolean;
    tasksCompleted: number;
    tasksFailed: number;
    iterations: number;
    stoppedReason?: string;
  }>;
}

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */

export interface EvolveRunConfig {
  projectDir: string;
  convergeConfig: ConvergeConfig;
  hookRegistry?: HookRegistry;
  playbook: ResolvedPlaybook;
  /** Injected by the caller (CLI). Breaks the core → cli dependency cycle. */
  autonomousRun: AutonomousRunner;
  maxIterations?: number;
  maxTaskAttempts?: number;
  maxRunDurationMs?: number;
  verbose?: boolean;
  filter?: string;
  force?: boolean;
  resume?: boolean;
  restart?: boolean;
  planOnly?: boolean;
  /** Stall detection configuration */
  stall?: {
    maxConsecutive?: number;
    backoffMs?: number;
  };
}

/* ------------------------------------------------------------------ */
/*  Result                                                             */
/* ------------------------------------------------------------------ */

export interface EvolveResult {
  converged: boolean;
  epochs: number;
  totalTasksCompleted: number;
  totalTasksFailed: number;
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

export async function evolveRun(config: EvolveRunConfig): Promise<EvolveResult> {
  const { projectDir, convergeConfig, playbook, verbose } = config;
  const maxEpochs = config.maxIterations ?? 1_000_000;
  const maxConsecutiveStalls = config.stall?.maxConsecutive ?? 2;

  console.log(`🔄 Starting converge run (max ${maxEpochs} epochs)\n`);

  const orphansClosed = closeOrphanedEvolveRuns(projectDir);
  if (orphansClosed > 0) {
    console.log(`⚡ Closed ${orphansClosed} orphaned ledger entry(s)\n`);
  }

  const runId = `evolve-${Date.now().toString(36)}`;
  appendEvolveEntry(projectDir, runId, "start", 0, { total: 0, byCategory: {} });

  // Derive the filter for playbook tasks.
  // The playbook's root task ID comes from its directory name under tasks/,
  // or from a root TASK.md's frontmatter id when tasks: is empty.
  const playbookName = playbook.def.name;
  let rootTaskIds = playbook.def.tasks.map((t) => t.id).filter(Boolean) as string[];

  if (rootTaskIds.length === 0) {
    // Check for root TASK.md at playbook directory
    const playbookDir = join(projectDir, ".converge", "playbooks", playbookName);
    const rootTaskMd = join(playbookDir, "TASK.md");
    if (existsSync(rootTaskMd)) {
      const content = readFileSync(rootTaskMd, "utf8");
      const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (fmMatch) {
        const fm = parseYaml(fmMatch[1]) as Record<string, unknown>;
        const id = typeof fm.id === "string" ? fm.id : playbookName;
        rootTaskIds = [id];
      } else {
        rootTaskIds = [playbookName];
      }
    }
  }

  let epoch = 0;
  let consecutiveStalls = 0;
  let totalTasksCompleted = 0;
  let totalTasksFailed = 0;
  let converged = false;

  while (epoch < maxEpochs) {
    epoch++;
    console.log(
      `═══ Epoch ${epoch}/${maxEpochs} ═══════════════════════════════════════\n`,
    );

    // Reset all playbook tasks to pending for this epoch
    if (epoch > 1) {
      await resetPlaybookTasks(projectDir, playbookName, rootTaskIds);
    }

    console.log(`📋 Playbook: ${playbookName} (epoch ${epoch})\n`);

    if (config.planOnly) {
      console.log("📋 Plan-only mode: skipping execution.\n");
      break;
    }

    // Run: autonomousRun discovers tasks from .converge/playbooks/{name}/tasks/
    // and filters by the playbook name (epicId).
    const runResult = await config.autonomousRun({
      projectDir,
      convergeConfig,
      hookRegistry: config.hookRegistry,
      maxIterations: config.maxIterations,
      maxTaskAttempts: config.maxTaskAttempts ?? 2,
      maxRunDurationMs: config.maxRunDurationMs,
      verbose,
      filter: playbookName,
      force: config.force,
      resume: epoch === 1 ? config.resume : false,
      restart: epoch === 1 ? config.restart : undefined,
      epochVars: { epoch: String(epoch) },
    });

    totalTasksCompleted += runResult.tasksCompleted;
    totalTasksFailed += runResult.tasksFailed;

    // Check convergence
    if (runResult.tasksFailed === 0 && runResult.completed) {
      converged = true;
      console.log(`\n✅ Epoch ${epoch}: all tasks passed.\n`);
      break;
    }

    if (runResult.tasksFailed > 0) {
      consecutiveStalls++;
      if (maxConsecutiveStalls > 0) {
        console.log(
          `\n⚠️  Epoch ${epoch}: ${runResult.tasksFailed} task(s) failed (stall ${consecutiveStalls}/${maxConsecutiveStalls}).\n`,
        );
        if (consecutiveStalls >= maxConsecutiveStalls) {
          console.log(`⛔ Stalled: ${maxConsecutiveStalls} consecutive epochs with failures. Stopping.\n`);
          break;
        }
      } else {
        console.log(
          `\n⚠️  Epoch ${epoch}: ${runResult.tasksFailed} task(s) failed (stall ${consecutiveStalls}, no limit).\n`,
        );
      }
    } else {
      consecutiveStalls = 0;
    }

    if (runResult.stoppedReason === "timeout") {
      console.log("⛔ Timeout. Stopping converge loop.\n");
      break;
    }
  }

  // Summary
  appendEvolveEntry(
    projectDir, runId, "end", epoch,
    { total: totalTasksFailed, byCategory: {} },
  );

  console.log("═══════════════════════════════════════════════════════");
  console.log("  CONVERGE SUMMARY");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`  Epochs:          ${epoch}`);
  console.log(`  Tasks completed: ${totalTasksCompleted}`);
  console.log(`  Tasks failed:    ${totalTasksFailed}`);
  console.log(`  Converged:       ${converged ? "YES" : "NO"}`);
  console.log("");

  console.log(formatEvolveTrendTable(projectDir));
  console.log("");

  return {
    converged,
    epochs: epoch,
    totalTasksCompleted,
    totalTasksFailed,
  };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Reset only root playbook tasks back to pending between epochs.
 * WBS children have epoch-scoped IDs (e.g. 001-001-analyze, 002-001-analyze)
 * so they're naturally isolated — only the root WBS parent needs resetting
 * so it re-seeds new children for the next epoch.
 */
async function resetPlaybookTasks(
  projectDir: string,
  playbookName: string,
  rootTaskIds: string[],
): Promise<void> {
  const checkpointMgr = new TaskStateManager(projectDir);

  for (const taskId of rootTaskIds) {
    try {
      await checkpointMgr.removeFromCompleted(taskId);
    } catch {
      // Ignore — may not have a checkpoint
    }
  }
}
