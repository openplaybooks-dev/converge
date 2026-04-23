/**
 * Cross-Attempt History Index
 *
 * Meta-Converge optimization (arxiv 2603.28052): The proposer reads 20+ prior
 * candidates per step, performing long-horizon credit assignment.
 *
 * This module builds a concise history.json from the attempt tracker's JSONL,
 * summarizing what was tried, what worked, and what failed across all attempts.
 * The AI reads this before repair to avoid repeating failed approaches.
 *
 * Output: .converge/journal/tasks/{epic}/tasks/{task}/history.json
 *
 * Token cost: ~200-500 tokens (vs reading raw attempts.jsonl: ~2000-5000 tokens)
 */

import { writeFile, readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { getJournalStructure } from "../../journal/structure.ts";
import type { AttemptRecord } from "./types.ts";
import type { JournalContext } from "./types.ts";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/**
 * Summary of a single task-level attempt (convergence iteration)
 */
export interface AttemptSummary {
  /** 1-based attempt number */
  attempt: number;
  /** Strategy that was tried */
  strategy: string;
  /** Whether it succeeded */
  success: boolean;
  /** Brief reason for outcome */
  reason: string;
  /** How long it took */
  durationMs: number;
  /** Gap count before this attempt */
  gapsBefore?: number;
  /** Gap count after this attempt */
  gapsAfter?: number;
  /** Brief description of what the approach did */
  approachSummary?: string;
}

/**
 * Full history index for a task
 */
export interface HistoryIndex {
  /** Task identifier */
  taskId: string;
  /** When this index was last updated */
  updatedAt: string;
  /** Total number of attempts */
  totalAttempts: number;
  /** Strategies that have been tried (with success/fail counts) */
  strategySummary: Record<
    string,
    { tried: number; succeeded: number; failed: number }
  >;
  /** Ordered list of attempt summaries */
  attempts: AttemptSummary[];
  /** Key patterns: what approaches were tried and failed (for AI to avoid) */
  failedApproaches: string[];
  /** What finally worked (if anything) */
  successfulApproach?: string;
}

/* ------------------------------------------------------------------ */
/*  Builder                                                            */
/* ------------------------------------------------------------------ */

export class HistoryIndexBuilder {
  private readonly historyPath: string;
  private readonly attemptsPath: string;

  constructor(
    private readonly projectDir: string,
    private readonly journalCtx: JournalContext,
  ) {
    const structure = getJournalStructure(
      projectDir,
      journalCtx.epicId,
      journalCtx.taskId,
    );
    this.historyPath = join(structure.task!, "history.json");
    this.attemptsPath = join(structure.task!, "attempts.jsonl");
  }

  /**
   * Rebuild history.json from attempts.jsonl.
   * Should be called after each repair attempt completes.
   */
  async rebuild(): Promise<HistoryIndex> {
    const records = await this.readAttempts();

    const strategySummary: HistoryIndex["strategySummary"] = {};
    const attempts: AttemptSummary[] = [];
    const failedApproaches: string[] = [];
    let successfulApproach: string | undefined;

    for (const record of records) {
      // Update strategy summary
      if (!strategySummary[record.strategyName]) {
        strategySummary[record.strategyName] = {
          tried: 0,
          succeeded: 0,
          failed: 0,
        };
      }
      const stats = strategySummary[record.strategyName];
      stats.tried++;
      if (record.outcome.success) {
        stats.succeeded++;
        successfulApproach = `${record.strategyName}: ${record.outcome.reason}`;
      } else {
        stats.failed++;
        failedApproaches.push(
          `${record.strategyName}: ${record.outcome.reason}`,
        );
      }

      // Build attempt summary
      attempts.push({
        attempt: record.attempt,
        strategy: record.strategyName,
        success: record.outcome.success,
        reason: record.outcome.reason,
        durationMs: record.durationMs,
      });
    }

    // Deduplicate failed approaches (keep unique reasons only)
    const uniqueFailedApproaches = [...new Set(failedApproaches)].slice(-10);

    const index: HistoryIndex = {
      taskId: this.journalCtx.taskId,
      updatedAt: new Date().toISOString(),
      totalAttempts: records.length,
      strategySummary,
      attempts: attempts.slice(-20), // Keep last 20 attempts
      failedApproaches: uniqueFailedApproaches,
      successfulApproach,
    };

    // Write to disk
    const dir = dirname(this.historyPath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    await writeFile(this.historyPath, JSON.stringify(index, null, 2));

    return index;
  }

  /**
   * Load existing history index (or null if not yet built)
   */
  async load(): Promise<HistoryIndex | null> {
    if (!existsSync(this.historyPath)) return null;
    try {
      const content = await readFile(this.historyPath, "utf-8");
      return JSON.parse(content) as HistoryIndex;
    } catch {
      return null;
    }
  }

  /**
   * Format history as a concise prompt section for AI consumption.
   * Saves tokens by showing only essential information.
   */
  async formatForPrompt(): Promise<string | null> {
    const index = await this.load();
    if (!index || index.totalAttempts === 0) return null;

    const lines: string[] = [
      `## Attempt History (${index.totalAttempts} prior attempts)`,
      "",
    ];

    // Strategy summary
    lines.push("### Strategies Tried");
    for (const [name, stats] of Object.entries(index.strategySummary)) {
      lines.push(
        `- ${name}: ${stats.tried}x (${stats.succeeded} succeeded, ${stats.failed} failed)`,
      );
    }
    lines.push("");

    // Failed approaches (most important for avoiding repetition)
    if (index.failedApproaches.length > 0) {
      lines.push("### Failed Approaches (DO NOT REPEAT)");
      for (const approach of index.failedApproaches) {
        lines.push(`- ${approach}`);
      }
      lines.push("");
    }

    // What worked
    if (index.successfulApproach) {
      lines.push(`### Last Successful Approach`);
      lines.push(`- ${index.successfulApproach}`);
      lines.push("");
    }

    return lines.join("\n");
  }

  /** Get path to history.json */
  get path(): string {
    return this.historyPath;
  }

  private async readAttempts(): Promise<AttemptRecord[]> {
    if (!existsSync(this.attemptsPath)) return [];
    try {
      const raw = await readFile(this.attemptsPath, "utf-8");
      return raw
        .split("\n")
        .filter((l) => l.trim())
        .map((l) => {
          try {
            return JSON.parse(l) as AttemptRecord;
          } catch {
            return null;
          }
        })
        .filter((r): r is AttemptRecord => r !== null);
    } catch {
      return [];
    }
  }
}
