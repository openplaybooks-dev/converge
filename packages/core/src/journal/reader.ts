/**
 * Journal Reader
 *
 * Reads gaps, logs, and summaries from journal files.
 */

import { readFile, access, readdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { parse as yamlParse } from 'yaml';
import type { Gap } from '../gap/types.ts';
import type { JournalEvent, GapSummary, ReadLogOptions, SearchLogOptions, TaskStatus } from './types.ts';
import { getJournalPath } from './writer.ts';
import { getJournalFilePath, getEpicTasksDir, getEpicsDir } from './structure.ts';

/* ------------------------------------------------------------------ */
/*  Gap Reading (YAML)                                                */
/* ------------------------------------------------------------------ */

/**
 * Read gaps from gaps.yml file
 */
export async function readGaps(
  projectDir: string,
  level: 'project' | 'epic' | 'task',
  scope: string
): Promise<Gap[]> {
  const filePath = getJournalPath(projectDir, level, scope, 'gaps');

  try {
    const content = await readFile(filePath, 'utf-8');
    const summary = yamlParse(content) as GapSummary;
    return summary.gaps || [];
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return []; // File doesn't exist yet
    }
    throw error;
  }
}

/**
 * Read gap summary (without full gap details)
 */
export async function readGapSummary(
  projectDir: string,
  level: 'project' | 'epic' | 'task',
  scope: string
): Promise<GapSummary | null> {
  const filePath = getJournalPath(projectDir, level, scope, 'gaps');

  try {
    const content = await readFile(filePath, 'utf-8');
    const summary = yamlParse(content) as GapSummary;

    // Return summary without gaps array for lightweight access
    return {
      total: summary.total,
      byType: summary.byType,
      bySeverity: summary.bySeverity,
      updated: summary.updated,
      gaps: [], // Don't include gaps in summary
    };
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/* ------------------------------------------------------------------ */
/*  Event Reading (JSONL)                                             */
/* ------------------------------------------------------------------ */

/**
 * Read all events from events.jsonl file
 */
export async function readEvents(
  projectDir: string,
  level: 'project' | 'epic' | 'task',
  scope: string,
  options?: ReadLogOptions
): Promise<JournalEvent[]> {
  const filePath = getJournalPath(projectDir, level, scope, 'events');

  try {
    const content = await readFile(filePath, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line.length > 0);

    let events: JournalEvent[] = lines.map(line => JSON.parse(line));

    // Apply filters
    if (options) {
      // Filter by event type
      if (options.eventType) {
        const types = Array.isArray(options.eventType) ? options.eventType : [options.eventType];
        events = events.filter(e => types.includes(e.eventType));
      }

      // Filter by time range
      if (options.since) {
        events = events.filter(e => e.timestamp >= options.since!);
      }
      if (options.until) {
        events = events.filter(e => e.timestamp <= options.until!);
      }

      // Apply offset
      if (options.offset) {
        events = events.slice(options.offset);
      }

      // Apply limit
      if (options.last) {
        events = events.slice(-options.last);
      }
    }

    return events;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * Search events with pattern matching
 */
export async function searchEvents(
  projectDir: string,
  level: 'project' | 'epic' | 'task',
  scope: string,
  options: SearchLogOptions
): Promise<JournalEvent[]> {
  const filePath = getJournalPath(projectDir, level, scope, 'events');

  try {
    const content = await readFile(filePath, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line.length > 0);

    let events: JournalEvent[] = lines.map(line => JSON.parse(line));

    // Filter by event type
    const types = Array.isArray(options.eventType) ? options.eventType : [options.eventType];
    events = events.filter(e => types.includes(e.eventType));

    // Filter by pattern
    if (options.pattern) {
      const pattern = typeof options.pattern === 'string'
        ? new RegExp(options.pattern, 'i')
        : options.pattern;

      events = events.filter(e =>
        e.message && pattern.test(e.message)
      );
    }

    // Apply limit
    if (options.limit) {
      events = events.slice(0, options.limit);
    }

    return events;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * Read human-readable log file
 */
export async function readLog(
  projectDir: string,
  level: 'project' | 'epic' | 'task',
  scope: string,
  lastN?: number
): Promise<string> {
  const filePath = getJournalPath(projectDir, level, scope, 'log');

  try {
    const content = await readFile(filePath, 'utf-8');

    if (lastN) {
      const lines = content.trim().split('\n');
      return lines.slice(-lastN).join('\n');
    }

    return content;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return '';
    }
    throw error;
  }
}

/* ------------------------------------------------------------------ */
/*  File Existence Check                                              */
/* ------------------------------------------------------------------ */

/**
 * Check if journal file exists
 */
export async function journalExists(
  projectDir: string,
  level: 'project' | 'epic' | 'task',
  scope: string,
  type: 'gaps' | 'events' | 'summary' | 'log'
): Promise<boolean> {
  const filePath = getJournalPath(projectDir, level, scope, type);

  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Status Reading                                                     */
/* ------------------------------------------------------------------ */

/**
 * Read a task's status.json from its journal directory.
 * Returns null if the file doesn't exist yet.
 */
export async function readTaskStatus(
  projectDir: string,
  epicId: string,
  taskId: string
): Promise<TaskStatus | null> {
  const filePath = getJournalPath(projectDir, 'task', `${epicId}.${taskId}`, 'status');
  try {
    const content = await readFile(filePath, 'utf-8');
    return JSON.parse(content) as TaskStatus;
  } catch (error: any) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}
