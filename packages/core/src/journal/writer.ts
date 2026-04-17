/**
 * Journal Writer
 *
 * Writes gaps, logs, and summaries to journal files.
 */

import { mkdir, writeFile, appendFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { stringify as yamlStringify } from 'yaml';
import type { Gap } from '../gap/types.ts';
import type { EventType, JournalEvent, GapSummary, TaskStatus, EpicStatus, ChecklistItem } from './types.ts';
import { getJournalStructure, getJournalFilePath, getBreadcrumbs } from './structure.ts';
import {
  writeProjectSummary,
  writeEpicSummary,
  writeTaskSummary,
  discoverEpicIds,
  discoverTaskIds,
} from './summary-writer.ts';

/* ------------------------------------------------------------------ */
/*  File Naming Utilities                                             */
/* ------------------------------------------------------------------ */

/**
 * Get journal directory path
 */
export function getJournalDir(projectDir: string): string {
  const structure = getJournalStructure(projectDir);
  return structure.root;
}

/**
 * Get file path for a specific journal type (legacy - uses new structure)
 */
export function getJournalPath(
  projectDir: string,
  level: 'project' | 'epic' | 'task',
  scope: string,
  type: 'gaps' | 'events' | 'summary' | 'log' | 'status'
): string {
  // Parse scope to extract epicId and taskId
  let epicId: string | undefined;
  let taskId: string | undefined;

  if (level === 'epic') {
    epicId = scope;
  } else if (level === 'task') {
    const parts = scope.split('.');
    epicId = parts[0];
    taskId = parts.slice(1).join('.');
  }

  return getJournalFilePath(projectDir, level, type, epicId, taskId);
}

/* ------------------------------------------------------------------ */
/*  Gap Writing (YAML)                                                */
/* ------------------------------------------------------------------ */

/**
 * Write gaps to gaps.yml file and generate summary.md
 */
export async function writeGaps(
  projectDir: string,
  level: 'project' | 'epic' | 'task',
  scope: string,
  gaps: Gap[],
  metadata?: {
    projectName?: string;
    epicName?: string;
    taskName?: string;
  }
): Promise<void> {
  const filePath = getJournalPath(projectDir, level, scope, 'gaps');

  // Ensure directory exists
  await mkdir(dirname(filePath), { recursive: true });

  // Create summary
  const summary: GapSummary = {
    total: gaps.length,
    byType: {},
    bySeverity: {},
    updated: new Date().toISOString(),
    gaps,
  };

  // Count by type
  for (const gap of gaps) {
    summary.byType[gap.type] = (summary.byType[gap.type] || 0) + 1;
    if (gap.severity) {
      summary.bySeverity[gap.severity] = (summary.bySeverity[gap.severity] || 0) + 1;
    }
  }

  // Write as YAML
  const yamlContent = yamlStringify(summary, {
    indent: 2,
    lineWidth: 0, // No line wrapping
  });

  await writeFile(filePath, yamlContent, 'utf-8');

  // Generate summary.md with navigation
  await generateSummaryMd(projectDir, level, scope, gaps, metadata);
}

/**
 * Generate summary.md file with navigation and context
 */
async function generateSummaryMd(
  projectDir: string,
  level: 'project' | 'epic' | 'task',
  scope: string,
  gaps: Gap[],
  metadata?: {
    projectName?: string;
    epicName?: string;
    taskName?: string;
  }
): Promise<void> {
  const projectName = metadata?.projectName || 'Project';

  try {
    if (level === 'project') {
      const epicIds = await discoverEpicIds(projectDir);
      await writeProjectSummary(projectDir, projectName, gaps, epicIds);
    } else if (level === 'epic') {
      const epicId = scope;
      const epicName = metadata?.epicName || epicId;
      const taskIds = await discoverTaskIds(projectDir, epicId);
      await writeEpicSummary(projectDir, projectName, epicId, epicName, gaps, taskIds);
    } else if (level === 'task') {
      const parts = scope.split('.');
      const epicId = parts[0];
      const taskId = parts.slice(1).join('.');
      const epicName = metadata?.epicName || epicId;
      const taskName = metadata?.taskName || taskId;
      await writeTaskSummary(projectDir, projectName, epicId, epicName, taskId, taskName, gaps);
    }
  } catch (error) {
    // Silently fail if summary generation fails - gaps.yml is still written
    console.warn(`Failed to generate summary.md: ${error}`);
  }
}

/* ------------------------------------------------------------------ */
/*  Event Logging (JSONL)                                             */
/* ------------------------------------------------------------------ */

/**
 * Append event to events.jsonl file
 */
export async function appendEvent(
  projectDir: string,
  level: 'project' | 'epic' | 'task',
  scope: string,
  eventType: EventType,
  message?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const filePath = getJournalPath(projectDir, level, scope, 'events');

  // Ensure directory exists
  await mkdir(dirname(filePath), { recursive: true });

  const event: JournalEvent = {
    timestamp: new Date().toISOString(),
    eventType,
    level,
    scope,
    message,
    metadata,
  };

  // Write as JSONL (one JSON object per line)
  const line = JSON.stringify(event) + '\n';
  await appendFile(filePath, line, 'utf-8');
}

/* ------------------------------------------------------------------ */
/*  Human-Readable Log (Markdown)                                     */
/* ------------------------------------------------------------------ */

/**
 * Append human-readable log entry to log.log file
 */
export async function appendLog(
  projectDir: string,
  level: 'project' | 'epic' | 'task',
  scope: string,
  message: string
): Promise<void> {
  const filePath = getJournalPath(projectDir, level, scope, 'log');

  // Ensure directory exists
  await mkdir(dirname(filePath), { recursive: true });

  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;

  await appendFile(filePath, line, 'utf-8');
}

/* ------------------------------------------------------------------ */
/*  Summary Writing (YAML)                                            */
/* ------------------------------------------------------------------ */

/**
 * Write summary.yml file with metadata
 */
export async function writeSummary(
  projectDir: string,
  level: 'project' | 'epic' | 'task',
  scope: string,
  data: Record<string, unknown>
): Promise<void> {
  const filePath = getJournalPath(projectDir, level, scope, 'summary');

  // Ensure directory exists
  await mkdir(dirname(filePath), { recursive: true });

  const yamlContent = yamlStringify(data, {
    indent: 2,
    lineWidth: 0,
  });

  await writeFile(filePath, yamlContent, 'utf-8');
}

/* ------------------------------------------------------------------ */
/*  Convenience Functions                                             */
/* ------------------------------------------------------------------ */

/**
 * Log a task event (writes to both JSONL and human-readable log)
 */
export async function logTaskEvent(
  projectDir: string,
  epicId: string,
  taskId: string,
  eventType: EventType,
  message: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const scope = `${epicId}.${taskId}`;

  // Write to JSONL
  await appendEvent(projectDir, 'task', scope, eventType, message, metadata);

  // Write to human-readable log
  await appendLog(projectDir, 'task', scope, `[${eventType}] ${message}`);
}

/**
 * Log an epic event
 */
export async function logEpicEvent(
  projectDir: string,
  epicId: string,
  eventType: EventType,
  message: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await appendEvent(projectDir, 'epic', epicId, eventType, message, metadata);
  await appendLog(projectDir, 'epic', epicId, `[${eventType}] ${message}`);
}

/**
 * Log a project event
 */
export async function logProjectEvent(
  projectDir: string,
  eventType: EventType,
  message: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await appendEvent(projectDir, 'project', 'project', eventType, message, metadata);
  await appendLog(projectDir, 'project', 'project', `[${eventType}] ${message}`);
}

/* ------------------------------------------------------------------ */
/*  Status Writing                                                     */
/* ------------------------------------------------------------------ */

/**
 * Write (or overwrite) a task's status.json in its journal directory.
 *
 * The file lives at:
 *   .converge/journal/tasks/{epicId}/tasks/{taskId}/status.json
 *
 * This is the canonical machine-readable record of whether a task is
 * pending / running / complete / failed.  It mirrors the epics folder
 * structure so every task in .converge/epics/ has a corresponding status
 * file in .converge/journal/.
 */
/**
 * Write (or overwrite) plan.md for a task in its journal directory.
 *
 * The file lives at:
 *   .converge/journal/tasks/{epicId}/tasks/{taskId}/plan.md
 *
 * Written once by PlanExecutor; injected into the execution prompt by GapFixer.
 */
export async function writeTaskPlan(
  projectDir: string,
  epicId: string,
  taskId: string,
  content: string
): Promise<void> {
  const structure = getJournalStructure(projectDir, epicId, taskId);
  if (!structure.task) throw new Error(`writeTaskPlan: task journal dir not resolved`);
  const filePath = `${structure.task}/plan.md`;
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, content, 'utf-8');
}

export async function writeTaskStatus(
  projectDir: string,
  epicId: string,
  taskId: string,
  status: TaskStatus
): Promise<void> {
  const filePath = getJournalPath(projectDir, 'task', `${epicId}.${taskId}`, 'status');
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(status, null, 2), 'utf-8');
}

/**
 * Write (or overwrite) an epic's status.json in its journal directory.
 *
 * The file lives at:
 *   .converge/journal/tasks/{epicId}/status.json
 */
export async function writeEpicStatus(
  projectDir: string,
  epicId: string,
  status: EpicStatus
): Promise<void> {
  const filePath = getJournalPath(projectDir, 'epic', epicId, 'status');
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(status, null, 2), 'utf-8');
}

/* ------------------------------------------------------------------ */
/*  Todo Writing                                                       */
/* ------------------------------------------------------------------ */

/**
 * Write (or overwrite) a task's todo.md in its journal directory.
 *
 * The file lives at:
 *   .converge/journal/tasks/{epicId}/tasks/{taskId}/todo.md
 *
 * Format uses GitHub-flavored Markdown task lists so editors can render
 * it natively.  The checklist is the canonical "definition of done" for
 * the task — the framework updates it after each execution pass.
 *
 * Example:
 * ```
 * # Todo: 003-generate-all-screens
 * Status: running | Agent: ui-designer
 *
 * ## Outputs
 * - [x] `.converge/epics/.../003-generate-all-screens/001-screen-*.ts`
 *
 * ## Checks
 * - [ ] design-has-tokens — `grep -q "color" .stitch/DESIGN.md`
 *
 * ## Subtasks
 * - [x] 001-screen-dashboard
 * - [ ] 002-screen-bills-list
 * ```
 */
export async function writeTaskTodo(
  projectDir: string,
  epicId: string,
  taskId: string,
  status: TaskStatus
): Promise<void> {
  const filePath = getJournalPath(projectDir, 'task', `${epicId}.${taskId}`, 'summary')
    .replace('summary.md', 'todo.md');
  await mkdir(dirname(filePath), { recursive: true });

  const lines: string[] = [];

  const displayId = taskId.split('/').pop() ?? taskId;
  lines.push(`# Todo: ${displayId}`);
  lines.push('');

  const statusIcon = status.status === 'complete' ? '✅' :
                     status.status === 'running'  ? '🔄' :
                     status.status === 'failed'   ? '❌' : '⏳';
  const meta: string[] = [`Status: ${statusIcon} ${status.status}`];
  if (status.agent) meta.push(`Agent: ${status.agent}`);
  if (status.startedAt) meta.push(`Started: ${status.startedAt}`);
  if (status.completedAt) meta.push(`Completed: ${status.completedAt}`);
  lines.push(meta.join(' | '));
  lines.push('');

  const outputs = status.checklist.filter(i => i.type === 'output');
  const checks  = status.checklist.filter(i => i.type === 'check');
  const subtasks = status.checklist.filter(i => i.type === 'subtask');

  if (outputs.length > 0) {
    lines.push('## Outputs');
    for (const item of outputs) {
      const box = item.done ? '[x]' : '[ ]';
      const detail = item.details ? ` \`${item.details}\`` : '';
      lines.push(`- ${box} ${item.description}${detail}`);
    }
    lines.push('');
  }

  if (checks.length > 0) {
    lines.push('## Checks');
    for (const item of checks) {
      const box = item.done ? '[x]' : '[ ]';
      const cmd = item.details ? ` — \`${item.details}\`` : '';
      lines.push(`- ${box} ${item.description}${cmd}`);
    }
    lines.push('');
  }

  if (subtasks.length > 0) {
    lines.push('## Subtasks');
    for (const item of subtasks) {
      const box = item.done ? '[x]' : '[ ]';
      const detail = item.details ? ` (${item.details})` : '';
      lines.push(`- ${box} ${item.description}${detail}`);
    }
    lines.push('');
  }

  if (status.checklist.length === 0) {
    lines.push('_No checklist items defined._');
    lines.push('');
  }

  const doneCount = status.checklist.filter(i => i.done).length;
  const totalCount = status.checklist.length;
  if (totalCount > 0) {
    lines.push(`---`);
    lines.push(`Progress: ${doneCount}/${totalCount} items complete`);
  }

  await writeFile(filePath, lines.join('\n'), 'utf-8');
}
