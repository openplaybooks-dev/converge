/**
 * Evolve Runner — epoch-based feedback loop.
 *
 * Each epoch:
 *   1. Stamp a fresh epic from the playbook template (with epoch vars)
 *   2. autonomousRun() seeds WBS + executes children
 *   3. Check results: all tasks passed → converged; stalled → stop
 *
 * The playbook's root task uses `wbs:` to discover issues and spawn
 * child tasks. No special strategy — just the standard task API.
 */

import { join } from "node:path";
import { readdirSync, existsSync } from "node:fs";
import { autonomousRun } from "../cli/autonomous-run.ts";
import { generateEpicFromPlaybook } from "../playbook/executor.ts";
import type { ResolvedPlaybook } from "../playbook/types.ts";
import type { ConvergeConfig } from "../config/types.ts";
import type { HookRegistry } from "../hooks/registry.ts";
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

    // Stamp a fresh epic from the playbook template
    const epicId = nextEvolveEpicId(projectDir, epoch);
    const epochPlaybook: ResolvedPlaybook = {
      ...playbook,
      epicId,
      vars: { ...playbook.vars, epoch: String(epoch) },
    };

    try {
      await generateEpicFromPlaybook(epochPlaybook, projectDir);
    } catch (err: any) {
      if (err.message?.includes("already exists")) {
        console.log(`   Epic ${epicId} already exists — skipping generation.\n`);
      } else {
        throw err;
      }
    }

    console.log(`📋 Epic: ${epicId}\n`);

    if (config.planOnly) {
      console.log("📋 Plan-only mode: skipping execution.\n");
      break;
    }

    // Run: WBS seeds children, then autonomousRun executes them
    const runResult = await autonomousRun({
      projectDir,
      convergeConfig,
      hookRegistry: config.hookRegistry,
      maxIterations: config.maxIterations,
      maxTaskAttempts: config.maxTaskAttempts ?? 2,
      maxRunDurationMs: config.maxRunDurationMs,
      verbose,
      filter: epicId,
      force: config.force,
      resume: true,
      restart: epoch === 1 ? config.restart : undefined,
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
  const endEntry = appendEvolveEntry(
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

function nextEvolveEpicId(projectDir: string, epoch: number): string {
  const epicsDir = join(projectDir, ".converge", "epics");
  if (!existsSync(epicsDir)) {
    return `evolve-${String(epoch).padStart(2, "0")}`;
  }

  const existing = readdirSync(epicsDir)
    .filter((d) => /^\d+-/.test(d) || d.startsWith("evolve-"))
    .map((d) => {
      const m = d.match(/^(\d+)/);
      return m ? parseInt(m[1], 10) : 0;
    })
    .filter((n) => !isNaN(n));

  const next = (Math.max(0, ...existing) + 1).toString().padStart(2, "0");
  return `${next}-evolve-epoch-${epoch}`;
}
