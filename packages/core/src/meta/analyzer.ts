/**
 * Meta-Analyzer: Converge Self-Optimization Loop
 *
 * Meta-Converge insight (arxiv 2603.28052): The outer loop discovers new
 * strategies autonomously by reading execution traces and scores.
 *
 * This is a lighter-weight version — after every N tasks (configurable),
 * it scans task journals, identifies patterns in failures/successes, and
 * produces concrete improvement proposals for human review.
 *
 * Output: .converge/meta/proposals/{timestamp}-proposal.md
 *
 * Flow:
 *   1. Scan recent task journals (attempts, strategies, outcomes)
 *   2. Aggregate statistics (which strategies work, which fail, which patterns repeat)
 *   3. Identify improvement opportunities
 *   4. Write proposal to .converge/meta/proposals/
 *
 * Over time, this builds a dataset of what works — enabling data-driven
 * framework improvements instead of ad-hoc strategy additions.
 */

import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { getJournalStructure, getEpicsDir } from "../journal/structure.ts";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/**
 * Raw task journal data extracted from a single task
 */
export interface TaskJournalEntry {
  /** Full task ID (epic/task) */
  taskId: string;
  /** Epic ID */
  epicId: string;
  /** Number of attempts made */
  attempts: number;
  /** Final outcome: completed, failed, stalled */
  outcome: "completed" | "failed" | "stalled" | "unknown";
  /** Strategies that were tried (from attempts.jsonl) */
  strategiesUsed: Array<{
    name: string;
    success: boolean;
    reason: string;
    durationMs: number;
  }>;
  /** Check IDs that failed */
  failedChecks: string[];
  /** Gap kinds that were detected */
  gapKinds: string[];
}

/**
 * Aggregated statistics across multiple tasks
 */
export interface MetaAnalysisStats {
  /** Total tasks analyzed */
  totalTasks: number;
  /** Tasks that completed successfully */
  completedTasks: number;
  /** Tasks that failed */
  failedTasks: number;
  /** Per-strategy success rates */
  strategyStats: Record<
    string,
    {
      attempted: number;
      succeeded: number;
      failed: number;
      avgDurationMs: number;
      successRate: number;
    }
  >;
  /** Most common gap kinds */
  gapKindCounts: Record<string, number>;
  /** Most common failure reasons */
  topFailureReasons: Array<{ reason: string; count: number }>;
  /** Average attempts per task */
  avgAttempts: number;
  /** Tasks that required 3+ attempts */
  highAttemptTasks: string[];
}

/**
 * A concrete improvement proposal
 */
export interface ImprovementProposal {
  /** ISO timestamp of when this was generated */
  generatedAt: string;
  /** Number of tasks analyzed */
  tasksAnalyzed: number;
  /** High-level summary of findings */
  summary: string;
  /** Specific proposals */
  proposals: Array<{
    /** What to change */
    title: string;
    /** Why this would help */
    rationale: string;
    /** Which file(s) to modify */
    affectedFiles: string[];
    /** Expected improvement */
    expectedImpact: "high" | "medium" | "low";
    /** Implementation difficulty */
    effort: "low" | "medium" | "high";
  }>;
  /** Raw statistics for reference */
  stats: MetaAnalysisStats;
}

/* ------------------------------------------------------------------ */
/*  Configuration                                                      */
/* ------------------------------------------------------------------ */

export interface MetaAnalyzerConfig {
  /** Run analysis after every N tasks (default: 10) */
  taskInterval: number;
  /** Maximum number of recent tasks to analyze (default: 20) */
  maxTasksToAnalyze: number;
  /** Directory for proposals */
  proposalsDir: string;
}

const DEFAULT_CONFIG: MetaAnalyzerConfig = {
  taskInterval: 10,
  maxTasksToAnalyze: 20,
  proposalsDir: ".converge/meta/proposals",
};

/* ------------------------------------------------------------------ */
/*  Meta-Analyzer                                                      */
/* ------------------------------------------------------------------ */

export class MetaAnalyzer {
  private config: MetaAnalyzerConfig;
  private tasksSinceLastAnalysis = 0;

  constructor(
    private readonly projectDir: string,
    config?: Partial<MetaAnalyzerConfig>,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Notify the analyzer that a task completed.
   * Runs analysis if the task interval threshold is reached.
   */
  async onTaskCompleted(
    taskId: string,
    outcome: "completed" | "failed",
  ): Promise<void> {
    this.tasksSinceLastAnalysis++;

    if (this.tasksSinceLastAnalysis >= this.config.taskInterval) {
      this.tasksSinceLastAnalysis = 0;
      try {
        await this.runAnalysis();
      } catch (err) {
        // Non-fatal — meta-analysis is best-effort
        console.log(`   ℹ️  Meta-analysis skipped: ${(err as Error).message}`);
      }
    }
  }

  /**
   * Force an analysis run regardless of interval.
   */
  async runAnalysis(): Promise<ImprovementProposal | null> {
    console.log(`\n📊 Running meta-analysis on recent task journals...`);

    // 1. Scan task journals
    const entries = await this.scanTaskJournals();
    if (entries.length < 3) {
      console.log(
        `   ℹ️  Not enough tasks to analyze (${entries.length} found, need 3+)`,
      );
      return null;
    }

    // 2. Aggregate statistics
    const stats = this.aggregateStats(entries);

    // 3. Generate improvement proposals
    const proposal = this.generateProposals(stats, entries);

    // 4. Write proposal to disk
    await this.writeProposal(proposal);

    console.log(
      `   ✅ Meta-analysis complete: ${proposal.proposals.length} proposal(s) written`,
    );
    console.log(`   📂 ${join(this.projectDir, this.config.proposalsDir)}`);

    return proposal;
  }

  /* ── Journal scanning ────────────────────────────────────────────── */

  private async scanTaskJournals(): Promise<TaskJournalEntry[]> {
    const journalBase = getEpicsDir(this.projectDir);
    if (!existsSync(journalBase)) return [];

    const entries: TaskJournalEntry[] = [];

    try {
      const epicDirs = await readdir(journalBase);

      for (const epicId of epicDirs) {
        const tasksDir = join(journalBase, epicId, "tasks");
        if (!existsSync(tasksDir)) continue;

        const taskDirs = await readdir(tasksDir);
        for (const taskId of taskDirs) {
          const entry = await this.readTaskJournal(epicId, taskId);
          if (entry) entries.push(entry);
        }
      }
    } catch {
      // Directory structure may not exist yet
    }

    // Sort by most recent (based on latest attempt) and limit
    return entries.slice(-this.config.maxTasksToAnalyze);
  }

  private async readTaskJournal(
    epicId: string,
    taskId: string,
  ): Promise<TaskJournalEntry | null> {
    const structure = getJournalStructure(this.projectDir, epicId, taskId);
    if (!structure.task || !existsSync(structure.task)) return null;

    const attemptsPath = join(structure.task, "attempts.jsonl");
    const historyPath = join(structure.task, "history.json");

    const entry: TaskJournalEntry = {
      taskId: `${epicId}/${taskId}`,
      epicId,
      attempts: 0,
      outcome: "unknown",
      strategiesUsed: [],
      failedChecks: [],
      gapKinds: [],
    };

    // Read attempts.jsonl
    if (existsSync(attemptsPath)) {
      try {
        const raw = await readFile(attemptsPath, "utf-8");
        const records = raw
          .split("\n")
          .filter((l) => l.trim())
          .map((l) => {
            try {
              return JSON.parse(l);
            } catch {
              return null;
            }
          })
          .filter(Boolean);

        entry.attempts = records.length;

        for (const r of records) {
          entry.strategiesUsed.push({
            name: r.strategyName,
            success: r.outcome?.success ?? false,
            reason: r.outcome?.reason ?? "",
            durationMs: r.durationMs ?? 0,
          });

          // Extract gap kinds from gap IDs
          if (r.gapId) {
            const kindMatch = r.gapId.match(
              /-(?:missing-output|check-failed|missing-input|corrupted|plan|seed)-/,
            );
            if (kindMatch)
              entry.gapKinds.push(kindMatch[0].replace(/-/g, "").trim());
          }
        }
      } catch {
        /* skip unreadable files */
      }
    }

    // Read history.json for final outcome
    if (existsSync(historyPath)) {
      try {
        const history = JSON.parse(await readFile(historyPath, "utf-8"));
        entry.outcome = history.successfulApproach ? "completed" : "failed";
      } catch {
        /* skip */
      }
    }

    // Determine outcome from checkpoint if history doesn't have it
    if (entry.outcome === "unknown") {
      const checkpointPath = join(structure.task, "checkpoint.json");
      if (existsSync(checkpointPath)) {
        try {
          const cp = JSON.parse(await readFile(checkpointPath, "utf-8"));
          if (cp.status === "complete") entry.outcome = "completed";
          else if (cp.status === "failed") entry.outcome = "failed";
        } catch {
          /* skip */
        }
      }
    }

    return entry;
  }

  /* ── Statistics aggregation ──────────────────────────────────────── */

  private aggregateStats(entries: TaskJournalEntry[]): MetaAnalysisStats {
    const strategyStats: MetaAnalysisStats["strategyStats"] = {};
    const gapKindCounts: Record<string, number> = {};
    const failureReasons: Record<string, number> = {};

    let totalAttempts = 0;
    const highAttemptTasks: string[] = [];

    for (const entry of entries) {
      totalAttempts += entry.attempts;

      if (entry.attempts >= 3) {
        highAttemptTasks.push(entry.taskId);
      }

      // Aggregate strategy stats
      for (const s of entry.strategiesUsed) {
        if (!strategyStats[s.name]) {
          strategyStats[s.name] = {
            attempted: 0,
            succeeded: 0,
            failed: 0,
            avgDurationMs: 0,
            successRate: 0,
          };
        }
        const stats = strategyStats[s.name];
        stats.attempted++;
        if (s.success) stats.succeeded++;
        else {
          stats.failed++;
          // Track failure reasons
          const reason = s.reason.slice(0, 100);
          failureReasons[reason] = (failureReasons[reason] || 0) + 1;
        }
        stats.avgDurationMs =
          (stats.avgDurationMs * (stats.attempted - 1) + s.durationMs) /
          stats.attempted;
      }

      // Aggregate gap kinds
      for (const kind of entry.gapKinds) {
        gapKindCounts[kind] = (gapKindCounts[kind] || 0) + 1;
      }
    }

    // Calculate success rates
    for (const stats of Object.values(strategyStats)) {
      stats.successRate =
        stats.attempted > 0 ? stats.succeeded / stats.attempted : 0;
    }

    // Sort failure reasons by count
    const topFailureReasons = Object.entries(failureReasons)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([reason, count]) => ({ reason, count }));

    return {
      totalTasks: entries.length,
      completedTasks: entries.filter((e) => e.outcome === "completed").length,
      failedTasks: entries.filter((e) => e.outcome === "failed").length,
      strategyStats,
      gapKindCounts,
      topFailureReasons,
      avgAttempts: entries.length > 0 ? totalAttempts / entries.length : 0,
      highAttemptTasks,
    };
  }

  /* ── Proposal generation ─────────────────────────────────────────── */

  private generateProposals(
    stats: MetaAnalysisStats,
    entries: TaskJournalEntry[],
  ): ImprovementProposal {
    const proposals: ImprovementProposal["proposals"] = [];

    // Rule 1: Strategies with <20% success rate that have been tried 5+ times
    for (const [name, s] of Object.entries(stats.strategyStats)) {
      if (s.attempted >= 5 && s.successRate < 0.2) {
        proposals.push({
          title: `Deprioritize or fix "${name}" strategy`,
          rationale:
            `Strategy "${name}" has a ${(s.successRate * 100).toFixed(0)}% success rate across ${s.attempted} attempts. ` +
            `It wastes ~${Math.round(s.avgDurationMs / 1000)}s per attempt. ` +
            `Consider lowering its priority or adding canHandle() guards to skip cases it can't fix.`,
          affectedFiles: [
            "repair/strategy-catalog.ts",
            `repair/strategies/${name
              .replace(/Strategy$/, "")
              .replace(/([A-Z])/g, "-$1")
              .toLowerCase()
              .replace(/^-/, "")}.ts`,
          ],
          expectedImpact: "high",
          effort: "low",
        });
      }
    }

    // Rule 2: Tasks with 3+ attempts suggest the convergence loop isn't learning
    if (stats.highAttemptTasks.length > entries.length * 0.3) {
      proposals.push({
        title: "Improve cross-attempt learning",
        rationale:
          `${stats.highAttemptTasks.length} of ${stats.totalTasks} tasks required 3+ attempts. ` +
          `The LEARN.md feedback may not be specific enough. Consider: ` +
          `(1) Include failing command output in LEARN.md, ` +
          `(2) Pass previous attempt diff to next attempt, ` +
          `(3) Use history.json to guide strategy selection.`,
        affectedFiles: ["lifecycle/learn.ts", "repair/pipeline.ts"],
        expectedImpact: "high",
        effort: "medium",
      });
    }

    // Rule 3: Repeated failure reasons suggest a systemic issue
    for (const { reason, count } of stats.topFailureReasons) {
      if (count >= 3) {
        proposals.push({
          title: `Add strategy for repeated failure: "${reason.slice(0, 60)}"`,
          rationale:
            `The failure "${reason}" occurred ${count} times across different tasks. ` +
            `No existing strategy handles this pattern. Consider adding a targeted FixStrategy.`,
          affectedFiles: ["repair/strategies/"],
          expectedImpact: "medium",
          effort: "medium",
        });
      }
    }

    // Rule 4: If a strategy is never tried but should be, suggest better canHandle()
    const unusedStrategies = Object.entries(stats.strategyStats).filter(
      ([, s]) => s.attempted === 0,
    );
    if (unusedStrategies.length > 0 && stats.failedTasks > 0) {
      proposals.push({
        title: `Review canHandle() for unused strategies: ${unusedStrategies.map(([n]) => n).join(", ")}`,
        rationale:
          `These strategies were never tried despite ${stats.failedTasks} failed tasks. ` +
          `Their canHandle() may be too restrictive, or they're not registered in the pipeline.`,
        affectedFiles: unusedStrategies.map(
          ([n]) => `repair/strategies/${n}.ts`,
        ),
        expectedImpact: "medium",
        effort: "low",
      });
    }

    // Rule 5: High overall failure rate suggests framework-level issues
    const overallSuccessRate =
      stats.totalTasks > 0 ? stats.completedTasks / stats.totalTasks : 0;
    if (overallSuccessRate < 0.5 && stats.totalTasks >= 5) {
      proposals.push({
        title: "Review task definitions for systemic issues",
        rationale:
          `Only ${(overallSuccessRate * 100).toFixed(0)}% of tasks completed (${stats.completedTasks}/${stats.totalTasks}). ` +
          `This suggests task definitions may have systemic problems: ` +
          `missing inputs, unreachable outputs, or checks that can't pass in the environment.`,
        affectedFiles: ["config/task-definition.ts", "unit/find-gaps.ts"],
        expectedImpact: "high",
        effort: "high",
      });
    }

    // Build summary
    const summaryParts = [
      `Analyzed ${stats.totalTasks} tasks: ${stats.completedTasks} completed, ${stats.failedTasks} failed.`,
      `Average ${stats.avgAttempts.toFixed(1)} attempts per task.`,
    ];

    const bestStrategy = Object.entries(stats.strategyStats)
      .filter(([, s]) => s.attempted >= 3)
      .sort(([, a], [, b]) => b.successRate - a.successRate)[0];

    if (bestStrategy) {
      summaryParts.push(
        `Best strategy: ${bestStrategy[0]} (${(bestStrategy[1].successRate * 100).toFixed(0)}% success rate).`,
      );
    }

    return {
      generatedAt: new Date().toISOString(),
      tasksAnalyzed: stats.totalTasks,
      summary: summaryParts.join(" "),
      proposals,
      stats,
    };
  }

  /* ── Proposal writing ────────────────────────────────────────────── */

  private async writeProposal(proposal: ImprovementProposal): Promise<void> {
    const proposalsDir = join(this.projectDir, this.config.proposalsDir);
    await mkdir(proposalsDir, { recursive: true });

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);
    const mdPath = join(proposalsDir, `${timestamp}-proposal.md`);
    const jsonPath = join(proposalsDir, `${timestamp}-proposal.json`);

    // Write machine-readable JSON
    await writeFile(jsonPath, JSON.stringify(proposal, null, 2));

    // Write human-readable markdown
    const md = this.formatProposalAsMd(proposal);
    await writeFile(mdPath, md);
  }

  private formatProposalAsMd(proposal: ImprovementProposal): string {
    const lines: string[] = [
      `# Converge Self-Optimization Proposal`,
      ``,
      `Generated: ${proposal.generatedAt}`,
      `Tasks analyzed: ${proposal.tasksAnalyzed}`,
      ``,
      `## Summary`,
      ``,
      proposal.summary,
      ``,
    ];

    // Proposals
    if (proposal.proposals.length > 0) {
      lines.push(`## Proposals (${proposal.proposals.length})`, ``);

      for (let i = 0; i < proposal.proposals.length; i++) {
        const p = proposal.proposals[i];
        lines.push(
          `### ${i + 1}. ${p.title}`,
          ``,
          `**Impact**: ${p.expectedImpact} | **Effort**: ${p.effort}`,
          ``,
          p.rationale,
          ``,
          `**Files**: ${p.affectedFiles.join(", ")}`,
          ``,
        );
      }
    } else {
      lines.push(
        `## No Proposals`,
        ``,
        `All strategies are performing well. No improvements needed.`,
        ``,
      );
    }

    // Strategy performance table
    lines.push(`## Strategy Performance`, ``);
    lines.push(
      `| Strategy | Attempted | Succeeded | Failed | Success Rate | Avg Duration |`,
    );
    lines.push(
      `|----------|-----------|-----------|--------|--------------|--------------|`,
    );

    for (const [name, s] of Object.entries(proposal.stats.strategyStats)) {
      lines.push(
        `| ${name} | ${s.attempted} | ${s.succeeded} | ${s.failed} | ${(s.successRate * 100).toFixed(0)}% | ${Math.round(s.avgDurationMs / 1000)}s |`,
      );
    }
    lines.push(``);

    // Top failure reasons
    if (proposal.stats.topFailureReasons.length > 0) {
      lines.push(`## Top Failure Reasons`, ``);
      for (const { reason, count } of proposal.stats.topFailureReasons) {
        lines.push(`- (${count}x) ${reason}`);
      }
      lines.push(``);
    }

    // High-attempt tasks
    if (proposal.stats.highAttemptTasks.length > 0) {
      lines.push(`## Tasks Requiring 3+ Attempts`, ``);
      for (const t of proposal.stats.highAttemptTasks) {
        lines.push(`- ${t}`);
      }
      lines.push(``);
    }

    return lines.join("\n");
  }
}
