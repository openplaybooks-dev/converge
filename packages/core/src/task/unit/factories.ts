/**
 * Factory methods — fromPath() with automatic format detection.
 *
 * Path-First Architecture:
 * - Everything starts with a path (directory or TASK.md)
 * - Format: TASK.md only
 * - Task ID is always derived from directory name
 * - journalTaskId preserves full hierarchy for Seed subtasks
 * - No redundant information required from user
 */

import { existsSync, statSync } from "node:fs";
import { cp, mkdir } from "node:fs/promises";
import * as path from "node:path";
import type { TaskDefinition } from "../../config/task-definition.ts";
import type { Unit } from "./unit.ts";
import { extractLeafTaskId, extractJournalTaskId } from "./path-utils.ts";

/* ------------------------------------------------------------------ */
/*  Mtime-based parse cache for TASK.md                                */
/* ------------------------------------------------------------------ */

/**
 * Max entries kept in the parse cache. Capped to prevent unbounded
 * memory growth in long-running processes (studio, planner daemon)
 * that load many task definitions over time. Eviction policy is LRU:
 * accessing an entry bumps it to the most-recently-used position by
 * delete+set; on overflow, the oldest entry (Map's first key) is
 * removed.
 *
 * Override via `CONVERGE_TASKDEF_CACHE_MAX` for unusual workloads.
 */
const TASKDEF_CACHE_MAX_DEFAULT = 1000;
function taskDefCacheMax(): number {
  const env = process.env.CONVERGE_TASKDEF_CACHE_MAX;
  if (!env) return TASKDEF_CACHE_MAX_DEFAULT;
  const n = Number(env);
  if (!Number.isFinite(n) || n < 1) return TASKDEF_CACHE_MAX_DEFAULT;
  return n;
}

const _taskDefCache = new Map<
  string,
  { mtimeMs: number; taskDef: TaskDefinition }
>();

function cachePut(
  key: string,
  value: { mtimeMs: number; taskDef: TaskDefinition },
): void {
  // Touch on write: delete-then-set bumps the entry to the most-
  // recently-used end of the Map. On overflow, evict the oldest
  // (Map's first key).
  if (_taskDefCache.has(key)) _taskDefCache.delete(key);
  _taskDefCache.set(key, value);
  const max = taskDefCacheMax();
  while (_taskDefCache.size > max) {
    const oldest = _taskDefCache.keys().next().value;
    if (oldest === undefined) break;
    _taskDefCache.delete(oldest);
  }
}

function cacheGet(
  key: string,
): { mtimeMs: number; taskDef: TaskDefinition } | undefined {
  const v = _taskDefCache.get(key);
  if (v) {
    // Touch on read so frequently-accessed entries survive.
    _taskDefCache.delete(key);
    _taskDefCache.set(key, v);
  }
  return v;
}

/** Internal accessor — exposed for tests that need to verify cache state. */
export function _taskDefCacheSize(): number {
  return _taskDefCache.size;
}

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
 *   fromPath('.converge/epics/03-app/002-pages')
 *   fromPath('.converge/epics/03-app/002-pages/TASK.md')
 *
 * Both are equivalent - framework resolves to TASK.md.
 *
 * Seed subtask example:
 *   fromPath('.converge/epics/03-app/002-pages/tasks/002-001-home/TASK.md')
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
  // This preserves parent context for Seed subtasks (e.g., "parent/child")
  const journalTaskId = extractJournalTaskId(taskDir);

  // Detect format: only TASK.md is supported
  const taskMdPath = path.join(taskDir, "TASK.md");

  let taskDef: TaskDefinition;

  if (existsSync(taskMdPath)) {
    taskDef = await loadFromTaskMdCached(taskMdPath, journalTaskId, taskDir);
  } else {
    throw new Error(
      `No TASK.md found in ${taskDir}\n` + `Expected: ${taskMdPath}`,
    );
  }

  // Dynamic import to avoid circular dependency at module level
  const { Unit: UnitClass } = await import("./unit.ts");
  return new UnitClass({
    parent: parent || null,
    path: taskDir, // Store directory path, not file path
    taskDef,
    config: {
      maxIterations: 1_000_000,
    },
  });
}

/**
 * Mtime-cached wrapper around loadFromTaskMd.
 * Returns cached TaskDefinition if file hasn't changed since last parse.
 */
async function loadFromTaskMdCached(
  taskMdPath: string,
  taskId: string,
  taskDir: string,
): Promise<TaskDefinition> {
  const mtimeMs = statSync(taskMdPath).mtimeMs;
  const cached = cacheGet(taskMdPath);

  if (cached && cached.mtimeMs === mtimeMs) {
    return cached.taskDef;
  }

  const taskDef = await loadFromTaskMd(taskMdPath, taskId, taskDir);
  cachePut(taskMdPath, { mtimeMs, taskDef });
  return taskDef;
}

/**
 * Load TaskDefinition from TASK.md file.
 * Parses YAML frontmatter, markdown body (prompt), and maps all fields
 * including Seed script configuration.
 * Task ID is ALWAYS derived from directory name.
 */
async function loadFromTaskMd(
  taskMdPath: string,
  taskId: string,
  taskDir: string,
): Promise<TaskDefinition> {
  const { parseTaskMd, mapTaskMdToTaskDefinition } =
    await import("../../config/task-md-definition.ts");

  const result = await parseTaskMd(taskMdPath);
  if (!result) {
    throw new Error(
      `Failed to parse TASK.md: ${taskMdPath}\n` +
        `TASK.md must contain valid YAML frontmatter or markdown content.`,
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
 * @param attemptDir - Absolute path to attempt directory (e.g., .converge/journal/.../attempts/wip)
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

  const materialsDir = path.join(attemptDir, "materials");
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

  console.log(
    `   ✅ Copied ${materials.length} material(s) to attempt directory`,
  );
}
