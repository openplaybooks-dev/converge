/**
 * SWE-bench metrics collection and reporting.
 *
 * Collects per-instance results, computes resolve rate,
 * and formats a human-readable report.
 */

import type { InstanceResult, RepoBreakdown, SWEBenchResult } from "./types.ts";
import type { BenchmarkResult } from "@converge/core";

/**
 * Collect SWE-bench metrics from instance results and a base BenchmarkResult.
 */
export function collectSWEBenchMetrics(
  base: BenchmarkResult,
  instanceResults: InstanceResult[],
): SWEBenchResult {
  const totalInstances = instanceResults.length;
  const resolvedInstances = instanceResults.filter((r) => r.resolved).length;
  const patchesProduced = instanceResults.filter((r) => r.patchProduced).length;
  const resolveRate = totalInstances > 0 ? resolvedInstances / totalInstances : 0;

  // Group by repo
  const repoMap = new Map<string, InstanceResult[]>();
  for (const r of instanceResults) {
    const list = repoMap.get(r.repo) ?? [];
    list.push(r);
    repoMap.set(r.repo, list);
  }

  const repoBreakdown: RepoBreakdown[] = Array.from(repoMap.entries())
    .map(([repo, results]) => {
      const resolved = results.filter((r) => r.resolved).length;
      return {
        repo,
        total: results.length,
        resolved,
        resolveRate: results.length > 0 ? resolved / results.length : 0,
      };
    })
    .sort((a, b) => b.resolveRate - a.resolveRate);

  return {
    ...base,
    swebench: {
      resolveRate,
      totalInstances,
      resolvedInstances,
      patchesProduced,
      repoBreakdown,
      instances: instanceResults,
    },
  };
}

/**
 * Format a human-readable report from SWE-bench results.
 */
export function formatReport(result: SWEBenchResult): string {
  const { swebench: sb } = result;
  const lines: string[] = [];

  lines.push("SWE-bench Lite Results");
  lines.push("=".repeat(50));
  lines.push("");
  lines.push(`Resolve Rate: ${(sb.resolveRate * 100).toFixed(1)}% (${sb.resolvedInstances}/${sb.totalInstances})`);
  lines.push(`Patches Produced: ${sb.patchesProduced}/${sb.totalInstances}`);
  lines.push("");

  // Cost summary from base metrics
  lines.push(`Total Cost: $${result.aggregate.totalCostUsd.toFixed(2)}`);
  lines.push(`Total Duration: ${(result.aggregate.totalDurationMs / 1000 / 60).toFixed(1)} min`);
  lines.push("");

  // Per-repo breakdown
  if (sb.repoBreakdown.length > 0) {
    lines.push("Per-Repo Breakdown:");
    lines.push("-".repeat(50));

    const maxRepoLen = Math.max(...sb.repoBreakdown.map((r) => r.repo.length));
    for (const rb of sb.repoBreakdown) {
      const pct = (rb.resolveRate * 100).toFixed(0).padStart(3);
      const counts = `${rb.resolved}/${rb.total}`.padStart(7);
      lines.push(`  ${rb.repo.padEnd(maxRepoLen)}  ${pct}%  ${counts}`);
    }
    lines.push("");
  }

  // Failed instances (for debugging)
  const failed = sb.instances.filter((i) => !i.resolved);
  if (failed.length > 0 && failed.length <= 20) {
    lines.push(`Unresolved Instances (${failed.length}):`);
    lines.push("-".repeat(50));
    for (const f of failed) {
      const reason = f.error ?? (f.patchProduced ? "tests failed" : "no patch");
      lines.push(`  ${f.instanceId}: ${reason}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
