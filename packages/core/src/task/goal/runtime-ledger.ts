import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import type { PlaybookGoal } from "../playbook/types.ts";

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
  taskPath: string;
  id: string;
  goalId: string;
  summary: string;
  status: TaskRuntimeStatus;
  source?: "static" | "spawned" | "backlog";
  parentTaskPath?: string;
  playbook?: string;
  epoch?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

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
 * tasks.jsonl is a flat task inventory: one line per task record (not an
 * event log). Lines from the legacy event-log format (which carried a
 * top-level `event` field instead of a `RuntimeTask` shape) are silently
 * skipped on read so existing files migrate cleanly on first mutation.
 */
function readTaskRows(filePath: string): RuntimeTask[] {
  return parseJsonl<Record<string, unknown>>(filePath).flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    if (typeof row.id !== "string" || typeof row.taskPath !== "string") return [];
    return [row as unknown as RuntimeTask];
  });
}

function writeTaskRows(filePath: string, rows: RuntimeTask[]): void {
  ensureFileDir(filePath);
  const body = rows.map((row) => JSON.stringify(row)).join("\n");
  writeFileSync(filePath, body.length > 0 ? `${body}\n` : "", "utf8");
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
  appendJsonl(runtimeGoalsPath(projectDir, playbookName), {
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
  appendJsonl(runtimeGoalsPath(projectDir, playbookName), {
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
    taskPath?: string;
    id: string;
    goalId: string;
    summary: string;
    status?: TaskRuntimeStatus;
    source?: "static" | "spawned" | "backlog";
    parentTaskPath?: string;
    playbook?: string;
    epoch?: string;
    metadata?: Record<string, unknown>;
  },
  _sourceTaskId?: string,
): void {
  const filePath = runtimeTasksPath(projectDir, playbookName);
  const rows = readTaskRows(filePath);
  const now = nowIso();
  const taskPath =
    task.taskPath ?? `.converge/journal/${playbookName}/tasks/${task.id}`;
  const idx = rows.findIndex((r) => r.id === task.id);
  if (idx >= 0) {
    const prev = rows[idx];
    rows[idx] = {
      taskPath,
      id: task.id,
      goalId: task.goalId,
      summary: task.summary,
      status: task.status ?? prev.status,
      source: task.source ?? prev.source ?? "backlog",
      parentTaskPath: task.parentTaskPath ?? prev.parentTaskPath,
      playbook: task.playbook ?? prev.playbook ?? playbookName,
      epoch: task.epoch ?? prev.epoch,
      metadata: task.metadata ?? prev.metadata,
      createdAt: prev.createdAt ?? now,
      updatedAt: now,
    };
  } else {
    rows.push({
      taskPath,
      id: task.id,
      goalId: task.goalId,
      summary: task.summary,
      status: task.status ?? "todo",
      source: task.source ?? "backlog",
      parentTaskPath: task.parentTaskPath,
      playbook: task.playbook ?? playbookName,
      epoch: task.epoch,
      metadata: task.metadata,
      createdAt: now,
      updatedAt: now,
    });
  }
  writeTaskRows(filePath, rows);
}

/**
 * Update the status (and optionally metadata) of an existing task row.
 * No-op when the row does not exist — callers must `appendTaskUpsert` first.
 */
export function appendTaskStatus(
  projectDir: string,
  playbookName: string,
  taskIdOrPath: string,
  status: TaskRuntimeStatus,
  metadata?: Record<string, unknown>,
  _sourceTaskId?: string,
): void {
  const filePath = runtimeTasksPath(projectDir, playbookName);
  if (!existsSync(filePath)) return;
  const rows = readTaskRows(filePath);
  const isPath =
    taskIdOrPath.includes("/tasks/") || taskIdOrPath.startsWith(".converge/");
  const idx = rows.findIndex((r) =>
    isPath ? r.taskPath === taskIdOrPath : r.id === taskIdOrPath,
  );
  if (idx < 0) return;
  rows[idx] = {
    ...rows[idx],
    status,
    metadata: metadata ?? rows[idx].metadata,
    updatedAt: nowIso(),
  };
  writeTaskRows(filePath, rows);
}

export function readRuntimeLedgerState(
  projectDir: string,
  playbookName: string,
): RuntimeLedgerState {
  const goals = new Map<string, RuntimeGoal>();

  const goalEvents = parseJsonl<GoalEvent>(runtimeGoalsPath(projectDir, playbookName));
  for (const event of goalEvents) {
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
  const byPath = new Map<string, RuntimeTask>();
  for (const task of state.tasks) byPath.set(task.taskPath, task);
  return byPath;
}
