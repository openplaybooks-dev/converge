/**
 * Table Formatter — terminal output matching converge metrics style.
 */

import type { AnalysisResult, DeepAnalysis } from "../analysis/types.ts";

function cost(usd: number): string {
  return `$${usd.toFixed(4)}`;
}

function duration(ms: number): string {
  const secs = ms / 1000;
  if (secs < 60) return `${secs.toFixed(1)}s`;
  const mins = Math.floor(secs / 60);
  const remain = secs % 60;
  return `${mins}m ${remain.toFixed(0)}s`;
}

function tokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function pct(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

export function printAnalysisResult(result: AnalysisResult): void {
  const { aggregate, checkpointSummary, deep } = result;

  // Header
  console.log("\n═══ Benchmark Analysis ═══");
  if (result.label) console.log(`  Label:       ${result.label}`);
  if (result.provider) console.log(`  Provider:    ${result.provider}`);
  if (result.model) console.log(`  Model:       ${result.model}`);
  console.log(`  Journal:     ${result.journalDir}`);
  console.log(`  Analyzed:    ${result.timestamp}`);

  // Checkpoint summary
  console.log(`\n── Tasks & Epics ──`);
  console.log(`  Epics:       ${checkpointSummary.totalEpics}`);
  console.log(
    `  Tasks:       ${checkpointSummary.totalTasks} (${checkpointSummary.completedTasks} done, ${checkpointSummary.failedTasks} failed, ${checkpointSummary.pendingTasks} pending)`,
  );
  if (checkpointSummary.interruptedTasks > 0) {
    console.log(`  Interrupted: ${checkpointSummary.interruptedTasks}`);
  }
  console.log(`  Success:     ${pct(checkpointSummary.taskSuccessRate)}`);
  console.log(
    `  Attempts:    ${checkpointSummary.totalAttempts} total, ${checkpointSummary.totalRetries} retries (${checkpointSummary.tasksWithRetries} tasks)`,
  );
  if (checkpointSummary.totalDurationMs > 0) {
    console.log(
      `  Duration:    ${duration(checkpointSummary.totalDurationMs)} total, ${duration(checkpointSummary.avgTaskDurationMs)} avg/task`,
    );
  }

  // Aggregate
  console.log(`\n── Sessions ──`);
  console.log(
    `  Sessions:    ${aggregate.sessionCount} (${aggregate.successCount} ok, ${aggregate.failCount} failed, ${pct(aggregate.errorRate)} error)`,
  );
  console.log(
    `  Cost:        ${cost(aggregate.totalCostUsd)} total, ${cost(aggregate.avgCostPerSession)} avg`,
  );
  console.log(
    `  Duration:    ${duration(aggregate.totalDurationMs)} total, ${duration(aggregate.avgDurationMs)} avg`,
  );
  console.log(`  Turns:       ${aggregate.totalTurns}`);
  console.log(
    `  Tokens:      ${tokens(aggregate.totalInputTokens)} in, ${tokens(aggregate.totalOutputTokens)} out, ${tokens(aggregate.totalCacheReadTokens)} cache-read, ${tokens(aggregate.totalCacheCreationTokens)} cache-create`,
  );
  console.log(`  Cache hit:   ${pct(aggregate.cacheHitRate)}`);

  // Tool breakdown
  const tools = Object.entries(aggregate.toolBreakdown).sort(
    (a, b) => b[1].calls - a[1].calls,
  );
  if (tools.length > 0) {
    console.log(`  Tools:`);
    for (const [tool, stats] of tools) {
      const failStr = stats.failures > 0 ? `, ${stats.failures} fail` : "";
      console.log(
        `    ${tool.padEnd(20)} ${String(stats.calls).padStart(5)} calls${failStr}`,
      );
    }
  }

  // Model breakdown
  const models = Object.entries(aggregate.modelBreakdown).sort(
    (a, b) => b[1].costUSD - a[1].costUSD,
  );
  if (models.length > 0) {
    console.log(`  Models:`);
    for (const [model, stats] of models) {
      console.log(
        `    ${model.padEnd(28)} ${cost(stats.costUSD).padStart(10)}  ${String(stats.sessions).padStart(4)} sessions  ${tokens(stats.inputTokens)} in  ${tokens(stats.outputTokens)} out`,
      );
    }
  }

  // Deep analysis
  if (deep) {
    printDeepAnalysis(deep);
  }

  // Convergence
  if (result.convergence.length > 0) {
    printConvergence(result.convergence);
  }
}

function printDeepAnalysis(deep: DeepAnalysis): void {
  console.log(`\n── Deep Analysis (.index.jsonl) ──`);
  console.log(`  Sessions analyzed: ${deep.sessions.length}`);

  // Tool stats
  console.log(`\n  Tool Performance:`);
  const tools = Object.entries(deep.tools.byTool).sort(
    (a, b) => b[1].calls - a[1].calls,
  );
  for (const [tool, stats] of tools) {
    const failStr =
      stats.failures > 0 ? `, ${pct(stats.failureRate)} fail` : "";
    console.log(
      `    ${tool.padEnd(20)} ${String(stats.calls).padStart(5)} calls  avg ${String(Math.round(stats.avgMs)).padStart(5)}ms  p50 ${String(Math.round(stats.p50Ms)).padStart(5)}ms  p95 ${String(Math.round(stats.p95Ms)).padStart(5)}ms${failStr}`,
    );
  }

  // Failure patterns
  if (deep.tools.failurePatterns.length > 0) {
    console.log(`\n  Failure Patterns:`);
    for (const fp of deep.tools.failurePatterns) {
      console.log(`    ${fp.tool}: ${fp.count} failures`);
      for (const ex of fp.examples.slice(0, 2)) {
        console.log(`      → ${ex.slice(0, 100)}`);
      }
    }
  }

  // Timeline
  const tl = deep.timeline;
  console.log(`\n  Time Breakdown:`);
  console.log(`    Wall clock:    ${duration(tl.wallClockMs)}`);
  console.log(`    Thinking:      ${pct(tl.thinkingPct)}`);
  console.log(`    Tool execution: ${pct(tl.toolExecutionPct)}`);
  console.log(`    Output:        ${pct(tl.outputPct)}`);
  console.log(`    Idle:          ${pct(tl.idlePct)}`);

  // Per-session summary
  if (deep.sessions.length > 0) {
    console.log(`\n  Per-Session Summary:`);
    console.log(
      `    ${"Session".padEnd(34)} ${"Task".padEnd(30)} ${"Tools".padStart(5)} ${"Fail".padStart(5)} ${"Time".padStart(9)} ${"Think%".padStart(7)}`,
    );
    for (const s of deep.sessions) {
      const thinkPct = s.durationMs > 0 ? s.thinkingTimeMs / s.durationMs : 0;
      console.log(
        `    ${s.sessionId.slice(0, 32).padEnd(34)} ${s.task.slice(0, 28).padEnd(30)} ${String(s.totalToolCalls).padStart(5)} ${String(s.failedToolCalls).padStart(5)} ${duration(s.durationMs).padStart(9)} ${pct(thinkPct).padStart(7)}`,
      );
    }
  }
}

function printConvergence(
  entries: {
    timestamp: string;
    totalGaps: number;
    weightedScore: number;
    trend: string;
    delta: number | null;
  }[],
): void {
  console.log(`\n── Convergence (Gap Ledger) ──`);
  console.log(
    `  ${"Run".padEnd(38)} ${"Gaps".padStart(5)} ${"Score".padStart(8)} ${"Delta".padStart(8)} ${"Trend"}`,
  );
  for (const e of entries.slice(-10)) {
    const deltaStr =
      e.delta !== null ? e.delta.toFixed(1).padStart(8) : "     N/A";
    console.log(
      `  ${e.timestamp.padEnd(38)} ${String(e.totalGaps).padStart(5)} ${e.weightedScore.toFixed(1).padStart(8)} ${deltaStr} ${e.trend}`,
    );
  }
}
