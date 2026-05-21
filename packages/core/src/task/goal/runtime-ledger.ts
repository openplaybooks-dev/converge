import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import type { PlaybookGoal } from "../playbook/types.ts";
import { atomicWriteFileSync } from "../../checkpoint/atomic-write.ts";
import { withFileLock } from "./file-lock.ts";
import { assertSafeId } from "./safe-id.ts";

export type GoalRuntimeStatus =
  | "pending"
  | "active"
  | "done"
  | "blocked"
  | "stalled"
  | "rejected";

export type TaskRuntimeStatus =
  | "todo"
  | "doing"
  | "done"
  | "blocked"
  | "dropped";

export interface RuntimeGoal extends PlaybookGoal {
  status_runtime: GoalRuntimeStatus;
  updatedAt: string;
  createdAt: string;
}

export interface RuntimeTask {
  id: string;
  /** Path to the TASK.md source file (not journal). */
  taskPath: string;
  /** RFC 0031: Unified task reference (static dir or template name). */
  taskRef?: TaskRef;
  /** RFC 0031: Template params for spawned tasks. */
  params?: Record<string, unknown>;
  parent?: string;
  depends_on?: string[];
  title?: string;
  goalId: string;
  summary: string;
  status: TaskRuntimeStatus;
  source?: "playbook" | "spawned" | "static";
  playbook?: string;
  outputs?: string[];
  checks?: Array<{ id: string; cmd: string }>;
  /**
   * sha256 of TASK.md + checks + inputs, recorded when the task passes.
   * RFC 0024: lets a peer machine that lacks .converge/journal/ rehydrate
   * prior-pass state and skip already-completed tasks.
   */
  fingerprint?: string;
  /** ISO timestamp of the most recent pass transition. */
  completedAt?: string;
  /** RFC 0033: Execution metrics (written on each status transition). */
  durationMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheCreationTokens?: number;
  costUsd?: number;
  model?: string;
  numTurns?: number;
  totalToolCalls?: number;
  attemptCount?: number;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

/** RFC 0031: Unified task reference. */
export type TaskRef =
  | { kind: "static"; dir: string }
  | { kind: "template"; name: string };

type GoalEvent =
  | {
      event: "goal.upsert";
      goal: PlaybookGoal;
      timestamp: string;
      sourceTaskId?: string;
    }
  | {
      event: "goal.status";
      goalId: string;
      status: GoalRuntimeStatus;
      timestamp: string;
      sourceTaskId?: string;
      metadata?: Record<string, unknown>;
    };

export interface RuntimeLedgerState {
  goals: RuntimeGoal[];
  tasks: RuntimeTask[];
}

function nowIso(): string {
  return new Date().toISOString();
}

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

function appendJsonl(filePath: string, payload: unknown): void {
  const line = JSON.stringify(payload);
  appendFileSync(filePath, `${line}\n`, "utf8");
}

/**
 * mtime-keyed cache for the parsed tasks.jsonl contents. Eliminates
 * repeated parsing on hot read paths (the navigator polls
 * readRuntimeLedgerState frequently — pre-cache, that's an O(N) parse
 * of the entire JSONL on every poll, even when nothing changed).
 *
 * Invalidation is mtime-based: when the file's mtime differs from the
 * cached entry's mtime, we re-parse. Atomic-rename writes (see
 * writeTaskRows → atomicWriteFileSync) update mtime on every rewrite,
 * so the cache is correctly invalidated even across processes.
 *
 * Bounded at MAX_CACHE_ENTRIES so a long-running process doesn't pin
 * memory if it visits many ledger files.
 */
const TASK_ROWS_CACHE_MAX = 32;
interface TaskRowsCacheEntry {
  mtimeMs: number;
  rows: RuntimeTask[];
  /** id set kept in lockstep with `rows` for O(1) existence checks
   *  during the spawn-storm fast path. */
  idSet: Set<string>;
}
const _taskRowsCache = new Map<string, TaskRowsCacheEntry>();

function cacheRows(filePath: string, rows: RuntimeTask[], mtimeMs: number): void {
  if (_taskRowsCache.has(filePath)) _taskRowsCache.delete(filePath);
  const idSet = new Set<string>();
  for (const r of rows) idSet.add(r.id);
  _taskRowsCache.set(filePath, { mtimeMs, rows, idSet });
  while (_taskRowsCache.size > TASK_ROWS_CACHE_MAX) {
    const oldest = _taskRowsCache.keys().next().value;
    if (oldest === undefined) break;
    _taskRowsCache.delete(oldest);
  }
}

/**
 * Incremental cache update after an append. The caller has just
 * appended `newRow` to `filePath` and the file's mtime is now
 * `newMtimeMs`. Rather than invalidating the cache (which would force
 * a re-parse on the next read), we push the new row in place and
 * advance the recorded mtime. This is the key optimisation that keeps
 * spawn-storm throughput at O(1) per upsert.
 *
 * Safe iff the caller holds the file lock — which appendTaskUpsert
 * does — so no concurrent writer can have appended different rows
 * between our append and this update.
 */
function appendToCache(
  filePath: string,
  newRow: RuntimeTask,
  newMtimeMs: number,
): void {
  const entry = _taskRowsCache.get(filePath);
  if (!entry) return;
  entry.rows.push(newRow);
  entry.idSet.add(newRow.id);
  entry.mtimeMs = newMtimeMs;
}

/**
 * tasks.jsonl is a flat task inventory: one line per task record (not an
 * event log). Lines from the legacy event-log format (which carried a
 * top-level `event` field instead of a `RuntimeTask` shape) are silently
 * skipped on read so existing files migrate cleanly on first mutation.
 */
function readTaskRows(filePath: string): RuntimeTask[] {
  if (!existsSync(filePath)) return [];
  let mtimeMs = 0;
  try {
    mtimeMs = statSync(filePath).mtimeMs;
  } catch {
    // stat failure is rare; fall through to direct read, no caching.
  }
  if (mtimeMs > 0) {
    const cached = _taskRowsCache.get(filePath);
    if (cached && cached.mtimeMs === mtimeMs) {
      // Return a defensive shallow copy so callers can sort/mutate
      // without poisoning the cache.
      return cached.rows.slice();
    }
  }
  const rows = parseJsonl<Record<string, unknown>>(filePath).flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    // Accept both new format (id only) and legacy format (id + taskPath)
    if (typeof row.id !== "string") return [];
    return [row as unknown as RuntimeTask];
  });
  if (mtimeMs > 0) cacheRows(filePath, rows, mtimeMs);
  return rows.slice();
}

/** Derive journal path from task id and playbook — no hardcoded paths in inventory. */
export function taskJournalPath(taskId: string, playbookName: string): string {
  return `.converge/journal/${playbookName}/tasks/${taskId}`;
}

/** Derive inventory TASK.md path from task id and playbook. */
export function taskInventoryPath(taskId: string, playbookName: string): string {
  return `.converge/inventory/${playbookName}/spawned/${taskId}`;
}

/** Topological sort: parents before children, then by id. */
function topoSortTasks(rows: RuntimeTask[]): RuntimeTask[] {
  const byId = new Map<string, RuntimeTask>();
  for (const r of rows) byId.set(r.id, r);
  const depth = new Map<string, number>();
  function getDepth(id: string): number {
    if (depth.has(id)) return depth.get(id)!;
    const task = byId.get(id);
    if (!task || !task.parent) { depth.set(id, 0); return 0; }
    const d = 1 + getDepth(task.parent);
    depth.set(id, d);
    return d;
  }
  for (const r of rows) getDepth(r.id);
  return [...rows].sort((a, b) => {
    const da = depth.get(a.id) ?? 0;
    const db = depth.get(b.id) ?? 0;
    if (da !== db) return da - db;
    return a.id.localeCompare(b.id);
  });
}

function writeTaskRows(filePath: string, rows: RuntimeTask[]): void {
  ensureFileDir(filePath);
  const sorted = topoSortTasks(rows);
  const body = sorted.map((row) => JSON.stringify(row)).join("\n");
  // Atomic tempfile+rename so a crash mid-write can't corrupt the
  // ledger. Readers always see either the previous full file or the new
  // full file, never a partial one.
  atomicWriteFileSync(filePath, body.length > 0 ? `${body}\n` : "");
}

function appendJsonlAtomic(filePath: string, payload: unknown): void {
  // Goals.jsonl is append-only. POSIX append-mode writes ≤ PIPE_BUF
  // (4 KB) are atomic at the system call level, and our JSON-encoded
  // event lines are well under that. But to prevent interleaving from a
  // concurrent writer on the same line boundary, we hold the file lock
  // around the append. The lock also prevents a reader replaying the
  // log from seeing a partial line if it stat()s mid-write.
  withFileLock(filePath, () => {
    const line = JSON.stringify(payload);
    appendFileSync(filePath, `${line}\n`, "utf8");
  });
}

function ensureFileDir(filePath: string): void {
  const dir = filePath.replace(/[/\\][^/\\]+$/, "");
  if (dir && !existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function mergeGoal(base: PlaybookGoal, patch: PlaybookGoal): PlaybookGoal {
  return {
    ...base,
    ...patch,
    checks: patch.checks.length > 0 ? patch.checks : base.checks,
    depends_on: patch.depends_on ?? base.depends_on,
  };
}

export function runtimeLedgerDir(projectDir: string, playbookName: string): string {
  return join(projectDir, ".converge", "inventory", playbookName);
}

export function runtimeGoalsPath(projectDir: string, playbookName: string): string {
  return join(runtimeLedgerDir(projectDir, playbookName), "goals.jsonl");
}

export function runtimeTasksPath(projectDir: string, playbookName: string): string {
  return join(runtimeLedgerDir(projectDir, playbookName), "tasks.jsonl");
}

/** Compacted snapshot path — materialized goal state at a point in
 *  time. When present, `readRuntimeLedgerState` loads this first and
 *  then replays only goals.jsonl events newer than the snapshot. */
export function runtimeGoalsSnapshotPath(
  projectDir: string,
  playbookName: string,
): string {
  return join(runtimeLedgerDir(projectDir, playbookName), "goals-snapshot.json");
}

interface GoalsSnapshot {
  /** ISO timestamp — events with timestamps ≤ this are already
   *  reflected in `goals`. Only newer events need replay. */
  asOf: string;
  goals: RuntimeGoal[];
}

function readGoalsSnapshot(path: string): GoalsSnapshot | null {
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, "utf-8");
    const parsed = JSON.parse(raw) as GoalsSnapshot;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.asOf !== "string" ||
      !Array.isArray(parsed.goals)
    ) {
      return null;
    }
    return parsed;
  } catch {
    // Corrupt snapshot — fall back to full replay. The next compaction
    // will overwrite it.
    return null;
  }
}

export function ensureRuntimeLedger(
  projectDir: string,
  playbookName: string,
  declaredGoals: PlaybookGoal[] | undefined,
  sourceTaskId?: string,
): void {
  const dir = runtimeLedgerDir(projectDir, playbookName);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const goalsPath = runtimeGoalsPath(projectDir, playbookName);
  if (existsSync(goalsPath)) return;
  const timestamp = nowIso();
  for (const goal of declaredGoals ?? []) {
    appendJsonl(goalsPath, {
      event: "goal.upsert",
      goal,
      timestamp,
      sourceTaskId,
    } satisfies GoalEvent);
    appendJsonl(goalsPath, {
      event: "goal.status",
      goalId: goal.id,
      status: goal.status === "rejected" ? "rejected" : "pending",
      timestamp,
      sourceTaskId,
      metadata: { bootstrap: true },
    } satisfies GoalEvent);
  }
}

export function appendGoalUpsert(
  projectDir: string,
  playbookName: string,
  goal: PlaybookGoal,
  sourceTaskId?: string,
): void {
  appendJsonlAtomic(runtimeGoalsPath(projectDir, playbookName), {
    event: "goal.upsert",
    goal,
    timestamp: nowIso(),
    sourceTaskId,
  } satisfies GoalEvent);
}

export function appendGoalStatus(
  projectDir: string,
  playbookName: string,
  goalId: string,
  status: GoalRuntimeStatus,
  metadata?: Record<string, unknown>,
  sourceTaskId?: string,
): void {
  appendJsonlAtomic(runtimeGoalsPath(projectDir, playbookName), {
    event: "goal.status",
    goalId,
    status,
    timestamp: nowIso(),
    sourceTaskId,
    metadata,
  } satisfies GoalEvent);
}

/**
 * Insert or update a task row in tasks.jsonl. Each id has exactly one line;
 * an upsert with an existing id rewrites that line in place. New rows
 * default to status "todo" and source "backlog" when unspecified. The
 * `sourceTaskId` parameter is accepted for legacy call-site compatibility
 * and ignored (parentTaskPath is the canonical lineage link).
 */
export function appendTaskUpsert(
  projectDir: string,
  playbookName: string,
  task: {
    id: string;
    taskPath?: string;
    taskRef?: TaskRef;
    params?: Record<string, unknown>;
    parent?: string;
    depends_on?: string[];
    title?: string;
    goalId: string;
    summary: string;
    status?: TaskRuntimeStatus;
    source?: "playbook" | "spawned" | "static";
    playbook?: string;
    outputs?: string[];
    checks?: Array<{ id: string; cmd: string }>;
    fingerprint?: string;
    completedAt?: string;
    /** RFC 0033: Execution metrics (written on each status transition). */
    durationMs?: number;
    inputTokens?: number;
    outputTokens?: number;
    cacheReadTokens?: number;
    cacheCreationTokens?: number;
    costUsd?: number;
    model?: string;
    numTurns?: number;
    totalToolCalls?: number;
    attemptCount?: number;
    metadata?: Record<string, unknown>;
  },
  _sourceTaskId?: string,
): void {
  // Defence-in-depth: validate the id at the ledger boundary too.
  // Most callers go through `commands-spawn` which already validates,
  // but TypeScript code reaching here directly (seeds, test fixtures)
  // would otherwise bypass the check. assertSafeId throws on path
  // traversal, shell-injection, and empty/oversized ids.
  assertSafeId(task.id, "task.id");
  if (task.playbook) assertSafeId(task.playbook, "task.playbook");
  if (task.parent) assertSafeId(task.parent, "task.parent");
  if (task.goalId) assertSafeId(task.goalId, "task.goalId");
  const filePath = runtimeTasksPath(projectDir, playbookName);
  // Cross-process lock: tasks.jsonl is read-mutate-written for the
  // UPDATE case. The INSERT case takes a fast append-only path that
  // keeps spawn-storm throughput at O(1) per upsert.
  withFileLock(filePath, () => {
    const rows = readTaskRows(filePath);
    const now = nowIso();
    // Source TASK.md path — playbook or inventory, never journal.
    const srcPath =
      task.taskPath ??
      (task.taskRef
        ? task.taskRef.kind === "static"
          ? join(task.taskRef.dir, "TASK.md")
          : `.converge/journal/${playbookName}/tasks/${task.id}/exec/spawn/${task.id}/EXPANDED.md`
        : `.converge/inventory/${playbookName}/spawned/${task.id}/TASK.md`);
    // O(1) existence check via the cached idSet (populated by
    // readTaskRows above). The linear findIndex below is still needed
    // for the UPDATE path (we need the index), but skipping it for
    // pure INSERTs saves the O(N) scan per spawn-storm call.
    const cached = _taskRowsCache.get(filePath);
    const exists = cached ? cached.idSet.has(task.id) : false;
    const idx = exists ? rows.findIndex((r) => r.id === task.id) : -1;
    if (idx >= 0) {
      // UPDATE path: existing row must be rewritten in place. This
      // is the slow O(N) per call. Common during the run phase
      // (status transitions); rare during spawn fan-out.
      const prev = rows[idx];
      rows[idx] = {
        id: task.id,
        taskPath: srcPath,
        taskRef: task.taskRef ?? (prev as any).taskRef,
        params: task.params ?? (prev as any).params,
        parent: task.parent ?? prev.parent,
        depends_on: task.depends_on ?? prev.depends_on,
        title: task.title ?? prev.title ?? prev.summary,
        goalId: task.goalId,
        summary: task.summary,
        status: task.status ?? prev.status,
        source: task.source ?? prev.source ?? "spawned",
        playbook: task.playbook ?? prev.playbook ?? playbookName,
        outputs: task.outputs ?? prev.outputs,
        checks: task.checks ?? prev.checks,
        fingerprint: task.fingerprint ?? prev.fingerprint,
        completedAt: task.completedAt ?? prev.completedAt,
        durationMs: task.durationMs ?? (prev as any).durationMs,
        inputTokens: task.inputTokens ?? (prev as any).inputTokens,
        outputTokens: task.outputTokens ?? (prev as any).outputTokens,
        cacheReadTokens: task.cacheReadTokens ?? (prev as any).cacheReadTokens,
        cacheCreationTokens: task.cacheCreationTokens ?? (prev as any).cacheCreationTokens,
        costUsd: task.costUsd ?? (prev as any).costUsd,
        model: task.model ?? (prev as any).model,
        numTurns: task.numTurns ?? (prev as any).numTurns,
        totalToolCalls: task.totalToolCalls ?? (prev as any).totalToolCalls,
        attemptCount: task.attemptCount ?? (prev as any).attemptCount,
        metadata: task.metadata ?? prev.metadata,
        createdAt: prev.createdAt ?? now,
        updatedAt: now,
      };
      writeTaskRows(filePath, rows);
    } else {
      // INSERT fast path: just append the new row. tasks.jsonl
      // accepts any line order — `readTaskRows` doesn't care, and
      // `writeTaskRows` re-sorts topologically on the next full
      // rewrite. Spawn-storms (100s of children registered in
      // sequence) now run in O(1) per upsert instead of O(N).
      ensureFileDir(filePath);
      const newRow: RuntimeTask = {
        id: task.id,
        taskPath: srcPath,
        taskRef: task.taskRef,
        params: task.params,
        parent: task.parent,
        depends_on: task.depends_on,
        title: task.title ?? task.summary,
        goalId: task.goalId,
        summary: task.summary,
        status: task.status ?? "todo",
        source: task.source ?? "spawned",
        playbook: task.playbook ?? playbookName,
        outputs: task.outputs,
        checks: task.checks,
        fingerprint: task.fingerprint,
        completedAt: task.completedAt,
        durationMs: task.durationMs,
        inputTokens: task.inputTokens,
        outputTokens: task.outputTokens,
        cacheReadTokens: task.cacheReadTokens,
        cacheCreationTokens: task.cacheCreationTokens,
        costUsd: task.costUsd,
        model: task.model,
        numTurns: task.numTurns,
        totalToolCalls: task.totalToolCalls,
        attemptCount: task.attemptCount,
        metadata: task.metadata,
        createdAt: now,
        updatedAt: now,
      };
      appendFileSync(filePath, `${JSON.stringify(newRow)}\n`, "utf8");
      // Incrementally refresh the cache with the freshly-appended row
      // so the next call's existence check is an O(1) Set lookup
      // (otherwise the mtime-changed-since-cache check would force
      // a re-parse of the whole file on every spawn-storm iteration).
      try {
        const newMtime = statSync(filePath).mtimeMs;
        appendToCache(filePath, newRow, newMtime);
      } catch {
        // stat failure → next read will re-parse; correctness intact,
        // we just lose the perf benefit for this call.
      }
    }
  });
}

/**
 * Update the status (and optionally metadata + metrics) of an existing task row.
 * No-op when the row does not exist — callers must `appendTaskUpsert` first.
 *
 * RFC 0033: accepts execution metrics so status transitions can carry
 * duration, tokens, cost, etc. into the inventory ledger.
 */
export function appendTaskStatus(
  projectDir: string,
  playbookName: string,
  taskId: string,
  status: TaskRuntimeStatus,
  metadata?: Record<string, unknown>,
  _sourceTaskId?: string,
  metrics?: {
    durationMs?: number;
    inputTokens?: number;
    outputTokens?: number;
    cacheReadTokens?: number;
    cacheCreationTokens?: number;
    costUsd?: number;
    model?: string;
    numTurns?: number;
    totalToolCalls?: number;
    attemptCount?: number;
  },
): void {
  const filePath = runtimeTasksPath(projectDir, playbookName);
  if (!existsSync(filePath)) return;
  withFileLock(filePath, () => {
    const rows = readTaskRows(filePath);
    const idx = rows.findIndex((r) => r.id === taskId);
    if (idx < 0) return;
    rows[idx] = {
      ...rows[idx],
      status,
      metadata: metadata ?? rows[idx].metadata,
      ...(metrics ? {
        durationMs: metrics.durationMs ?? (rows[idx] as any).durationMs,
        inputTokens: metrics.inputTokens ?? (rows[idx] as any).inputTokens,
        outputTokens: metrics.outputTokens ?? (rows[idx] as any).outputTokens,
        cacheReadTokens: metrics.cacheReadTokens ?? (rows[idx] as any).cacheReadTokens,
        cacheCreationTokens: metrics.cacheCreationTokens ?? (rows[idx] as any).cacheCreationTokens,
        costUsd: metrics.costUsd ?? (rows[idx] as any).costUsd,
        model: metrics.model ?? (rows[idx] as any).model,
        numTurns: metrics.numTurns ?? (rows[idx] as any).numTurns,
        totalToolCalls: metrics.totalToolCalls ?? (rows[idx] as any).totalToolCalls,
        attemptCount: metrics.attemptCount ?? (rows[idx] as any).attemptCount,
      } : {}),
      completedAt: status === "done" ? (rows[idx] as any).completedAt ?? nowIso() : (rows[idx] as any).completedAt,
      updatedAt: nowIso(),
    };
    writeTaskRows(filePath, rows);
  });
}

export function readRuntimeLedgerState(
  projectDir: string,
  playbookName: string,
): RuntimeLedgerState {
  const goals = new Map<string, RuntimeGoal>();

  // Fast path: if a compacted snapshot exists, prime the goal map from
  // it. Then replay only events newer than the snapshot's asOf
  // timestamp. This keeps replay O(events-since-last-compaction)
  // instead of O(total-events-ever-written), which matters once
  // goals.jsonl grows past a few thousand lines.
  const snapshotPath = runtimeGoalsSnapshotPath(projectDir, playbookName);
  const snapshot = readGoalsSnapshot(snapshotPath);
  let asOf = "";
  if (snapshot) {
    for (const g of snapshot.goals) goals.set(g.id, g);
    asOf = snapshot.asOf;
  }

  const goalEvents = parseJsonl<GoalEvent>(runtimeGoalsPath(projectDir, playbookName));
  for (const event of goalEvents) {
    // Skip events already reflected in the snapshot. We compare ISO
    // strings lexicographically — well-defined for UTC timestamps.
    if (asOf && event.timestamp <= asOf) continue;
    if (event.event === "goal.upsert") {
      const existing = goals.get(event.goal.id);
      const merged = existing ? mergeGoal(existing, event.goal) : event.goal;
      goals.set(event.goal.id, {
        ...merged,
        status_runtime: existing?.status_runtime ?? "pending",
        createdAt: existing?.createdAt ?? event.timestamp,
        updatedAt: event.timestamp,
      });
      continue;
    }
    const existing = goals.get(event.goalId);
    if (!existing) continue;
    goals.set(event.goalId, {
      ...existing,
      status_runtime: event.status,
      updatedAt: event.timestamp,
    });
  }

  const tasks = readTaskRows(runtimeTasksPath(projectDir, playbookName));

  return {
    goals: [...goals.values()],
    tasks,
  };
}

/**
 * Compact goals.jsonl: read current state, write a snapshot file
 * containing the materialized goal map, then truncate goals.jsonl.
 *
 * Safe to call at any point — the read path always merges
 * snapshot + remaining events, so a partial compaction (snapshot
 * written but jsonl not truncated yet) just means events get replayed
 * once and produce the same answer.
 *
 * Uses the file lock to prevent concurrent writers from appending
 * mid-compaction. Returns the number of events compacted into the
 * snapshot.
 *
 * Operators should call this periodically (or on session end) when
 * goals.jsonl grows past a few thousand lines.
 */
export function compactGoalsLog(
  projectDir: string,
  playbookName: string,
): { compactedEvents: number; snapshotPath: string } {
  const goalsPath = runtimeGoalsPath(projectDir, playbookName);
  const snapshotPath = runtimeGoalsSnapshotPath(projectDir, playbookName);
  return withFileLock(goalsPath, () => {
    const state = readRuntimeLedgerState(projectDir, playbookName);
    const events = parseJsonl<GoalEvent>(goalsPath);
    const compacted: GoalsSnapshot = {
      asOf: nowIso(),
      goals: state.goals,
    };
    // Write the snapshot first (atomic). Only after it lands do we
    // truncate the log. If we crash between these, the next read
    // sees the snapshot + the (un-truncated) log and still gets the
    // same answer.
    atomicWriteFileSync(snapshotPath, JSON.stringify(compacted, null, 2));
    // Truncate by atomic rewrite with no content.
    atomicWriteFileSync(goalsPath, "");
    return { compactedEvents: events.length, snapshotPath };
  });
}

export function selectNextBuildableGoal(state: RuntimeLedgerState): RuntimeGoal | null {
  const doneGoals = new Set(
    state.goals
      .filter((goal) => goal.status_runtime === "done")
      .map((goal) => goal.id),
  );
  const candidates = state.goals.filter((goal) =>
    goal.status_runtime !== "done" &&
    goal.status_runtime !== "stalled" &&
    goal.status_runtime !== "rejected",
  );
  for (const goal of candidates) {
    const deps = goal.depends_on ?? [];
    if (deps.every((dep) => doneGoals.has(dep))) return goal;
  }
  return null;
}

export function readTaskInventoryState(
  projectDir: string,
  playbookName: string,
): Map<string, RuntimeTask> {
  const state = readRuntimeLedgerState(projectDir, playbookName);
  const byId = new Map<string, RuntimeTask>();
  for (const task of state.tasks) byId.set(task.id, task);
  return byId;
}
