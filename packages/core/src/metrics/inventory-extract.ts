/**
 * Inventory Metrics Extraction
 *
 * RFC 0033: Extract summary metrics from the inventory layer (tasks.jsonl)
 * so that `converge metrics` works without the journal directory.
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import {
  readRuntimeLedgerState,
  runtimeTasksPath,
  RuntimeTask,
} from "../task/goal/runtime-ledger.ts";
import type { AggregateMetrics, CheckpointSummary } from "./types.ts";

export interface InventoryMetrics {
  aggregate: AggregateMetrics;
  checkpointSummary: CheckpointSummary;
  taskCount: number;
  hasDetailedMetrics: boolean;
}

/** Parse JSONL file into RuntimeTask[], skipping corrupted lines. */
function parseTaskRows(filePath: string): RuntimeTask[] {
  if (!existsSync(filePath)) return [];
  const lines = readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const out: RuntimeTask[] = [];
  for (const line of lines) {
    try {
      const row = JSON.parse(line);
      if (row && typeof row === "object" && typeof row.id === "string") {
        out.push(row as RuntimeTask);
      }
    } catch {
      // skip corrupted lines
    }
  }
  return out;
}

/**
 * Build aggregate metrics from inventory task rows.
 *
 * Unlike journal-based metrics (which parse per-session log files),
 * inventory provides only per-task summaries. The aggregate reflects
 * completion counts, success rates, and any per-task metrics that
 * were written during execution (duration, tokens, cost).
 */
export function extractFromInventory(
  projectDir: string,
  playbookName: string,
): InventoryMetrics {
  const tasksPath = runtimeTasksPath(projectDir, playbookName);
  const rows = parseTaskRows(tasksPath);

  if (rows.length === 0) {
    // Fallback: try reading the full ledger state (includes goals)
    try {
      const state = readRuntimeLedgerState(projectDir, playbookName);
      return {
        aggregate: buildEmptyAggregate(),
        checkpointSummary: buildEmptyCheckpointSummary(),
        taskCount: state.tasks.length,
        hasDetailedMetrics: false,
      };
    } catch {
      return {
        aggregate: buildEmptyAggregate(),
        checkpointSummary: buildEmptyCheckpointSummary(),
        taskCount: 0,
        hasDetailedMetrics: false,
      };
    }
  }

  const doneTasks = rows.filter((t) => t.status === "done");
  const droppedTasks = rows.filter((t) => t.status === "dropped");
  const todoTasks = rows.filter(
    (t) => t.status === "todo" || t.status === "doing",
  );

  // Session = one task execution for inventory purposes
  const sessionCount = rows.filter((t) => t.status !== "todo").length;
  const successCount = doneTasks.length;
  const failCount = droppedTasks.length;
  const errorRate = sessionCount > 0 ? failCount / sessionCount : 0;

  // Aggregate per-task metrics (only tasks that recorded them)
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCacheRead = 0;
  let totalCacheCreation = 0;
  let totalCostUsd = 0;
  let totalDurationMs = 0;
  let totalTurns = 0;
  let totalToolCalls = 0;
  let tasksWithMetrics = 0;
  const modelBreakdown: AggregateMetrics["modelBreakdown"] = {};

  for (const t of rows) {
    const hasMetrics =
      t.inputTokens !== undefined ||
      t.outputTokens !== undefined ||
      t.durationMs !== undefined ||
      t.costUsd !== undefined;

    if (hasMetrics) {
      tasksWithMetrics++;
      totalInputTokens += t.inputTokens ?? 0;
      totalOutputTokens += t.outputTokens ?? 0;
      totalCacheRead += t.cacheReadTokens ?? 0;
      totalCacheCreation += t.cacheCreationTokens ?? 0;
      totalCostUsd += t.costUsd ?? 0;
      totalDurationMs += t.durationMs ?? 0;
      totalTurns += t.numTurns ?? 0;
      totalToolCalls += t.totalToolCalls ?? 0;

      if (t.model) {
        const existing = modelBreakdown[t.model] ?? {
          sessions: 0,
          costUSD: 0,
          inputTokens: 0,
          outputTokens: 0,
        };
        existing.sessions++;
        existing.costUSD += t.costUsd ?? 0;
        existing.inputTokens += t.inputTokens ?? 0;
        existing.outputTokens += t.outputTokens ?? 0;
        modelBreakdown[t.model] = existing;
      }
    }
  }

  const avgCostPerSession = sessionCount > 0 ? totalCostUsd / sessionCount : 0;
  const avgDurationMs = sessionCount > 0 ? totalDurationMs / sessionCount : 0;
  const totalTokens = totalInputTokens + totalOutputTokens;
  const cacheHitRate = totalTokens > 0 ? totalCacheRead / totalTokens : 0;

  const aggregate: AggregateMetrics = {
    sessionCount,
    successCount,
    failCount,
    errorRate,
    totalCostUsd,
    avgCostPerSession,
    totalInputTokens,
    totalOutputTokens,
    totalCacheReadTokens: totalCacheRead,
    totalCacheCreationTokens: totalCacheCreation,
    cacheHitRate,
    totalDurationMs,
    avgDurationMs,
    totalTurns,
    toolBreakdown: {}, // Tool-level detail requires journal
    modelBreakdown,
  };

  const checkpointSummary: CheckpointSummary = {
    totalEpics: 0, // Not tracked in flat inventory
    totalTasks: rows.length,
    completedTasks: successCount,
    failedTasks: failCount,
    pendingTasks: todoTasks.length,
    interruptedTasks: 0,
    totalAttempts: rows.reduce((sum, t) => sum + (t.attemptCount ?? 0), 0),
    totalRetries: rows.reduce(
      (sum, t) => sum + Math.max(0, (t.attemptCount ?? 0) - 1),
      0,
    ),
    tasksWithRetries: rows.filter((t) => (t.attemptCount ?? 0) > 1).length,
    taskSuccessRate:
      doneTasks.length + droppedTasks.length > 0
        ? doneTasks.length / (doneTasks.length + droppedTasks.length)
        : 0,
    totalDurationMs,
    avgTaskDurationMs:
      doneTasks.length + droppedTasks.length > 0
        ? totalDurationMs / (doneTasks.length + droppedTasks.length)
        : 0,
  };

  return {
    aggregate,
    checkpointSummary,
    taskCount: rows.length,
    hasDetailedMetrics: tasksWithMetrics > 0,
  };
}

function buildEmptyAggregate(): AggregateMetrics {
  return {
    sessionCount: 0,
    successCount: 0,
    failCount: 0,
    errorRate: 0,
    totalCostUsd: 0,
    avgCostPerSession: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCacheReadTokens: 0,
    totalCacheCreationTokens: 0,
    cacheHitRate: 0,
    totalDurationMs: 0,
    avgDurationMs: 0,
    totalTurns: 0,
    toolBreakdown: {},
    modelBreakdown: {},
  };
}

function buildEmptyCheckpointSummary(): CheckpointSummary {
  return {
    totalEpics: 0,
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    pendingTasks: 0,
    interruptedTasks: 0,
    totalAttempts: 0,
    totalRetries: 0,
    tasksWithRetries: 0,
    taskSuccessRate: 0,
    totalDurationMs: 0,
    avgTaskDurationMs: 0,
  };
}
