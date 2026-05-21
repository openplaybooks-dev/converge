/**
 * RFC 0031: Unified tasks.jsonl format
 *
 * Row 1: playbook header (kind: "playbook")
 * Rows 2..N: task rows (kind: "task")
 *
 * Static tasks reference tasks/<id>/ via taskRef.kind = "static"
 * Spawned tasks reference templates/<name>/ via taskRef.kind = "template"
 */

import {
  existsSync,
  readFileSync,
  statSync,
  mkdirSync,
} from "node:fs";
import { dirname } from "node:path";
import type { PlaybookInput, PlaybookGoal } from "../playbook/types.ts";
import type { PlaybookCheckEntry } from "../playbook/types.ts";
import type { HookDefinition } from "../../hooks/hook-definition.ts";
import { atomicWriteFileSync } from "../../checkpoint/atomic-write.ts";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface RuntimePlaybookHeader {
  kind: "playbook";
  schemaVersion: number;
  name: string;
  description?: string;
  seed_api_version?: number;
  key?: string;
  inputs?: Record<string, PlaybookInput>;
  variables?: Record<string, string>;
  run?: {
    maxIterations?: number;
    maxTaskAttempts?: number;
    resume?: boolean;
    workers?: number;
  };
  skills?: Record<string, string>;
  checks?: PlaybookCheckEntry[];
  goals?: PlaybookGoal[];
  hooks?: HookDefinition[];
  createdAt: string;
  updatedAt: string;
}

export type TaskRef =
  | { kind: "static"; dir: string }
  | { kind: "template"; name: string };

export type TaskRuntimeStatus =
  | "todo"
  | "doing"
  | "done"
  | "blocked"
  | "dropped";

export interface UnifiedRuntimeTask {
  kind: "task";
  id: string;
  taskRef: TaskRef;
  params?: Record<string, unknown>;
  depends_on?: string[];
  parent?: string;
  title?: string;
  goalId?: string;
  summary?: string;
  status: TaskRuntimeStatus;
  source?: "playbook" | "spawned" | "static";
  playbook?: string;
  outputs?: string[];
  checks?: Array<{ id: string; cmd: string }>;
  fingerprint?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface UnifiedTasksFile {
  header: RuntimePlaybookHeader | null;
  tasks: UnifiedRuntimeTask[];
}

/* ------------------------------------------------------------------ */
/*  Cache                                                              */
/* ------------------------------------------------------------------ */

const UNIFIED_CACHE_MAX = 32;
interface UnifiedCacheEntry {
  mtimeMs: number;
  header: RuntimePlaybookHeader | null;
  tasks: UnifiedRuntimeTask[];
}
const _unifiedCache = new Map<string, UnifiedCacheEntry>();

function cacheUnified(
  filePath: string,
  header: RuntimePlaybookHeader | null,
  tasks: UnifiedRuntimeTask[],
  mtimeMs: number,
): void {
  if (_unifiedCache.has(filePath)) _unifiedCache.delete(filePath);
  _unifiedCache.set(filePath, { mtimeMs, header, tasks });
  while (_unifiedCache.size > UNIFIED_CACHE_MAX) {
    const oldest = _unifiedCache.keys().next().value;
    if (oldest === undefined) break;
    _unifiedCache.delete(oldest);
  }
}

/* ------------------------------------------------------------------ */
/*  Read                                                               */
/* ------------------------------------------------------------------ */

function parseJsonl<T>(filePath: string): T[] {
  if (!existsSync(filePath)) return [];
  const lines = readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const out: T[] = [];
  for (const line of lines) {
    try {
      out.push(JSON.parse(line) as T);
    } catch {
      // Ignore corrupted line to keep replay resilient.
    }
  }
  return out;
}

export function readUnifiedTasksFile(filePath: string): UnifiedTasksFile {
  if (!existsSync(filePath)) {
    return { header: null, tasks: [] };
  }

  let mtimeMs = 0;
  try {
    mtimeMs = statSync(filePath).mtimeMs;
  } catch {
    // stat failure is rare; fall through to direct read, no caching.
  }

  if (mtimeMs > 0) {
    const cached = _unifiedCache.get(filePath);
    if (cached && cached.mtimeMs === mtimeMs) {
      return {
        header: cached.header,
        tasks: cached.tasks.slice(),
      };
    }
  }

  const rows = parseJsonl<Record<string, unknown>>(filePath);
  let header: RuntimePlaybookHeader | null = null;
  const tasks: UnifiedRuntimeTask[] = [];

  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    if (typeof row.kind !== "string") continue;

    if (row.kind === "playbook") {
      header = row as unknown as RuntimePlaybookHeader;
    } else if (row.kind === "task") {
      if (typeof row.id !== "string") continue;
      if (!row.taskRef || typeof row.taskRef !== "object") continue;
      tasks.push(row as unknown as UnifiedRuntimeTask);
    }
  }

  if (mtimeMs > 0) cacheUnified(filePath, header, tasks, mtimeMs);
  return { header, tasks: tasks.slice() };
}

/* ------------------------------------------------------------------ */
/*  Write                                                              */
/* ------------------------------------------------------------------ */

export function writeUnifiedTasksFile(
  filePath: string,
  header: RuntimePlaybookHeader,
  tasks: UnifiedRuntimeTask[],
): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const lines: string[] = [];
  lines.push(JSON.stringify(header));
  for (const task of tasks) {
    lines.push(JSON.stringify(task));
  }

  atomicWriteFileSync(filePath, lines.join("\n") + "\n");

  // Invalidate cache
  _unifiedCache.delete(filePath);
}
