/**
 * Summary Writer
 *
 * Writes summary.md files with navigation and context overview.
 */

import { writeFile, mkdir, readdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { getJournalFilePath, getBreadcrumbs, getEpicTasksDir, getEpicsDir } from './structure.ts';
import type { Gap } from '../gap/types.ts';

/* ------------------------------------------------------------------ */
/*  Summary Generation                                                */
/* ------------------------------------------------------------------ */

/**
 * Write project summary
 */
export async function writeProjectSummary(
  projectDir: string,
  projectName: string,
  gaps: Gap[],
  epicIds: string[] = []
): Promise<void> {
  const filePath = getJournalFilePath(projectDir, 'project', 'summary');
  await mkdir(dirname(filePath), { recursive: true });

  const breadcrumbs = getBreadcrumbs(projectDir, projectName);

  const content = `# ${projectName}

## Navigation

**Current Location**: Project Root

### Epics
${epicIds.length > 0 ? epicIds.map(id => `- [${id}](../epics/${id}/summary.md)`).join('\n') : '*No epics yet*'}

---

## Status Overview

**Total Gaps**: ${gaps.length}

${gaps.length > 0 ? `
### Gaps by Type
${getGapsByType(gaps)}

### Gaps by Severity
${getGapsBySeverity(gaps)}
` : '*All gaps resolved ✅*'}

---

## Recent Activity

See [events.jsonl](./events.jsonl) for detailed event history.
See [log.log](./log.log) for human-readable logs.

---

## Gap Details

${gaps.length > 0 ? gaps.map(g => formatGap(g)).join('\n\n') : '*No gaps to resolve*'}

---

*Last updated: ${new Date().toISOString()}*
`;

  await writeFile(filePath, content, 'utf-8');
}

/**
 * Write epic summary
 */
export async function writeEpicSummary(
  projectDir: string,
  projectName: string,
  epicId: string,
  epicName: string,
  gaps: Gap[],
  taskIds: string[] = []
): Promise<void> {
  const filePath = getJournalFilePath(projectDir, 'epic', 'summary', epicId);
  await mkdir(dirname(filePath), { recursive: true });

  const breadcrumbs = getBreadcrumbs(projectDir, projectName, epicId, epicName);

  const content = `# ${epicName}

## Navigation

**Breadcrumb**: [${projectName}](../../project/summary.md) > ${epicName}

### Parent
- [← Back to Project](../../project/summary.md)

### Tasks
${taskIds.length > 0 ? taskIds.map(id => `- [${id}](./tasks/${id}/summary.md)`).join('\n') : '*No tasks yet*'}

---

## Status Overview

**Epic ID**: \`${epicId}\`
**Total Gaps**: ${gaps.length}

${gaps.length > 0 ? `
### Gaps by Type
${getGapsByType(gaps)}

### Gaps by Severity
${getGapsBySeverity(gaps)}
` : '*All gaps resolved ✅*'}

---

## Recent Activity

See [events.jsonl](./events.jsonl) for detailed event history.
See [log.log](./log.log) for human-readable logs.

---

## Gap Details

${gaps.length > 0 ? gaps.map(g => formatGap(g)).join('\n\n') : '*No gaps to resolve*'}

---

*Last updated: ${new Date().toISOString()}*
`;

  await writeFile(filePath, content, 'utf-8');
}

/**
 * Write task summary
 */
export async function writeTaskSummary(
  projectDir: string,
  projectName: string,
  epicId: string,
  epicName: string,
  taskId: string,
  taskName: string,
  gaps: Gap[]
): Promise<void> {
  const filePath = getJournalFilePath(projectDir, 'task', 'summary', epicId, taskId);
  await mkdir(dirname(filePath), { recursive: true });

  const breadcrumbs = getBreadcrumbs(projectDir, projectName, epicId, epicName, taskId, taskName);

  const content = `# ${taskName}

## Navigation

**Breadcrumb**: [${projectName}](../../../../project/summary.md) > [${epicName}](../../summary.md) > ${taskName}

### Parent
- [← Back to Epic](../../summary.md)
- [← Back to Project](../../../../project/summary.md)

---

## Status Overview

**Task ID**: \`${taskId}\`
**Epic**: \`${epicId}\`
**Total Gaps**: ${gaps.length}

${gaps.length > 0 ? `
### Gaps by Type
${getGapsByType(gaps)}

### Gaps by Severity
${getGapsBySeverity(gaps)}
` : '*All gaps resolved ✅*'}

---

## Recent Activity

See [events.jsonl](./events.jsonl) for detailed event history.
See [log.log](./log.log) for human-readable logs.

---

## Gap Details

${gaps.length > 0 ? gaps.map(g => formatGap(g)).join('\n\n') : '*No gaps to resolve*'}

---

*Last updated: ${new Date().toISOString()}*
`;

  await writeFile(filePath, content, 'utf-8');
}

/* ------------------------------------------------------------------ */
/*  Formatting Helpers                                                */
/* ------------------------------------------------------------------ */

function getGapsByType(gaps: Gap[]): string {
  const byType: Record<string, number> = {};
  for (const gap of gaps) {
    byType[gap.type] = (byType[gap.type] || 0) + 1;
  }

  return Object.entries(byType)
    .map(([type, count]) => `- **${type}**: ${count}`)
    .join('\n');
}

function getGapsBySeverity(gaps: Gap[]): string {
  const bySeverity: Record<string, number> = {};
  for (const gap of gaps) {
    if (gap.severity) {
      bySeverity[gap.severity] = (bySeverity[gap.severity] || 0) + 1;
    }
  }

  if (Object.keys(bySeverity).length === 0) {
    return '*No severity specified*';
  }

  return Object.entries(bySeverity)
    .map(([severity, count]) => `- **${severity}**: ${count}`)
    .join('\n');
}

function formatGap(gap: Gap): string {
  const severity = gap.severity ? ` [${gap.severity.toUpperCase()}]` : '';
  const resolved = gap.resolved ? ' ✅' : '';

  return `### ${gap.description}${severity}${resolved}

- **ID**: \`${gap.id}\`
- **Type**: ${gap.type}
- **Detected**: ${new Date(gap.detected).toLocaleString()}
- **Checks**: ${gap.checks.join(', ')}
${gap.suggestedFix ? `- **Suggested Fix**: ${gap.suggestedFix}` : ''}
${gap.resolvedAt ? `- **Resolved**: ${new Date(gap.resolvedAt).toLocaleString()}` : ''}`;
}

/* ------------------------------------------------------------------ */
/*  Discovery Helpers                                                 */
/* ------------------------------------------------------------------ */

/**
 * Get list of all epic IDs in journal
 */
export async function discoverEpicIds(projectDir: string): Promise<string[]> {
  try {
    const epicsDir = getEpicsDir(projectDir);
    const entries = await readdir(epicsDir, { withFileTypes: true });
    return entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);
  } catch {
    return [];
  }
}

/**
 * Get list of all task IDs for an epic
 */
export async function discoverTaskIds(projectDir: string, epicId: string): Promise<string[]> {
  try {
    const tasksDir = getEpicTasksDir(projectDir, epicId);
    const entries = await readdir(tasksDir, { withFileTypes: true });
    return entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);
  } catch {
    return [];
  }
}
