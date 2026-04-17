/**
 * ExecutionTimeline
 *
 * Append-only log of every task execution, stored at:
 *   .harness/journal/timeline.jsonl
 *
 * Enables two key capabilities:
 *
 *  1. **History query** — "Has task X run before? What did it produce?"
 *     Used by UpstreamRerunStrategy to find producers without re-scanning
 *     all SKILL.md / task.ts files.
 *
 *  2. **Rewind** — Re-run a task that previously ran, loading it fresh
 *     from its recorded `taskFilePath`.
 *
 * All writes are atomic appends (no in-place updates). When `finish()` is
 * called the matching `running` entry is updated by rewriting its line via
 * a JSON merge marker (`"_update": entryId`) that readers collapse.
 */

import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { v4 as uuidv4 } from 'uuid';

/* ------------------------------------------------------------------ */
/*  TimelineEntry                                                      */
/* ------------------------------------------------------------------ */

export interface TimelineEntry {
  /** Stable UUID, unique per run (not per task — same task can run many times). */
  id: string;
  taskId: string;
  /** Absolute path to the task's SKILL.md or task.ts file. */
  taskFilePath: string;
  epicId?: string;
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'completed' | 'failed';
  /** Relative paths (from projectDir) of files written during this run. */
  outputsProduced: string[];
  gapsResolved: number;
  gapsFailed: number;
}

/* ------------------------------------------------------------------ */
/*  ExecutionTimeline                                                  */
/* ------------------------------------------------------------------ */

export class ExecutionTimeline {
  private readonly timelinePath: string;

  constructor(private readonly projectDir: string) {
    this.timelinePath = join(projectDir, '.harness', 'journal', 'timeline.jsonl');
  }

  /* ── Write ──────────────────────────────────────────────────────── */

  /**
   * Record that a task is starting. Returns the entry `id` for later `finish()` calls.
   */
  async begin(taskId: string, taskFilePath: string, epicId?: string): Promise<string> {
    const entry: TimelineEntry = {
      id: uuidv4(),
      taskId,
      taskFilePath,
      epicId,
      startedAt: new Date().toISOString(),
      status: 'running',
      outputsProduced: [],
      gapsResolved: 0,
      gapsFailed: 0,
    };
    await this.append(entry);
    return entry.id;
  }

  /**
   * Mark a previously-started entry as completed or failed.
   * Appends a delta record that `readAll()` collapses via `id` merge.
   */
  async finish(
    entryId: string,
    status: 'completed' | 'failed',
    stats: {
      gapsResolved: number;
      gapsFailed: number;
      outputsProduced: string[];
    },
  ): Promise<void> {
    // Append a delta — same id, updated fields
    const delta: Partial<TimelineEntry> & { id: string } = {
      id: entryId,
      status,
      completedAt: new Date().toISOString(),
      ...stats,
    };
    await this.append(delta as TimelineEntry);
  }

  /* ── Read ───────────────────────────────────────────────────────── */

  /**
   * All runs of the given taskId, ordered chronologically (oldest first).
   * Delta records (same `id`) are merged so each entry reflects its final state.
   */
  async getHistory(taskId: string): Promise<TimelineEntry[]> {
    const all = await this.readAll();
    return all.filter(e => e.taskId === taskId);
  }

  /**
   * Find the most-recent completed run whose `outputsProduced` contains `relPath`,
   * or whose producing task declares `relPath` as an output (exact match).
   */
  async findProducer(relPath: string): Promise<TimelineEntry | undefined> {
    const all = await this.readAll();
    // Search from newest to oldest
    for (let i = all.length - 1; i >= 0; i--) {
      const entry = all[i];
      if (entry.status === 'completed' && entry.outputsProduced.includes(relPath)) {
        return entry;
      }
    }
    return undefined;
  }

  /**
   * Reload and re-run the task recorded in `entry`.
   * Uses dynamic import of Unit to avoid circular dependency.
   *
   * Returns true if the re-run converged (all gaps resolved).
   */
  async rewind(entry: TimelineEntry): Promise<boolean> {
    const { Unit } = await import('../unit/index.ts');

    console.log(`\n⏪ Rewind: re-running ${entry.taskId} (from ${entry.taskFilePath})`);

    try {
      // Always use fromPath() - it handles both SKILL.md and task.ts
      const unit = await Unit.fromPath(entry.taskFilePath);
      return await unit.run();
    } catch (err: any) {
      console.error(`   ❌ Rewind failed: ${err.message}`);
      return false;
    }
  }

  /* ── Internals ──────────────────────────────────────────────────── */

  private async append(entry: TimelineEntry): Promise<void> {
    const dir = join(this.projectDir, '.harness', 'journal');
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    await appendFile(this.timelinePath, JSON.stringify(entry) + '\n', 'utf-8');
  }

  /**
   * Read all entries and merge deltas (same `id`) into final states.
   */
  private async readAll(): Promise<TimelineEntry[]> {
    if (!existsSync(this.timelinePath)) return [];

    const raw = await readFile(this.timelinePath, 'utf-8');
    const lines = raw.split('\n').filter(l => l.trim());

    // Merge by id: later lines overwrite earlier for the same id
    const byId = new Map<string, TimelineEntry>();
    for (const line of lines) {
      try {
        const record = JSON.parse(line) as TimelineEntry;
        const existing = byId.get(record.id);
        byId.set(record.id, existing ? { ...existing, ...record } : record);
      } catch {
        // Skip malformed lines
      }
    }

    // Return chronological order (by startedAt)
    return [...byId.values()].sort(
      (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
    );
  }
}
