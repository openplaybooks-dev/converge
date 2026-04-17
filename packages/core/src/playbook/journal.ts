/**
 * Playbook Journal
 *
 * Per-playbook aggregation on top of existing sessions.
 *
 *   journal/{playbook}/
 *   ├── playbook.json         ← metadata (name, created, lastRun)
 *   ├── trends.jsonl          ← one line per session/run
 *   ├── tasks/                ← task execution records (via getJournalStructure)
 *   └── sessions/             ← session logs (existing SessionLogger writes here)
 *
 * No separate "executions" — a session IS a run of the playbook.
 * trends.jsonl aggregates across sessions for cross-run comparison.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type {
  PlaybookTrendEntry,
  PlaybookContext,
} from './types.ts';

/* ------------------------------------------------------------------ */
/*  Path Helpers                                                       */
/* ------------------------------------------------------------------ */

export function getPlaybookJournalDir(projectDir: string, playbook: string): string {
  return join(projectDir, '.converge', 'journal', playbook);
}

/* ------------------------------------------------------------------ */
/*  Playbook Lifecycle                                                 */
/* ------------------------------------------------------------------ */

/**
 * Ensure playbook journal directory and playbook.json exist.
 * Returns the PlaybookContext for journal routing.
 */
export async function initPlaybookJournal(
  projectDir: string,
  playbook: string,
): Promise<PlaybookContext> {
  const pbDir = getPlaybookJournalDir(projectDir, playbook);
  await mkdir(pbDir, { recursive: true });

  const playbookJsonPath = join(pbDir, 'playbook.json');
  if (!existsSync(playbookJsonPath)) {
    await writeFile(
      playbookJsonPath,
      JSON.stringify({ name: playbook, created: new Date().toISOString() }, null, 2),
      'utf8',
    );
  }

  return { playbook };
}

/**
 * Record a completed run in trends.jsonl.
 * Called after a session finishes — uses session outcomes as the data source.
 */
export async function appendTrend(
  projectDir: string,
  playbook: string,
  entry: PlaybookTrendEntry,
): Promise<void> {
  const pbDir = getPlaybookJournalDir(projectDir, playbook);
  await appendJsonl(join(pbDir, 'trends.jsonl'), entry);

  // Update playbook.json lastRun
  const playbookJsonPath = join(pbDir, 'playbook.json');
  try {
    const playbookJson = JSON.parse(await readFile(playbookJsonPath, 'utf8'));
    playbookJson.lastRun = entry.timestamp;
    playbookJson.totalRuns = (playbookJson.totalRuns || 0) + 1;
    await writeFile(playbookJsonPath, JSON.stringify(playbookJson, null, 2), 'utf8');
  } catch {
    // Best effort
  }
}

/* ------------------------------------------------------------------ */
/*  Query                                                              */
/* ------------------------------------------------------------------ */

/**
 * Execution summary for display in `playbook history`.
 */
export interface ExecutionSummary {
  executionId: string;
  status: string;
  durationMs?: number;
  tasksCompleted: number;
  tasksTotal: number;
  tasksFailed: number;
}

/**
 * List executions for a playbook by reading session metadata files.
 * Falls back to trends.jsonl if no session directories exist.
 */
export async function listExecutions(
  projectDir: string,
  playbook: string,
): Promise<ExecutionSummary[]> {
  const pbDir = getPlaybookJournalDir(projectDir, playbook);
  const sessionsDir = join(pbDir, 'sessions');

  // Try reading session metadata files first
  if (existsSync(sessionsDir)) {
    const { readdir } = await import('node:fs/promises');
    try {
      const entries = await readdir(sessionsDir, { withFileTypes: true });
      const summaries: ExecutionSummary[] = [];

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const metadataPath = join(sessionsDir, entry.name, 'metadata.json');
        if (!existsSync(metadataPath)) continue;

        try {
          const raw = JSON.parse(await readFile(metadataPath, 'utf8'));
          summaries.push({
            executionId: raw.sessionId || entry.name,
            status: raw.status || 'unknown',
            durationMs: raw.duration,
            tasksCompleted: raw.outcomes?.tasksCompleted ?? 0,
            tasksTotal: raw.outcomes?.tasksCompleted
              ? (raw.outcomes.tasksCompleted + (raw.outcomes.tasksFailed ?? 0))
              : 0,
            tasksFailed: raw.outcomes?.tasksFailed ?? 0,
          });
        } catch {
          // Skip unreadable metadata
        }
      }

      if (summaries.length > 0) {
        // Most recent first
        summaries.sort((a, b) => b.executionId.localeCompare(a.executionId));
        return summaries;
      }
    } catch {
      // Fall through to trends
    }
  }

  // Fall back to trends.jsonl
  const trends = await readTrends(projectDir, playbook);
  return trends.map(t => ({
    executionId: t.sessionId,
    status: t.tasksFailed > 0 ? 'failed' : 'complete',
    durationMs: t.durationMs,
    tasksCompleted: t.tasksComplete,
    tasksTotal: t.tasksTotal,
    tasksFailed: t.tasksFailed,
  })).reverse();
}

/**
 * Read trends for a playbook.
 */
export async function readTrends(
  projectDir: string,
  playbook: string,
): Promise<PlaybookTrendEntry[]> {
  const trendsPath = join(getPlaybookJournalDir(projectDir, playbook), 'trends.jsonl');
  if (!existsSync(trendsPath)) return [];

  const content = await readFile(trendsPath, 'utf8');
  return content
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line));
}

/* ------------------------------------------------------------------ */
/*  Utility                                                            */
/* ------------------------------------------------------------------ */

async function appendJsonl(path: string, data: unknown): Promise<void> {
  const line = JSON.stringify(data) + '\n';
  const { appendFile } = await import('node:fs/promises');
  const { dirname } = await import('node:path');
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, line, 'utf8');
}
