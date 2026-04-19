/**
 * Terminal-bench metrics collection and reporting.
 *
 * Collects per-task results, computes pass rate,
 * and formats a human-readable report.
 */

import type { TaskResult, CategoryBreakdown, TBenchResult } from "./types.ts";
import type { BenchmarkResult } from "@converge/core";

/**
 * Collect terminal-bench metrics from task results and a base BenchmarkResult.
 */
export function collectTBenchMetrics(
  base: BenchmarkResult,
  taskResults: TaskResult[],
): TBenchResult {
  const totalTasks = taskResults.length;
  const passedTasks = taskResults.filter((r) => r.passed).length;
  const passRate = totalTasks > 0 ? passedTasks / totalTasks : 0;

  // Group by category
  const categoryMap = new Map<string, TaskResult[]>();
  for (const r of taskResults) {
    const list = categoryMap.get(r.category) ?? [];
    list.push(r);
    categoryMap.set(r.category, list);
  }

  const categoryBreakdown: CategoryBreakdown[] = Array.from(categoryMap.entries())
    .map(([category, results]) => {
      const passed = results.filter((r) => r.passed).length;
      return {
        category,
        total: results.length,
        passed,
        passRate: results.length > 0 ? passed / results.length : 0,
      };
    })
    .sort((a, b) => b.passRate - a.passRate);

  return {
    ...base,
    tbench: {
      passRate,
      totalTasks,
      passedTasks,
      categoryBreakdown,
      tasks: taskResults,
    },
  };
}

/**
 * Format a human-readable report from terminal-bench results.
 */
export function formatReport(result: TBenchResult): string {
  const { tbench: tb } = result;
  const lines: string[] = [];

  lines.push("Terminal-Bench Results");
  lines.push("=".repeat(50));
  lines.push("");
  lines.push(`Pass Rate: ${(tb.passRate * 100).toFixed(1)}% (${tb.passedTasks}/${tb.totalTasks})`);
  lines.push("");

  // Cost summary from base metrics
  lines.push(`Total Cost: $${result.aggregate.totalCostUsd.toFixed(2)}`);
  lines.push(`Total Duration: ${(result.aggregate.totalDurationMs / 1000 / 60).toFixed(1)} min`);
  lines.push("");

  // Per-category breakdown
  if (tb.categoryBreakdown.length > 0) {
    lines.push("Per-Category Breakdown:");
    lines.push("-".repeat(50));

    const maxCatLen = Math.max(...tb.categoryBreakdown.map((c) => c.category.length));
    for (const cb of tb.categoryBreakdown) {
      const pct = (cb.passRate * 100).toFixed(0).padStart(3);
      const counts = `${cb.passed}/${cb.total}`.padStart(7);
      lines.push(`  ${cb.category.padEnd(maxCatLen)}  ${pct}%  ${counts}`);
    }
    lines.push("");
  }

  // Failed tasks (for debugging)
  const failed = tb.tasks.filter((t) => !t.passed);
  if (failed.length > 0 && failed.length <= 20) {
    lines.push(`Failed Tasks (${failed.length}):`);
    lines.push("-".repeat(50));
    for (const f of failed) {
      const reason = f.error ?? "tests failed";
      lines.push(`  ${f.taskId}: ${reason}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
