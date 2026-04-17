/**
 * Backlog Command
 *
 * Display accumulated backlog items from after/backlogs.jsonl files
 * across all tasks in the project journal.
 */

import { resolve, relative } from 'node:path';
import { readFile } from 'node:fs/promises';
import { glob } from 'glob';
import { getEpicsDir } from '../journal/structure.ts';
import type { BacklogItem } from '../scan/types.ts';

export interface BacklogCommandOptions {
  dir?: string;
  /** Filter to specific epic */
  epic?: string;
  /** Filter to minimum severity */
  severity?: string;
  /** Output as JSON */
  json?: boolean;
}

interface GroupedBacklog {
  epicId: string;
  taskId: string;
  items: BacklogItem[];
}

const COLORS = {
  RESET: '\x1b[0m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  RED: '\x1b[31m',
  BLUE: '\x1b[34m',
  GRAY: '\x1b[90m',
  BOLD: '\x1b[1m',
  DIM: '\x1b[2m',
};

const SEVERITY_ICON: Record<string, string> = {
  high: `${COLORS.RED}●${COLORS.RESET}`,
  medium: `${COLORS.YELLOW}⚠${COLORS.RESET}`,
  low: `${COLORS.GRAY}○${COLORS.RESET}`,
};

export async function backlogCommand(options: BacklogCommandOptions = {}): Promise<void> {
  const projectDir = resolve(options.dir || process.cwd());

  // Find all backlogs.jsonl files (playbook-aware)
  const epicsDir = getEpicsDir(projectDir);
  const pattern = `${epicsDir}/**/after/backlogs.jsonl`;
  const files = await glob(pattern, { absolute: true });

  if (files.length === 0) {
    console.log('\nNo backlog items found.\n');
    return;
  }

  // Parse all JSONL files into grouped backlogs
  const groups: GroupedBacklog[] = [];
  for (const file of files.sort()) {
    const relPath = relative(projectDir, file);
    // Extract epic/task from path: .converge/journal/tasks/{epic}/{task}/... or
    // .converge/journal/{playbook}/tasks/{epic}/{task}/...
    const parts = relPath.split('/');
    // Find first 'tasks' after 'journal' — that's the epics root
    const journalIdx = parts.indexOf('journal');
    if (journalIdx === -1) continue;
    let tasksRootIdx = -1;
    for (let i = journalIdx + 1; i < parts.length; i++) {
      if (parts[i] === 'tasks') { tasksRootIdx = i; break; }
    }
    if (tasksRootIdx === -1 || tasksRootIdx + 1 >= parts.length) continue;

    const epicId = parts[tasksRootIdx + 1];
    // Find the nested 'tasks' segment for the task ID
    let taskId = epicId; // fallback
    for (let i = tasksRootIdx + 2; i < parts.length; i++) {
      if (parts[i] === 'tasks' && i + 1 < parts.length) {
        taskId = parts[i + 1]; break;
      }
    }

    // Apply epic filter
    if (options.epic && epicId !== options.epic) continue;

    const content = await readFile(file, 'utf8');
    const items: BacklogItem[] = content
      .split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => {
        try { return JSON.parse(line) as BacklogItem; }
        catch { return null; }
      })
      .filter((item): item is BacklogItem => item !== null);

    // Apply severity filter
    const severityOrder = ['low', 'medium', 'high'];
    const minSeverity = options.severity && severityOrder.includes(options.severity)
      ? severityOrder.indexOf(options.severity)
      : 0;
    const filtered = items.filter(item =>
      severityOrder.indexOf(item.severity) >= minSeverity
    );

    if (filtered.length > 0) {
      groups.push({ epicId, taskId, items: filtered });
    }
  }

  const totalItems = groups.reduce((sum, g) => sum + g.items.length, 0);

  if (totalItems === 0) {
    console.log('\nNo backlog items found.\n');
    return;
  }

  // JSON output
  if (options.json) {
    for (const group of groups) {
      for (const item of group.items) {
        console.log(JSON.stringify(item));
      }
    }
    return;
  }

  // Pretty output
  console.log(`\n${COLORS.BOLD}Backlog${COLORS.RESET} — ${totalItems} item(s) across ${groups.length} task(s)`);
  console.log('═'.repeat(50));

  for (const group of groups) {
    console.log(`\n  ${COLORS.BOLD}${group.epicId} / ${group.taskId}${COLORS.RESET} (${group.items.length} item${group.items.length !== 1 ? 's' : ''})`);

    // Group by backlogId within task
    const byCategory = new Map<string, BacklogItem[]>();
    for (const item of group.items) {
      const existing = byCategory.get(item.backlogId) ?? [];
      existing.push(item);
      byCategory.set(item.backlogId, existing);
    }

    for (const [categoryId, items] of byCategory) {
      for (const item of items) {
        const icon = SEVERITY_ICON[item.severity] ?? SEVERITY_ICON.medium;
        const location = item.file
          ? `${COLORS.BLUE}${item.file}${item.line ? `:${item.line}` : ''}${COLORS.RESET}`
          : '';
        const preview = item.raw.length > 60 ? item.raw.slice(0, 57) + '...' : item.raw;
        console.log(`    ${icon}  ${COLORS.DIM}${categoryId.padEnd(18)}${COLORS.RESET} ${location}  ${COLORS.GRAY}${location ? preview.replace(item.file + (item.line ? `:${item.line}:` : ''), '').trim() : preview}${COLORS.RESET}`);
      }
    }
  }

  // Summary
  const highCount = groups.reduce((s, g) => s + g.items.filter(i => i.severity === 'high').length, 0);
  const mediumCount = groups.reduce((s, g) => s + g.items.filter(i => i.severity === 'medium').length, 0);
  const lowCount = groups.reduce((s, g) => s + g.items.filter(i => i.severity === 'low').length, 0);

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  ${totalItems} items: ${highCount} high, ${mediumCount} medium, ${lowCount} low\n`);
}
