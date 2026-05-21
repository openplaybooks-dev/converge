/**
 * Metrics Command
 *
 * Extract and display cost, token, tool, and model metrics from journal logs.
 */

import { writeFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { formatDuration } from "./inspect-display.ts";
import {
  extractAll,
  aggregate,
  groupBy,
  extractAllCheckpoints,
  summarizeCheckpoints,
  extractFromInventory,
} from "@openplaybooks/converge-core/metrics";
import { getJournalRoot, getInventoryDir } from "@openplaybooks/converge-core/journal";
import { FilesystemStorage } from "@openplaybooks/converge-core/storage";
import {
  DEFAULT_PRICING,
  calculateCostWithModel,
  calculateSubscriptionCost,
} from "@openplaybooks/converge-core/metrics";
import type {
  AggregateMetrics,
  SessionMetrics,
  CheckpointSummary,
} from "@openplaybooks/converge-core/metrics";
import type { MetricsConfig, ModelPricing } from "@openplaybooks/converge-core/storage";

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
  if (summary.totalTasks === 0 && summary.totalAttempts === 0) return;

  console.log(`\n── Tasks ──`);
  const hasStatus =
    summary.completedTasks > 0 ||
    summary.failedTasks > 0 ||
    summary.pendingTasks > 0;
  if (hasStatus) {
    console.log(
      `  Tasks:       ${summary.totalTasks} (${summary.completedTasks} complete, ${summary.failedTasks} failed, ${summary.pendingTasks} pending)`,
    );
  } else {
    console.log(`  Tasks:       ${summary.totalTasks} in playbook${summary.totalTasks !== 1 ? "s" : ""}`);
  }
  if (summary.interruptedTasks > 0) {
    console.log(`  Interrupted: ${summary.interruptedTasks}`);
  }
  if (summary.totalAttempts > 0) {
    console.log(`  Success:     ${formatPercent(summary.taskSuccessRate)}`);
    console.log(
      `  Attempts:    ${summary.totalAttempts} total, ${summary.totalRetries} retries across ${summary.tasksWithRetries} tasks`,
    );
  }
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
  const playbookName = options.playbook ?? process.env.CONVERGE_PLAYBOOK ?? "default";

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

  // ── RFC 0033: Read from inventory first (committed runtime state) ──
  const inventoryMetrics = extractFromInventory(projectDir, playbookName);
  let agg = inventoryMetrics.aggregate;
  let cpSummary = inventoryMetrics.checkpointSummary;
  let sessions: SessionMetrics[] = [];
  let checkpoints: any[] = [];
  let journalAvailable = false;

  // ── Enrich from journal if available ──
  const pbJournalRoot = options.playbook
    ? join(journalRoot, options.playbook)
    : journalRoot;

  if (existsSync(pbJournalRoot)) {
    journalAvailable = true;
    try {
      if (options.playbook) {
        [sessions, checkpoints] = await Promise.all([
          extractAll(pbJournalRoot),
          extractAllCheckpoints(pbJournalRoot),
        ]);
      } else {
        // Cross-playbook analysis from journal
        const playbookNames = readdirSync(journalRoot).filter((name) => {
          const p = join(journalRoot, name);
          try {
            return statSync(p).isDirectory() && readdirSync(p).length > 0;
          } catch {
            return false;
          }
        });
        for (const name of playbookNames) {
          const playbookDir = join(journalRoot, name);
          const [pbSessions, pbCheckpoints] = await Promise.all([
            extractAll(playbookDir),
            extractAllCheckpoints(playbookDir),
          ]);
          for (const s of pbSessions) {
            (s as any).playbook = name;
          }
          for (const cp of pbCheckpoints) {
            (cp as any).playbook = name;
          }
          sessions.push(...pbSessions);
          checkpoints.push(...pbCheckpoints);
        }
      }
    } catch {
      console.warn("⚠️  Journal read error — showing inventory data only.");
    }

    // Merge journal-derived sessions into inventory aggregate
    if (sessions.length > 0) {
      // Journal has richer per-session data; override inventory aggregate
      let journalAgg = aggregate(sessions);
      // Apply pricing config
      if (Object.keys(customPricing).length > 0) {
        for (const session of sessions) {
          if (session.totalCostUsd === 0 && session.inputTokens > 0) {
            const model = metricsConfig?.defaultModel ?? "MiniMax-M2.7";
            const cost = calculateCostWithModel(
              session.inputTokens,
              session.outputTokens,
              model,
              customPricing,
            );
            (session as any).totalCostUsd = cost;
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
        journalAgg = aggregate(sessions);
      }
      // Use journal aggregate when available (more precise per-session data)
      agg = journalAgg;
    }

    // Use journal checkpoint summary when available
    if (checkpoints.length > 0) {
      cpSummary = summarizeCheckpoints(checkpoints);
    }
  } else if (inventoryMetrics.taskCount > 0) {
    console.warn("⚠️  Journal not found. Session-level detail (per-attempt logs, tool-call breakdown) unavailable.");
    console.warn("   Run `converge run` locally to generate journal data.\n");
  }

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

  cpSummary = summarizeCheckpoints(checkpoints);

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
        printSummary(key, agg);
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
