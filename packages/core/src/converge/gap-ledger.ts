/**
 * Gap Ledger — Cross-run trend tracking.
 *
 * Append-only JSONL file at .converge/journal/gap-ledger.jsonl
 * Records a weighted snapshot after every converge run.
 * Answers: "across all runs, are gaps going up or down?"
 *
 * Crash-safety:
 *   The process can die at any point (kill -9, OOM, power loss).
 *   A "start" entry may be written without a matching "end".
 *   On next run, closeOrphanedRuns() detects this and appends a
 *   "crashed" end entry using the start's score as a best-effort
 *   close. The trend table stays consistent.
 */

import { appendFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import type { Gap } from "../task/gap/types.ts";
import { totalScore, scoreByKind, scoreBySeverity } from "./weights.ts";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface LedgerEntry {
  timestamp: string;
  runId: string;
  phase: "start" | "end";
  /** Raw gap count */
  totalGaps: number;
  /** Weighted score (the real convergence metric) */
  weightedScore: number;
  byKind: Record<string, number>;
  bySeverity: Record<string, number>;
  /** Score delta from previous run end. Negative = improving. */
  delta: number | null;
  /** Trend classification based on recent deltas */
  trend: "improving" | "stalled" | "degrading" | "first-run" | "crashed";
}

/* ------------------------------------------------------------------ */
/*  Ledger Path                                                        */
/* ------------------------------------------------------------------ */

function ledgerPath(projectDir: string): string {
  return join(projectDir, ".converge", "journal", "gap-ledger.jsonl");
}

/* ------------------------------------------------------------------ */
/*  Read                                                               */
/* ------------------------------------------------------------------ */

/**
 * Read all ledger entries from disk.
 */
export function readLedger(projectDir: string): LedgerEntry[] {
  const p = ledgerPath(projectDir);
  if (!existsSync(p)) return [];

  const lines = readFileSync(p, "utf-8")
    .split("\n")
    .filter((l) => l.trim());
  const entries: LedgerEntry[] = [];
  for (const line of lines) {
    try {
      entries.push(JSON.parse(line));
    } catch {
      // Skip corrupt lines
    }
  }
  return entries;
}

/**
 * Get the last "end" entry (most recent completed run).
 */
function lastEndEntry(projectDir: string): LedgerEntry | null {
  const entries = readLedger(projectDir);
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].phase === "end") return entries[i];
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Orphan Recovery                                                    */
/* ------------------------------------------------------------------ */

/**
 * Close any orphaned "start" entries that have no matching "end".
 *
 * This happens when the process crashes (kill -9, OOM, power loss)
 * after writing "start" but before writing "end". Signal handlers
 * are just UX polish — this function is the real safety mechanism.
 *
 * Strategy: use the start entry's own score as the end score.
 * We can't know what progress was made before the crash, but the
 * start score is a safe upper bound (no worse than where we started).
 * Mark trend as "crashed" so it's visible in the trend table.
 *
 * Call this at the beginning of every converge run.
 */
export function closeOrphanedRuns(projectDir: string): number {
  const entries = readLedger(projectDir);
  if (entries.length === 0) return 0;

  // Collect runIds that have a "start" but no "end"
  const startIds = new Set<string>();
  const endIds = new Set<string>();
  for (const e of entries) {
    if (e.phase === "start") startIds.add(e.runId);
    if (e.phase === "end") endIds.add(e.runId);
  }

  let closed = 0;
  for (const runId of startIds) {
    if (endIds.has(runId)) continue;

    // Find the start entry to get its score
    const startEntry = entries.find(
      (e) => e.runId === runId && e.phase === "start",
    );
    if (!startEntry) continue;

    // Close it: score unchanged (crash = no progress assumed)
    const prev = lastEndEntry(projectDir);
    const delta =
      prev !== null ? startEntry.weightedScore - prev.weightedScore : null;

    const endEntry: LedgerEntry = {
      timestamp: new Date().toISOString(),
      runId,
      phase: "end",
      totalGaps: startEntry.totalGaps,
      weightedScore: startEntry.weightedScore,
      byKind: startEntry.byKind,
      bySeverity: startEntry.bySeverity,
      delta,
      trend: "crashed",
    };

    const p = ledgerPath(projectDir);
    appendFileSync(p, JSON.stringify(endEntry) + "\n", "utf-8");
    closed++;
  }

  return closed;
}

/* ------------------------------------------------------------------ */
/*  Write                                                              */
/* ------------------------------------------------------------------ */

/**
 * Append a ledger entry.
 */
export function appendLedgerEntry(
  projectDir: string,
  runId: string,
  phase: "start" | "end",
  gaps: Gap[],
): LedgerEntry {
  const p = ledgerPath(projectDir);
  const dir = dirname(p);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const score = totalScore(gaps);
  const prev = lastEndEntry(projectDir);
  const delta = prev !== null ? score - prev.weightedScore : null;

  const entry: LedgerEntry = {
    timestamp: new Date().toISOString(),
    runId,
    phase,
    totalGaps: gaps.length,
    weightedScore: score,
    byKind: scoreByKind(gaps),
    bySeverity: scoreBySeverity(gaps),
    delta,
    trend: classifyTrend(projectDir, delta),
  };

  appendFileSync(p, JSON.stringify(entry) + "\n", "utf-8");
  return entry;
}

/* ------------------------------------------------------------------ */
/*  Trend Classification                                               */
/* ------------------------------------------------------------------ */

/**
 * Classify trend based on recent deltas.
 * - 3+ consecutive negative deltas → 'improving'
 * - delta near zero → 'stalled'
 * - positive delta → 'degrading'
 * - no prior data → 'first-run'
 */
function classifyTrend(
  projectDir: string,
  delta: number | null,
): LedgerEntry["trend"] {
  if (delta === null) return "first-run";

  const entries = readLedger(projectDir).filter((e) => e.phase === "end");
  // Include current delta in the window
  const recentDeltas = entries
    .slice(-2)
    .map((e) => e.delta)
    .filter((d): d is number => d !== null);
  recentDeltas.push(delta);

  if (recentDeltas.length >= 3 && recentDeltas.every((d) => d < 0))
    return "improving";
  if (delta > 0) return "degrading";
  if (delta === 0) return "stalled";
  return "improving";
}

/* ------------------------------------------------------------------ */
/*  CLI Display                                                        */
/* ------------------------------------------------------------------ */

/**
 * Format the ledger as a trend table for CLI display.
 */
export function formatTrendTable(projectDir: string): string {
  const entries = readLedger(projectDir).filter((e) => e.phase === "end");

  if (entries.length === 0) return "No convergence runs recorded yet.";

  const trendIcon: Record<string, string> = {
    improving: "↘",
    stalled: "→",
    degrading: "↗",
    crashed: "✕",
    "first-run": "·",
  };

  const lines: string[] = [];
  lines.push("  Run  │ Gaps │ Score │  Delta │ Trend");
  lines.push("  ─────┼──────┼───────┼────────┼──────────");

  for (const entry of entries.slice(-10)) {
    // last 10 runs
    const id = entry.runId.slice(-3).padStart(3);
    const gaps = String(entry.totalGaps).padStart(4);
    const score = String(entry.weightedScore).padStart(5);
    const d =
      entry.delta !== null
        ? (entry.delta >= 0 ? "+" : "") + String(entry.delta).padStart(5)
        : "     ";
    const icon = trendIcon[entry.trend] ?? "?";
    const label = entry.trend;
    lines.push(`  ${id}  │${gaps} │${score} │${d}  │ ${label} ${icon}`);
  }

  return lines.join("\n");
}
