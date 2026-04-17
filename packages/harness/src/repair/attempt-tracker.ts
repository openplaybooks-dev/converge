/**
 * AttemptTracker
 *
 * Persists a record of every fix strategy attempt to:
 *   .harness/journal/tasks/{epicId}/tasks/{taskId}/attempts.jsonl
 *
 * This makes strategy try-and-error fully observable:
 *   - Which strategies were tried for a gap
 *   - How long each took
 *   - Whether they succeeded or why they failed
 *   - How many times a strategy has been retried
 *
 * Readable by tests, dashboards, and AI self-inspection.
 */

import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { getJournalStructure } from '../journal/structure.ts';
import type { AttemptRecord } from './types.ts';
import type { JournalContext } from './types.ts';

export class AttemptTracker {
  private readonly attemptsPath: string;

  constructor(
    private readonly projectDir: string,
    private readonly journalCtx: JournalContext,
  ) {
    const structure = getJournalStructure(projectDir, journalCtx.epicId, journalCtx.taskId);
    this.attemptsPath = join(structure.task!, 'attempts.jsonl');
  }

  /** Append one attempt record. Creates the file if it doesn't exist. */
  async record(attempt: AttemptRecord): Promise<void> {
    const dir = dirname(this.attemptsPath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    await appendFile(this.attemptsPath, JSON.stringify(attempt) + '\n', 'utf-8');
  }

  /** All attempts across all strategies for a given gap ID. */
  async getAttempts(gapId: string): Promise<AttemptRecord[]> {
    const all = await this.readAll();
    return all.filter(a => a.gapId === gapId);
  }

  /**
   * Count how many times strategy `strategyName` has been attempted for `gapId`.
   * Useful to detect infinite retry loops within a single strategy.
   */
  async countAttempts(gapId: string, strategyName: string): Promise<number> {
    const all = await this.getAttempts(gapId);
    return all.filter(a => a.strategyName === strategyName).length;
  }

  /** Path to the attempts log, for log-tailing or test assertions. */
  get path(): string {
    return this.attemptsPath;
  }

  private async readAll(): Promise<AttemptRecord[]> {
    if (!existsSync(this.attemptsPath)) return [];
    const raw = await readFile(this.attemptsPath, 'utf-8');
    return raw
      .split('\n')
      .filter(l => l.trim())
      .map(l => {
        try {
          return JSON.parse(l) as AttemptRecord;
        } catch {
          return null;
        }
      })
      .filter((r): r is AttemptRecord => r !== null);
  }
}
