/**
 * Metrics Command
 *
 * Extract and display cost, token, tool, and model metrics from journal logs.
 */

import { writeFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  extractAll,
  aggregate,
  groupBy,
  extractAllCheckpoints,
  summarizeCheckpoints,
} from "../metrics/extract.ts";
import { getJournalRoot } from "../journal/structure.ts";
import { FilesystemStorage } from "../storage/filesystem.ts";
import {
  DEFAULT_PRICING,
  calculateCostWithModel,
  calculateSubscriptionCost,
} from "../metrics/pricing.ts";
import type {
  AggregateMetrics,
  SessionMetrics,
  CheckpointSummary,
} from "../metrics/types.ts";
import type { MetricsConfig, ModelPricing } from "../storage/types.ts";

export interface MetricsCommandOptions {
  /** Project directory (defaults to cwd) */
  dir?: string;
  /** Specific playbook to analyze (defaults to all playbooks) */
  playbook?: string;
  /** Group by epic */
  byEpic?: boolean;
  /** Group by task */
  byTask?: boolean;
  /** Group by model */
  byModel?: boolean;
  /** Top N most expensive sessions */
  top?: number;
  /** JSON output */
  json?: boolean;
  /** Write metrics.jsonl to journal dir */
  save?: boolean;
}

function formatCost(usd: number): string {
  return `$${usd.toFixed(4)}`;
}

function formatDuration(ms: number): string {
  const secs = ms / 1000;
  if (secs < 60) return `${secs.toFixed(1)}s`;
  const mins = Math.floor(secs / 60);
  const remainSecs = secs % 60;
  return `${mins}m ${remainSecs.toFixed(0)}s`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

function printSummary(label: string, agg: AggregateMetrics): void {
  console.log(`\n── ${label} ──`);
  console.log(
    `  Sessions:    ${agg.sessionCount} (${agg.successCount} ok, ${agg.failCount} failed, ${formatPercent(agg.errorRate)} error rate)`,
  );
  console.log(
    `  Cost:        ${formatCost(agg.totalCostUsd)} total, ${formatCost(agg.avgCostPerSession)} avg`,
  );
  console.log(
    `  Duration:    ${formatDuration(agg.totalDurationMs)} total, ${formatDuration(agg.avgDurationMs)} avg`,
  );
  console.log(`  Turns:       ${agg.totalTurns}`);
  console.log(
    `  Tokens:      ${formatTokens(agg.totalInputTokens)} in, ${formatTokens(agg.totalOutputTokens)} out, ${formatTokens(agg.totalCacheReadTokens)} cache-read, ${formatTokens(agg.totalCacheCreationTokens)} cache-create`,
  );
  console.log(`  Cache hit:   ${formatPercent(agg.cacheHitRate)}`);

  const tools = Object.entries(agg.toolBreakdown).sort(
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

  const models = Object.entries(agg.modelBreakdown).sort(
    (a, b) => b[1].costUSD - a[1].costUSD,
  );
  if (models.length > 0) {
    console.log(`  Models:`);
    for (const [model, stats] of models) {
      console.log(
        `    ${model.padEnd(25)} ${formatCost(stats.costUSD).padStart(10)}  ${String(stats.sessions).padStart(4)} sessions  ${formatTokens(stats.inputTokens)} in  ${formatTokens(stats.outputTokens)} out`,
      );
    }
  }
}

function printTopSessions(sessions: SessionMetrics[], n: number): void {
  const sorted = [...sessions].sort((a, b) => b.totalCostUsd - a.totalCostUsd);
  const top = sorted.slice(0, n);
  console.log(`\n── Top ${n} Most Expensive Sessions ──`);
  for (const s of top) {
    const taskLabel = s.task || s.epic;
    console.log(
      `  ${formatCost(s.totalCostUsd).padStart(10)}  ${formatDuration(s.durationMs).padStart(8)}  ${s.numTurns}t  ${taskLabel}`,
    );
  }
}

function printCheckpointSummary(summary: CheckpointSummary): void {
  console.log(`\n── Tasks & Epics ──`);
  console.log(`  Epics:       ${summary.totalEpics}`);
  console.log(
    `  Tasks:       ${summary.totalTasks} (${summary.completedTasks} complete, ${summary.failedTasks} failed, ${summary.pendingTasks} pending)`,
  );
  if (summary.interruptedTasks > 0) {
    console.log(`  Interrupted: ${summary.interruptedTasks}`);
  }
  console.log(`  Success:     ${formatPercent(summary.taskSuccessRate)}`);
  console.log(
    `  Attempts:    ${summary.totalAttempts} total, ${summary.totalRetries} retries across ${summary.tasksWithRetries} tasks`,
  );
  if (summary.totalDurationMs > 0) {
    console.log(
      `  Duration:    ${formatDuration(summary.totalDurationMs)} total, ${formatDuration(summary.avgTaskDurationMs)} avg/task`,
    );
  }
}

export async function metricsCommand(
  options: MetricsCommandOptions = {},
): Promise<void> {
  const projectDir = resolve(options.dir || process.cwd());
  const journalRoot = join(projectDir, ".converge", "journal");

  // Load metrics/pricing config from project.yaml
  let metricsConfig: MetricsConfig | undefined;
  try {
    const storage = new FilesystemStorage(join(projectDir, ".converge"));
    const projectConfig = storage.readProject();
    metricsConfig = projectConfig.metrics;
  } catch {
    // Ignore - use defaults
  }

  // Build pricing map from config
  const customPricing: Record<string, ModelPricing> = {};
  if (metricsConfig?.pricing) {
    for (const [model, pricing] of Object.entries(metricsConfig.pricing)) {
      customPricing[model] = pricing;
    }
  }

  let sessions: SessionMetrics[] = [];
  let checkpoints: any[] = [];

  if (options.playbook) {
    // Analyze specific playbook
    const playbookDir = join(journalRoot, options.playbook);
    if (!existsSync(playbookDir)) {
      console.log(`Playbook "${options.playbook}" not found.`);
      return;
    }
    [sessions, checkpoints] = await Promise.all([
      extractAll(playbookDir),
      extractAllCheckpoints(playbookDir),
    ]);
  } else {
    // Cross-playbook analysis - find all playbooks
    if (!existsSync(journalRoot)) {
      console.log("No journal found.");
      return;
    }

    const playbookNames = readdirSync(journalRoot).filter((name) => {
      const path = join(journalRoot, name);
      try {
        return statSync(path).isDirectory() && readdirSync(path).length > 0;
      } catch {
        return false;
      }
    });

    if (playbookNames.length === 0) {
      console.log("No data found.");
      return;
    }

    // Extract from each playbook
    for (const name of playbookNames) {
      const playbookDir = join(journalRoot, name);
      const [pbSessions, pbCheckpoints] = await Promise.all([
        extractAll(playbookDir),
        extractAllCheckpoints(playbookDir),
      ]);

      // Tag sessions with playbook name
      for (const s of pbSessions) {
        (s as any).playbook = name;
      }
      // Tag checkpoints with playbook name
      for (const cp of pbCheckpoints) {
        (cp as any).playbook = name;
      }

      sessions.push(...pbSessions);
      checkpoints.push(...pbCheckpoints);
    }
  }

  if (sessions.length === 0 && checkpoints.length === 0) {
    console.log("No data found.");
    return;
  }

  // Calculate costs using pricing config if not provided by provider
  if (Object.keys(customPricing).length > 0) {
    for (const session of sessions) {
      if (session.totalCostUsd === 0 && session.inputTokens > 0) {
        // Calculate cost using default model pricing
        const model = metricsConfig?.defaultModel ?? "MiniMax-M2.7";
        const cost = calculateCostWithModel(
          session.inputTokens,
          session.outputTokens,
          model,
          customPricing,
        );
        (session as any).totalCostUsd = cost;

        // Update per-model cost
        if (session.models.length === 0) {
          session.models.push({
            model,
            inputTokens: session.inputTokens,
            outputTokens: session.outputTokens,
            costUSD: cost,
          });
        }
      }
    }
  }

  // Aggregate first
  let agg = aggregate(sessions);

  // Calculate mixed subscription + per-model costs
  if (metricsConfig?.subscription?.enabled) {
    // Get subscription config
    const sub = metricsConfig.subscription;

    // Count MiniMax sessions (the subscription model)
    let minimaxSessions = 0;
    for (const s of sessions) {
      for (const m of s.models) {
        if (m.model === "MiniMax-M2.7") {
          minimaxSessions++;
          break; // Count session once
        }
      }
    }

    // Sum non-MiniMax costs (provider-returned costs)
    let otherCosts = 0;
    for (const s of sessions) {
      for (const m of s.models) {
        if (m.model !== "MiniMax-M2.7") {
          otherCosts += m.costUSD;
        }
      }
    }

    // Calculate subscription cost for MiniMax portion
    const minimaxCost = (minimaxSessions / sub.requestsIncluded) * sub.flatFee;

    // Set total cost = MiniMax subscription + other provider costs
    const totalCost = minimaxCost + otherCosts;

    // Update modelBreakdown to reflect subscription cost for MiniMax
    const updatedModelBreakdown = { ...agg.modelBreakdown };
    if (updatedModelBreakdown["MiniMax-M2.7"]) {
      updatedModelBreakdown["MiniMax-M2.7"] = {
        ...updatedModelBreakdown["MiniMax-M2.7"],
        costUSD: minimaxCost,
      };
    }

    agg = {
      ...agg,
      totalCostUsd: totalCost,
      modelBreakdown: updatedModelBreakdown,
    };
  }

  const cpSummary = summarizeCheckpoints(checkpoints);

  if (options.json) {
    const output: any = {
      checkpoints: cpSummary,
      overall: agg,
    };
    if (options.byEpic) output.byEpic = groupBy(sessions, (s) => s.epic);
    if (options.byTask)
      output.byTask = groupBy(sessions, (s) => `${s.epic}/${s.task}`);
    if (options.byModel) {
      const byModelGroup: Record<string, SessionMetrics[]> = {};
      for (const s of sessions) {
        for (const m of s.models) {
          const list = byModelGroup[m.model] ?? [];
          list.push(s);
          byModelGroup[m.model] = list;
        }
      }
      output.byModel = Object.fromEntries(
        Object.entries(byModelGroup).map(([k, v]) => [k, aggregate(v)]),
      );
    }
    if (options.top && options.top > 0) {
      output.topSessions = [...sessions]
        .sort((a, b) => b.totalCostUsd - a.totalCostUsd)
        .slice(0, options.top);
    }
    console.log(JSON.stringify(output, null, 2));
  } else {
    printCheckpointSummary(cpSummary);

    if (sessions.length > 0) {
      printSummary("Sessions", agg);
    }

    if (options.byEpic) {
      const groups = groupBy(sessions, (s) => s.epic);
      for (const [key, aggFromGroup] of Object.entries(groups).sort((a, b) =>
        a[0].localeCompare(b[0]),
      )) {
        let agg = aggFromGroup;
        // Apply subscription cost if enabled
        if (metricsConfig?.subscription?.enabled) {
          const effectiveCost = calculateSubscriptionCost(
            agg.sessionCount,
            metricsConfig.subscription,
          );
          agg = { ...agg, totalCostUsd: effectiveCost };
        }
        printSummary(`Epic: ${key}`, agg);
      }
    }

    if (options.byTask) {
      const groups = groupBy(sessions, (s) => `${s.epic}/${s.task}`);
      for (const [key, aggFromGroup] of Object.entries(groups).sort((a, b) =>
        a[0].localeCompare(b[0]),
      )) {
        let agg = aggFromGroup;
        // Apply subscription cost if enabled
        if (metricsConfig?.subscription?.enabled) {
          const effectiveCost = calculateSubscriptionCost(
            agg.sessionCount,
            metricsConfig.subscription,
          );
          agg = { ...agg, totalCostUsd: effectiveCost };
        }
        printSummary(`Task: ${key}`, agg);
      }
    }

    if (options.byModel) {
      const byModelGroup: Record<string, SessionMetrics[]> = {};
      for (const s of sessions) {
        for (const m of s.models) {
          const list = byModelGroup[m.model] ?? [];
          list.push(s);
          byModelGroup[m.model] = list;
        }
      }
      for (const [model, group] of Object.entries(byModelGroup)) {
        let agg = aggregate(group);
        // Apply subscription cost if enabled and this is MiniMax
        if (metricsConfig?.subscription?.enabled && model === "MiniMax-M2.7") {
          const effectiveCost = calculateSubscriptionCost(
            agg.sessionCount,
            metricsConfig.subscription,
          );
          agg = { ...agg, totalCostUsd: effectiveCost };
        }
        printSummary(`Model: ${model}`, agg);
      }
    }

    if (options.top && options.top > 0) {
      printTopSessions(sessions, options.top);
    }
  }

  if (options.save) {
    const outPath = join(journalRoot, "metrics.jsonl");
    const lines = sessions.map((s) => JSON.stringify(s)).join("\n") + "\n";
    writeFileSync(outPath, lines);
    console.log(`\nSaved ${sessions.length} sessions to ${outPath}`);
  }
}
