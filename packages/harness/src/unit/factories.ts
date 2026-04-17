/**
 * Factory methods — fromPath() with automatic format detection.
 *
 * Path-First Architecture:
 * - Everything starts with a path (directory or TASK.md)
 * - Format: TASK.md only
 * - Task ID is always derived from directory name
 * - journalTaskId preserves full hierarchy for WBS subtasks
 * - No redundant information required from user
 */

import { existsSync, statSync } from 'node:fs';
import { cp, mkdir } from 'node:fs/promises';
import * as path from 'node:path';
import type { TaskDefinition } from '../config/task-definition.ts';
import type { Unit } from './unit.ts';
import { extractLeafTaskId, extractJournalTaskId } from './path-utils.ts';

/* ------------------------------------------------------------------ */
/*  Mtime-based parse cache for TASK.md / EPIC.md                      */
/* ------------------------------------------------------------------ */

const _taskDefCache = new Map<string, { mtimeMs: number; taskDef: TaskDefinition }>();

/**
 * Unified factory: Load unit from path (directory or TASK.md).
 *
 * Path-first mental model:
 * - User provides path (source of truth)
 * - Framework loads TASK.md
 * - Leaf task ID derived from directory name (never from file content)
 * - Full hierarchical journalTaskId extracted from path structure (e.g., "parent/child")
 *
 * Examples:
 *   fromPath('.harness/epics/03-app/002-pages')
 *   fromPath('.harness/epics/03-app/002-pages/TASK.md')
 *
 * Both are equivalent - framework resolves to TASK.md.
 *
 * WBS subtask example:
 *   fromPath('.harness/epics/03-app/002-pages/tasks/002-001-home/TASK.md')
 *   → taskId: "002-001-home" (leaf)
 *   → journalTaskId: "002-pages/002-001-home" (hierarchical)
 */
export async function fromPath(taskPath: string, parent?: Unit): Promise<Unit> {
  // Normalize path: convert file path to directory path
  let taskDir: string;

  if (existsSync(taskPath)) {
    const stats = statSync(taskPath);
    if (stats.isDirectory()) {
      taskDir = taskPath;
    } else if (stats.isFile()) {
      taskDir = path.dirname(taskPath);
    } else {
      throw new Error(`Invalid path (not file or directory): ${taskPath}`);
    }
  } else {
    throw new Error(`Path does not exist: ${taskPath}`);
  }

  // Derive leaf task ID from directory name (immediate parent directory)
  const taskId = extractLeafTaskId(taskDir);

  // Extract full hierarchical journal task ID from path structure
  // This preserves parent context for WBS subtasks (e.g., "parent/child")
  const journalTaskId = extractJournalTaskId(taskDir);

  // Detect format: only TASK.md is supported
  const taskMdPath = path.join(taskDir, 'TASK.md');

  let taskDef: TaskDefinition;

  const epicMdPath = path.join(taskDir, 'EPIC.md');

  if (existsSync(taskMdPath)) {
    taskDef = await loadFromTaskMdCached(taskMdPath, journalTaskId, taskDir);
  } else if (existsSync(epicMdPath)) {
    taskDef = await loadFromTaskMdCached(epicMdPath, journalTaskId, taskDir);
  } else {
    throw new Error(
      `No TASK.md or EPIC.md found in ${taskDir}\n` +
      `Expected:\n` +
      `  - ${taskMdPath}\n` +
      `  - ${epicMdPath}`
    );
  }

  // Dynamic import to avoid circular dependency at module level
  const { Unit: UnitClass } = await import('./unit.ts');
  return new UnitClass({
    parent: parent || null,
    path: taskDir,  // Store directory path, not file path
    taskDef,
    config: {
      maxIterations: (taskDef.vars?.maxIterations as number) || 100,
    },
  });
}

/**
 * Mtime-cached wrapper around loadFromTaskMd.
 * Returns cached TaskDefinition if file hasn't changed since last parse.
 */
async function loadFromTaskMdCached(taskMdPath: string, taskId: string, taskDir: string): Promise<TaskDefinition> {
  const mtimeMs = statSync(taskMdPath).mtimeMs;
  const cached = _taskDefCache.get(taskMdPath);

  if (cached && cached.mtimeMs === mtimeMs) {
    return cached.taskDef;
  }

  const taskDef = await loadFromTaskMd(taskMdPath, taskId, taskDir);
  _taskDefCache.set(taskMdPath, { mtimeMs, taskDef });
  return taskDef;
}

/**
 * Load TaskDefinition from TASK.md file.
 * Parses YAML frontmatter, markdown body (prompt), and maps all fields
 * including WBS script configuration.
 * Task ID is ALWAYS derived from directory name.
 */
async function loadFromTaskMd(taskMdPath: string, taskId: string, taskDir: string): Promise<TaskDefinition> {
  const { parseTaskMd, mapTaskMdToTaskDefinition } = await import('../config/task-md-definition.ts');

  const result = await parseTaskMd(taskMdPath);
  if (!result) {
    throw new Error(
      `Failed to parse TASK.md: ${taskMdPath}\n` +
      `TASK.md must contain valid YAML frontmatter or markdown content.`
    );
  }

  return mapTaskMdToTaskDefinition(result.def, result.body, taskId, taskDir);
}

/**
 * Copy task materials (files and folders) to the attempt directory.
 *
 * Materials are declared in TASK.md frontmatter:
 * ```yaml
 * materials:
 *   - workflows/extract-tokens.md
 *   - references/
 *   - examples/sample.ts
 * ```
 *
 * @param taskDir - Absolute path to task definition directory
 * @param attemptDir - Absolute path to attempt directory (e.g., .harness/journal/.../attempts/wip)
 * @param materials - Array of file/folder paths relative to taskDir
 */
export async function copyTaskMaterials(
  taskDir: string,
  attemptDir: string,
  materials: string[],
): Promise<void> {
  if (!materials || materials.length === 0) {
    return;
  }

  const materialsDir = path.join(attemptDir, 'materials');
  await mkdir(materialsDir, { recursive: true });

  for (const materialPath of materials) {
    const sourcePath = path.join(taskDir, materialPath);

    if (!existsSync(sourcePath)) {
      console.warn(`   ⚠️  Material not found: ${materialPath} (skipping)`);
      continue;
    }

    const stats = statSync(sourcePath);
    const destPath = path.join(materialsDir, materialPath);

    // Ensure parent directory exists
    await mkdir(path.dirname(destPath), { recursive: true });

    if (stats.isDirectory()) {
      await cp(sourcePath, destPath, { recursive: true });
      console.log(`   📁 Copied material folder: ${materialPath}`);
    } else {
      await cp(sourcePath, destPath);
      console.log(`   📄 Copied material file: ${materialPath}`);
    }
  }

  console.log(`   ✅ Copied ${materials.length} material(s) to attempt directory`);
}
