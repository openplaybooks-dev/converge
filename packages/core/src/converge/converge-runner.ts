/**
 * Converge Runner — `converge run --converge`
 *
 * Thin outer loop around `autonomousRun()`:
 *
 *   while (!converged) {
 *     evaluateGoals()     // RED: run dod.js, get metrics
 *     planFromGoals()     // YELLOW: invoke planning agent → TASK.md files
 *     autonomousRun()     // GREEN: execute implementation tasks
 *   }
 *
 * A "wave" = one planning round + full execution of all generated tasks.
 * `autonomousRun` handles: tree loading, stuck task recovery, signal handlers,
 * task selection, WBS spawning, checkpointing, failure handling.
 *
 * Crash-safety model (matches converge core):
 *   - Gap ledger: closeOrphanedRuns() detects "start" entries without
 *     a matching "end" and closes them. Trend table stays consistent.
 *   - Task state + stuck detection: handled by autonomousRun.
 */

import { TaskTree } from "../task/tree/index.ts";
import { UnitCheckpointManager } from "../checkpoint/unit-checkpoint.ts";
import { findGaps } from "../task/unit/find-gaps.ts";
import { collectBacklogGaps } from "./backlog-bridge.ts";
import {
  appendLedgerEntry,
  formatTrendTable,
  closeOrphanedRuns,
} from "./gap-ledger.ts";
import { evaluateGoals, planFromGoals } from "./goal-planner.ts";
import { totalScore, scoreByKind, sortByWeight, gapWeight } from "./weights.ts";
import { autonomousRun } from "../cli/autonomous-run.ts";
import type { Gap } from "../task/gap/types.ts";
import type { ConvergeConfig } from "../config/types.ts";
import type { HookRegistry } from "../hooks/registry.ts";

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */

export interface ConvergeRunConfig {
  projectDir: string;
  convergeConfig: ConvergeConfig;
  hookRegistry?: HookRegistry;
  maxIterations?: number;
  maxTaskAttempts?: number;
  maxRunDurationMs?: number;
  /** Maximum total goals before warning and stopping spawning (default: 100) */
  maxGoals?: number;
  verbose?: boolean;
  filter?: string;
  force?: boolean;
  resume?: boolean;
  restart?: boolean;
  /** Plan-only mode: run RED + YELLOW phases, skip GREEN (no task execution) */
  planOnly?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Result                                                             */
/* ------------------------------------------------------------------ */

export interface ConvergeResult {
  converged: boolean;
  waves: number;
  totalTasksCompleted: number;
  totalTasksFailed: number;
  startScore: number;
  endScore: number;
  delta: number;
  trend: string;
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

export async function convergeRun(
  config: ConvergeRunConfig,
): Promise<ConvergeResult> {
  const { projectDir, convergeConfig, verbose } = config;

  const maxWaves = config.maxIterations ?? 1_000_000;
  const maxGoals = config.maxGoals ?? 100;

  console.log("🔄 Starting converge run (wave-based convergence mode)\n");

  // ── 1. Close orphaned ledger entries from crashed runs ─────────
  const orphansClosed = closeOrphanedRuns(projectDir);
  if (orphansClosed > 0) {
    console.log(
      `⚡ Closed ${orphansClosed} orphaned ledger entry(s) from crashed run(s)\n`,
    );
  }

  // ── 2. Initial gap snapshot ────────────────────────────────────
  const tree = await TaskTree.load(projectDir, convergeConfig);
  const initialGaps = await collectAllGaps(tree, projectDir);
  const startScore = totalScore(initialGaps);

  const runId = `converge-${Date.now().toString(36)}`;
  appendLedgerEntry(projectDir, runId, "start", initialGaps);

  console.log(
    `📊 Initial state: ${initialGaps.length} gaps, weighted score: ${startScore}`,
  );
  if (verbose) {
    const byKind = scoreByKind(initialGaps);
    for (const [kind, score] of Object.entries(byKind).sort(
      (a, b) => b[1] - a[1],
    )) {
      console.log(`   ${kind}: ${score}`);
    }
  }
  console.log("");

  // ── 3. Wave loop ───────────────────────────────────────────────
  let wave = 0;
  let consecutiveStalls = 0;
  let totalTasksCompleted = 0;
  let totalTasksFailed = 0;
  let converged = false;
  let lastScore = startScore;

  while (wave < maxWaves) {
    wave++;
    console.log(
      `═══ Wave ${wave}/${maxWaves} ═══════════════════════════════════════\n`,
    );

    // RED: evaluate goals
    const evalResult = await evaluateGoals(projectDir);

    if (evalResult.results.length > 0) {
      console.log(
        `🎯 Goals: ${evalResult.satisfied}/${evalResult.results.length} satisfied`,
      );
      if (evalResult.totalGoals) {
        console.log(
          `   ${evalResult.totalGoals} total goals (including sub-goals)`,
        );
      }
      if (evalResult.blocked > 0) {
        console.log(
          `   ${evalResult.blocked} blocked (waiting on dependencies)`,
        );
      }
      if (evalResult.totalGoals && evalResult.totalGoals >= maxGoals) {
        console.log(
          `⚠️  Goal budget reached: ${evalResult.totalGoals} goals >= maxGoals (${maxGoals}). No further goals will be spawned.`,
        );
      }
      console.log("");
    }

    // Check: all goals satisfied?
    if (
      evalResult.results.length > 0 &&
      evalResult.satisfied === evalResult.results.length
    ) {
      console.log("✅ All goals satisfied — converged.\n");
      converged = true;
      break;
    }

    // YELLOW: plan tasks from unsatisfied goals
    const planResult = await planFromGoals(projectDir, evalResult);

    // Plan-only mode: stop after RED + YELLOW (no task execution)
    if (config.planOnly) {
      if (planResult.tasksGenerated > 0) {
        console.log(
          `📋 Plan-only mode: ${planResult.tasksGenerated} task(s) generated in epic ${planResult.epicId}. Skipping execution.\n`,
        );
      } else {
        console.log(`📋 Plan-only mode: no new tasks generated.\n`);
      }
      break;
    }

    // Check: nothing actionable?
    if (planResult.tasksGenerated === 0) {
      // No new tasks generated, but goals are unsatisfied.
      // There may still be existing pending tasks from previous waves.
      // Let autonomousRun try to execute them. If findNextTask returns null,
      // it will return immediately with completed: true.
    }

    // GREEN: execute implementation tasks
    // Pass --resume on first wave to handle any stuck tasks from crashed runs.
    const runResult = await autonomousRun({
      projectDir,
      convergeConfig,
      hookRegistry: config.hookRegistry,
      maxIterations: config.maxIterations,
      maxTaskAttempts: config.maxTaskAttempts,
      maxRunDurationMs: config.maxRunDurationMs,
      verbose,
      filter: config.filter,
      force: config.force,
      resume: true,
      restart: wave === 1 ? config.restart : undefined,
    });

    totalTasksCompleted += runResult.tasksCompleted;
    totalTasksFailed += runResult.tasksFailed;

    // SCORE: check progress
    const postTree = await TaskTree.load(projectDir, convergeConfig);
    const postGaps = await collectAllGaps(postTree, projectDir);
    const postScore = totalScore(postGaps);

    console.log(
      `\n📊 Wave ${wave} result: score ${lastScore} → ${postScore} (${postScore <= lastScore ? (postScore < lastScore ? "improving" : "flat") : "regressing"})\n`,
    );

    if (postScore >= lastScore) {
      consecutiveStalls++;
      if (consecutiveStalls >= 2) {
        console.log(
          "⛔ Stalled: 2 consecutive waves with no score improvement. Stopping.\n",
        );
        break;
      }
    } else {
      consecutiveStalls = 0;
    }

    lastScore = postScore;

    // If autonomousRun stopped due to timeout or consecutive failures, stop the converge loop too
    if (runResult.stoppedReason === "timeout") {
      console.log("⛔ autonomousRun hit timeout. Stopping converge loop.\n");
      break;
    }
  }

  // ── 4. End snapshot + summary ──────────────────────────────────
  const finalTree = await TaskTree.load(projectDir, convergeConfig);
  const finalGaps = await collectAllGaps(finalTree, projectDir);
  const endScore = totalScore(finalGaps);
  const delta = endScore - startScore;

  const endEntry = appendLedgerEntry(projectDir, runId, "end", finalGaps);

  if (!converged) {
    converged = finalGaps.length === 0;
  }

  console.log("═══════════════════════════════════════════════════════");
  console.log("  CONVERGE SUMMARY");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`  Waves:           ${wave}`);
  console.log(`  Tasks completed: ${totalTasksCompleted}`);
  console.log(`  Tasks failed:    ${totalTasksFailed}`);
  console.log(
    `  Score:           ${startScore} → ${endScore} (${delta >= 0 ? "+" : ""}${delta})`,
  );
  console.log(`  Trend:           ${endEntry.trend}`);
  console.log(`  Converged:       ${converged ? "✅ YES" : "❌ NO"}`);
  console.log("");

  if (verbose || !converged) {
    const top = sortByWeight(finalGaps).slice(0, 5);
    if (top.length > 0) {
      console.log("  Top remaining gaps:");
      for (const g of top) {
        console.log(`    [${gapWeight(g)}] ${g.description}`);
      }
      console.log("");
    }
  }

  console.log(formatTrendTable(projectDir));
  console.log("");

  return {
    converged,
    waves: wave,
    totalTasksCompleted,
    totalTasksFailed,
    startScore,
    endScore,
    delta,
    trend: endEntry.trend,
  };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Collect all gaps across ALL pending/partial tasks in the tree.
 * Includes backlog gaps when tasks declare backlogs.
 */
async function collectAllGaps(
  tree: TaskTree,
  projectDir: string,
): Promise<Gap[]> {
  const allGaps: Gap[] = [];
  const nodes = tree.getAllNodes();

  for (const node of nodes) {
    if (!node.unit) continue;

    const epicId = node.epicId || "unknown";
    const unitCkpt = new UnitCheckpointManager(
      projectDir,
      "task",
      epicId,
      node.id,
    );
    const ckpt = await unitCkpt.load();
    if (ckpt?.status === "complete" || ckpt?.status === "seeded") continue;

    try {
      const gaps = await findGaps(node.unit);
      allGaps.push(...gaps);

      const backlogs = (node.unit as any).backlogs;
      if (backlogs && Array.isArray(backlogs) && backlogs.length > 0) {
        const backlogGaps = collectBacklogGaps(backlogs, projectDir, node.id);
        allGaps.push(...backlogGaps);
      }
    } catch {
      // Skip units that can't be gap-checked
    }
  }

  return allGaps;
}
