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

import { autonomousRun } from "../cli/autonomous-run.ts";
import type { ResolvedPlaybook } from "../playbook/types.ts";
import type { ConvergeConfig } from "../config/types.ts";
import type { HookRegistry } from "../hooks/registry.ts";
import { CheckpointManager } from "../checkpoint/manager.ts";
import {
  closeOrphanedEvolveRuns,
  appendEvolveEntry,
  formatEvolveTrendTable,
} from "./evolve-ledger.ts";

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */

export interface EvolveRunConfig {
  projectDir: string;
  convergeConfig: ConvergeConfig;
  hookRegistry?: HookRegistry;
  playbook: ResolvedPlaybook;
  maxIterations?: number;
  maxTaskAttempts?: number;
  maxRunDurationMs?: number;
  verbose?: boolean;
  filter?: string;
  force?: boolean;
  resume?: boolean;
  restart?: boolean;
  planOnly?: boolean;
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
  const maxEpochs = config.maxIterations ?? 20;

  console.log(`🔄 Starting evolve run (max ${maxEpochs} epochs)\n`);

  const orphansClosed = closeOrphanedEvolveRuns(projectDir);
  if (orphansClosed > 0) {
    console.log(`⚡ Closed ${orphansClosed} orphaned ledger entry(s)\n`);
  }

  const runId = `evolve-${Date.now().toString(36)}`;
  appendEvolveEntry(projectDir, runId, "start", 0, { total: 0, byCategory: {} });

  // Derive the filter for playbook tasks.
  // The playbook's root task ID comes from its directory name under tasks/.
  // For improve: tasks/001-improve/ → journalTaskId "001-improve", epicId "improve"
  const playbookName = playbook.def.name;
  const rootTaskIds = playbook.def.tasks.map((t) => t.id).filter(Boolean) as string[];

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
    const runResult = await autonomousRun({
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
      console.log(
        `\n⚠️  Epoch ${epoch}: ${runResult.tasksFailed} task(s) failed (stall ${consecutiveStalls}/2).\n`,
      );
      if (consecutiveStalls >= 2) {
        console.log("⛔ Stalled: 2 consecutive epochs with failures. Stopping.\n");
        break;
      }
    } else {
      consecutiveStalls = 0;
    }

    if (runResult.stoppedReason === "timeout") {
      console.log("⛔ Timeout. Stopping evolve loop.\n");
      break;
    }
  }

  // Summary
  appendEvolveEntry(
    projectDir, runId, "end", epoch,
    { total: totalTasksFailed, byCategory: {} },
  );

  console.log("═══════════════════════════════════════════════════════");
  console.log("  EVOLVE SUMMARY");
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
  const checkpointMgr = new CheckpointManager(projectDir);

  for (const taskId of rootTaskIds) {
    try {
      await checkpointMgr.removeFromCompleted(taskId, playbookName);
    } catch {
      // Ignore — may not have a checkpoint
    }
  }
}
