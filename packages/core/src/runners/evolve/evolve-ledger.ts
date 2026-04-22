/**
 * Evolve Ledger — Cross-epoch trend tracking for evolve mode.
 *
 * Append-only JSONL file at .converge/journal/evolve-ledger.jsonl
 * Records issue counts after every evolve epoch.
 * Answers: "across all epochs, are issues going up or down?"
 *
 * Used by both `evolve` mode (purpose-based) and `converge` mode
 * (goal-based, which uses evolve under the hood).
 *
 * Crash-safety:
 *   The process can die at any point (kill -9, OOM, power loss).
 *   A "start" entry may be written without a matching "end".
 *   On next run, closeOrphanedEvolveRuns() detects this and appends a
 *   "crashed" end entry using the start's counts as a best-effort
 *   close. The trend table stays consistent.
 */

import { appendFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface EvolveLedgerEntry {
  timestamp: string;
  runId: string;
  phase: "start" | "end";
  epoch: number;
  /** Total issue count */
  totalIssues: number;
  /** Issue counts by category */
  byCategory: Record<string, number>;
  /** Delta from previous end entry. Negative = improving. */
  delta: number | null;
  /** Trend classification */
  trend: "improving" | "stalled" | "degrading" | "first-run" | "crashed";
}

export interface EvolveIssueSummary {
  total: number;
  byCategory: Record<string, number>;
}

/* ------------------------------------------------------------------ */
/*  Ledger Path                                                        */
/* ------------------------------------------------------------------ */

function ledgerPath(projectDir: string): string {
  return join(projectDir, ".converge", "journal", "evolve-ledger.jsonl");
}

/* ------------------------------------------------------------------ */
/*  Read                                                               */
/* ------------------------------------------------------------------ */

export function readEvolveLedger(projectDir: string): EvolveLedgerEntry[] {
  const p = ledgerPath(projectDir);
  if (!existsSync(p)) return [];

  const lines = readFileSync(p, "utf-8")
    .split("\n")
    .filter((l) => l.trim());
  const entries: EvolveLedgerEntry[] = [];
  for (const line of lines) {
    try {
      entries.push(JSON.parse(line));
    } catch {
      // Skip corrupt lines
    }
  }
  return entries;
}

function lastEndEntry(projectDir: string): EvolveLedgerEntry | null {
  const entries = readEvolveLedger(projectDir);
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].phase === "end") return entries[i];
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Orphan Recovery                                                    */
/* ------------------------------------------------------------------ */

export function closeOrphanedEvolveRuns(projectDir: string): number {
  const entries = readEvolveLedger(projectDir);
  if (entries.length === 0) return 0;

  const startIds = new Set<string>();
  const endIds = new Set<string>();
  for (const e of entries) {
    if (e.phase === "start") startIds.add(e.runId);
    if (e.phase === "end") endIds.add(e.runId);
  }

  let closed = 0;
  for (const runId of startIds) {
    if (endIds.has(runId)) continue;

    const startEntry = entries.find(
      (e) => e.runId === runId && e.phase === "start",
    );
    if (!startEntry) continue;

    const prev = lastEndEntry(projectDir);
    const delta =
      prev !== null ? startEntry.totalIssues - prev.totalIssues : null;

    const endEntry: EvolveLedgerEntry = {
      timestamp: new Date().toISOString(),
      runId,
      phase: "end",
      epoch: startEntry.epoch,
      totalIssues: startEntry.totalIssues,
      byCategory: startEntry.byCategory,
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

export function appendEvolveEntry(
  projectDir: string,
  runId: string,
  phase: "start" | "end",
  epoch: number,
  issues: EvolveIssueSummary,
): EvolveLedgerEntry {
  const p = ledgerPath(projectDir);
  const dir = dirname(p);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const prev = lastEndEntry(projectDir);
  const delta = prev !== null ? issues.total - prev.totalIssues : null;

  const entry: EvolveLedgerEntry = {
    timestamp: new Date().toISOString(),
    runId,
    phase,
    epoch,
    totalIssues: issues.total,
    byCategory: issues.byCategory,
    delta,
    trend: classifyEvolveTrend(projectDir, delta),
  };

  appendFileSync(p, JSON.stringify(entry) + "\n", "utf-8");
  return entry;
}

/* ------------------------------------------------------------------ */
/*  Trend Classification                                               */
/* ------------------------------------------------------------------ */

function classifyEvolveTrend(
  projectDir: string,
  delta: number | null,
): EvolveLedgerEntry["trend"] {
  if (delta === null) return "first-run";

  const entries = readEvolveLedger(projectDir).filter((e) => e.phase === "end");
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

export function formatEvolveTrendTable(projectDir: string): string {
  const entries = readEvolveLedger(projectDir).filter((e) => e.phase === "end");

  if (entries.length === 0) return "No converge epochs recorded yet.";

  const trendIcon: Record<string, string> = {
    improving: "↘",
    stalled: "→",
    degrading: "↗",
    crashed: "✕",
    "first-run": "·",
  };

  const lines: string[] = [];
  lines.push("  Epoch │ Issues │  Delta │ Trend");
  lines.push("  ──────┼────────┼────────┼──────────");

  for (const entry of entries.slice(-10)) {
    const ep = String(entry.epoch).padStart(4);
    const issues = String(entry.totalIssues).padStart(6);
    const d =
      entry.delta !== null
        ? (entry.delta >= 0 ? "+" : "") + String(entry.delta).padStart(5)
        : "     ";
    const icon = trendIcon[entry.trend] ?? "?";
    const label = entry.trend;
    lines.push(`  ${ep}  │${issues} │${d}  │ ${label} ${icon}`);
  }

  return lines.join("\n");
}
