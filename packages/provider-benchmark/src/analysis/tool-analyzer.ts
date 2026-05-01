/**
 * Tool Analyzer — aggregate per-tool statistics from multiple DeepSessions.
 *
 * Computes:
 *   - Per-tool: counts, success/fail rates, avg/p50/p95/min/max timing
 *   - Failure patterns: which tools fail most, with examples
 */

import type {
  DeepSession,
  ToolAnalysis,
  ToolStats,
  ToolFailurePattern,
} from "./types.ts";

/** Compute ToolAnalysis from an array of DeepSessions */
export function analyzeTools(sessions: DeepSession[]): ToolAnalysis {
  // Collect all tool calls
  const allCalls = sessions.flatMap((s) => s.toolCalls);

  // Group by tool name
  const byTool = new Map<string, { durations: number[]; successes: number; failures: number }>();

  for (const call of allCalls) {
    const entry = byTool.get(call.tool) ?? { durations: [], successes: 0, failures: 0 };
    entry.durations.push(call.durationMs);
    if (call.success) {
      entry.successes++;
    } else {
      entry.failures++;
    }
    byTool.set(call.tool, entry);
  }

  // Compute stats per tool
  const toolStats: Record<string, ToolStats> = {};
  for (const [tool, entry] of byTool) {
    const sorted = [...entry.durations].sort((a, b) => a - b);
    const calls = entry.successes + entry.failures;

    toolStats[tool] = {
      calls,
      successes: entry.successes,
      failures: entry.failures,
      failureRate: calls > 0 ? entry.failures / calls : 0,
      avgMs: calls > 0 ? entry.durations.reduce((s, d) => s + d, 0) / calls : 0,
      p50Ms: percentile(sorted, 50),
      p95Ms: percentile(sorted, 95),
      minMs: sorted[0] ?? 0,
      maxMs: sorted[sorted.length - 1] ?? 0,
      totalMs: entry.durations.reduce((s, d) => s + d, 0),
    };
  }

  // Failure patterns: group failed calls by tool, collect examples
  const failByTool = new Map<string, { count: number; examples: string[] }>();
  for (const session of sessions) {
    for (const err of session.errors) {
      const entry = failByTool.get(err.tool) ?? { count: 0, examples: [] };
      entry.count++;
      if (entry.examples.length < 3) {
        entry.examples.push(err.preview);
      }
      failByTool.set(err.tool, entry);
    }
  }

  const failurePatterns: ToolFailurePattern[] = Array.from(failByTool.entries())
    .map(([tool, entry]) => ({
      tool,
      count: entry.count,
      examples: entry.examples,
    }))
    .sort((a, b) => b.count - a.count);

  const totalCalls = allCalls.length;
  const totalFailures = allCalls.filter((c) => !c.success).length;

  return {
    byTool: toolStats,
    failurePatterns,
    totalCalls,
    totalFailures,
    overallFailureRate: totalCalls > 0 ? totalFailures / totalCalls : 0,
  };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] * (hi - idx) + sorted[hi] * (idx - lo);
}
