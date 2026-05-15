import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
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

type TaskEvent =
  | {
      event: "task.upsert";
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
      };
      timestamp: string;
      sourceTaskId?: string;
    }
  | {
      event: "task.status";
      taskId?: string;
      taskPath?: string;
      status: TaskRuntimeStatus;
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

function mergeGoal(base: PlaybookGoal, patch: PlaybookGoal): PlaybookGoal {
  return {
    ...base,
    ...patch,
    checks: patch.checks.length > 0 ? patch.checks : base.checks,
    depends_on: patch.depends_on ?? base.depends_on,
  };
}

export function runtimeLedgerDir(projectDir: string, playbookName: string): string {
  return join(projectDir, ".converge", "artifacts", playbookName);
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
  sourceTaskId?: string,
): void {
  appendJsonl(runtimeTasksPath(projectDir, playbookName), {
    event: "task.upsert",
    task,
    timestamp: nowIso(),
    sourceTaskId,
  } satisfies TaskEvent);
}

export function appendTaskStatus(
  projectDir: string,
  playbookName: string,
  taskIdOrPath: string,
  status: TaskRuntimeStatus,
  metadata?: Record<string, unknown>,
  sourceTaskId?: string,
): void {
  const statusEvent =
    taskIdOrPath.includes("/tasks/") || taskIdOrPath.startsWith(".converge/")
      ? { taskPath: taskIdOrPath }
      : { taskId: taskIdOrPath };
  appendJsonl(runtimeTasksPath(projectDir, playbookName), {
    event: "task.status",
    ...statusEvent,
    status,
    timestamp: nowIso(),
    sourceTaskId,
    metadata,
  } satisfies TaskEvent);
}

export function readRuntimeLedgerState(
  projectDir: string,
  playbookName: string,
): RuntimeLedgerState {
  const goals = new Map<string, RuntimeGoal>();
  const tasks = new Map<string, RuntimeTask>();

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

  const taskEvents = parseJsonl<TaskEvent>(runtimeTasksPath(projectDir, playbookName));
  for (const event of taskEvents) {
    if (event.event === "task.upsert") {
      const taskPath =
        event.task.taskPath ??
        `.converge/journal/${playbookName}/tasks/${event.task.id}`;
      const existing = tasks.get(taskPath);
      tasks.set(taskPath, {
        taskPath,
        id: event.task.id,
        goalId: event.task.goalId,
        summary: event.task.summary,
        status: event.task.status ?? existing?.status ?? "todo",
        source: event.task.source ?? existing?.source ?? "backlog",
        parentTaskPath: event.task.parentTaskPath ?? existing?.parentTaskPath,
        playbook: event.task.playbook ?? existing?.playbook ?? playbookName,
        epoch: event.task.epoch ?? existing?.epoch,
        metadata: event.task.metadata ?? existing?.metadata,
        createdAt: existing?.createdAt ?? event.timestamp,
        updatedAt: event.timestamp,
      });
      continue;
    }
    const key =
      event.taskPath ??
      (event.taskId
        ? `.converge/journal/${playbookName}/tasks/${event.taskId}`
        : undefined);
    if (!key) continue;
    const existing = tasks.get(key);
    if (!existing) continue;
    tasks.set(key, {
      ...existing,
      status: event.status,
      metadata: event.metadata ?? existing.metadata,
      updatedAt: event.timestamp,
    });
  }

  return {
    goals: [...goals.values()],
    tasks: [...tasks.values()],
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
