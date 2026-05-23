/**
 * Task State Manager — minimal replacement for deleted checkpoint classes.
 *
 * Provides equivalent functionality under new names so consumers continue
 * to work while the old checkpoint infrastructure is removed.
 */

import { readFile, mkdir, readdir } from "node:fs/promises";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { atomicWriteFile } from "./atomic-write.ts";
import { appendTaskStatus } from "../task/goal/runtime-ledger.ts";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface TaskMetadata {
  completedBy?: "user" | "repair-strategy" | "seed-completion" | "normal-execution";
  completedAt?: string;
  skipRevalidation?: boolean;
  repairedChecks?: string[];
  reason?: string;
}

export interface CheckpointV1 {
  version: 1;
  timestamp: string;
  iteration: number;
  totalGapsResolved: number;
  totalErrors: number;
  completedTasks: string[];
  failedTasks?: string[];
  seededTasks?: string[];
  lockedTasks: string[];
  lastSuccessfulIteration?: string;
  taskAttempts?: Record<string, number>;
  taskMetadata?: Record<string, TaskMetadata>;
}

export interface CheckpointV2 {
  version: 2;
  timestamp: string;
  iteration: number;
  totalGapsResolved: number;
  totalErrors: number;
  lastSuccessfulIteration?: string;
  _cache?: {
    completedCount: number;
    failedCount: number;
    lastScan: string;
  };
  completedTasks?: string[];
  failedTasks?: string[];
  seededTasks?: string[];
  lockedTasks?: string[];
  taskAttempts?: Record<string, number>;
  taskMetadata?: Record<string, TaskMetadata>;
}

export type Checkpoint = CheckpointV1 | CheckpointV2;

export interface TaskStatus {
  status: "complete" | "failed" | "blocked" | "seeded" | "running" | "pending";
}

export interface AttemptEntry {
  attempt: number;
  outcome: "success" | "failed" | "interrupted";
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
}

export interface UnitProgress {
  totalChildren: number;
  completedChildren: number;
  failedChildren: number;
  childIds?: string[];
  lastProgressUpdate?: string;
}

export interface UnitCheckpoint {
  status: "complete" | "failed" | "blocked" | "seeded" | "running" | "pending";
  completedAt?: string;
  attemptCount?: number;
  attempts?: AttemptEntry[];
  currentAttempt?: number;
  createdAt?: string;
  lastUpdated?: string;
  progress?: UnitProgress;
}

export interface TaskCheckpoint {
  status: "complete" | "failed" | "blocked" | "seeded" | "running" | "pending";
  completedAt?: string;
}

/* ------------------------------------------------------------------ */
/*  FileSystemStateReader — reads task state from journal filesystem    */
/* ------------------------------------------------------------------ */

export class FileSystemStateReader {
  private projectDir: string;
  private _statusCache?: Map<string, string>;
  private _cacheValid = false;

  constructor(projectDir: string) {
    this.projectDir = projectDir;
  }

  invalidate(): void {
    this._cacheValid = false;
    this._statusCache = undefined;
  }

  getStatusMap(): Map<string, string> {
    if (this._statusCache && this._cacheValid) return this._statusCache;
    this._statusCache = this._scanStatus();
    this._cacheValid = true;
    return this._statusCache;
  }

  private _scanStatus(): Map<string, string> {
    const map = new Map<string, string>();
    const journalDir = path.join(this.projectDir, ".converge", "journal");
    if (!existsSync(journalDir)) return map;

    let entries: { name: string; isDirectory: () => boolean }[] = [];
    try {
      entries = [...readdirSync(journalDir, { withFileTypes: true })];
    } catch {
      return map;
    }

    for (const pb of entries) {
      if (!pb.isDirectory()) continue;
      const runstatePath = path.join(journalDir, pb.name, "runstate.json");
      if (!existsSync(runstatePath)) continue;
      try {
        const raw = readFileSync(runstatePath, "utf-8");
        const rs = JSON.parse(raw);
        for (const [id, node] of Object.entries<any>(rs.dag?.nodes ?? {})) {
          const s = node.status ?? "pending";
          map.set(id, s);
          // Also set epic-qualified form to match tree command lookup patterns
          const slashIdx = id.indexOf("/");
          if (slashIdx > 0) {
            map.set(id, s);
          }
        }
      } catch {
        // Skip malformed runstate
      }
    }
    return map;
  }
}

/* ------------------------------------------------------------------ */
/*  TaskStateManager — global task state                                */
/* ------------------------------------------------------------------ */

export class TaskStateManager {
  private checkpointFile: string;
  private fsState: FileSystemStateReader;
  private projectDir: string;

  constructor(projectDir: string) {
    this.projectDir = projectDir;
    this.checkpointFile = path.join(projectDir, ".converge", "journal", ".checkpoint.json");
    this.fsState = new FileSystemStateReader(projectDir);
  }

  invalidate(): void {
    this.fsState.invalidate();
  }

  getStatusMap(): Map<string, string> {
    return this.fsState.getStatusMap();
  }

  async save(checkpoint: Checkpoint): Promise<void> {
    const journalDir = path.dirname(this.checkpointFile);
    if (!existsSync(journalDir)) {
      await mkdir(journalDir, { recursive: true });
    }
    await atomicWriteFile(this.checkpointFile, JSON.stringify(checkpoint, null, 2));
  }

  async load(): Promise<Checkpoint | null> {
    if (!existsSync(this.checkpointFile)) return null;
    try {
      const content = await readFile(this.checkpointFile, "utf-8");
      return JSON.parse(content) as Checkpoint;
    } catch (parseErr) {
      // See UnitStateManager.load for rationale: warn rather than silently
      // re-running.
      const m = parseErr instanceof Error ? parseErr.message : String(parseErr);
      console.warn(
        `[checkpoint:task-state] corrupt checkpoint at ${this.checkpointFile} (${m}). ` +
          `Treating as absent; task will re-run.`,
      );
      return null;
    }
  }

  async getCompletedTasks(): Promise<string[]> {
    const ckpt = await this.load();
    if (!ckpt) return [];
    if (ckpt.version === 2) {
      return ckpt.completedTasks ?? [];
    }
    return (ckpt as CheckpointV1).completedTasks;
  }

  async getFailedTasks(): Promise<string[]> {
    const ckpt = await this.load();
    if (!ckpt) return [];
    if (ckpt.version === 2) {
      return ckpt.failedTasks ?? [];
    }
    return (ckpt as CheckpointV1).failedTasks ?? [];
  }

  async getLockedTasks(): Promise<string[]> {
    const ckpt = await this.load();
    if (!ckpt) return [];
    if (ckpt.version === 2) {
      return ckpt.lockedTasks ?? [];
    }
    return (ckpt as CheckpointV1).lockedTasks;
  }

  async isTaskFailed(taskId: string): Promise<boolean> {
    const failed = await this.getFailedTasks();
    return failed.includes(taskId);
  }

  async isTaskSeeded(taskId: string): Promise<boolean> {
    const ckpt = await this.load();
    if (!ckpt) return false;
    const seeded = ckpt.version === 2 ? (ckpt.seededTasks ?? []) : (ckpt as CheckpointV1).seededTasks ?? [];
    return seeded.includes(taskId);
  }

  async markTaskCompleted(taskId: string, epicId?: string): Promise<void> {
    // RFC 0033: Inventory is the authoritative state store.
    // Mirror to journal checkpoint for execution context.
    const playbookName = process.env.CONVERGE_PLAYBOOK || "default";
    try {
      appendTaskStatus(this.projectDir, playbookName, taskId, "done", { checkpointMirrored: true });
    } catch {
      // Inventory mirror is best-effort; fall through to journal write.
    }
    const ckpt = await this.load();
    const base: CheckpointV2 = {
      version: 2,
      timestamp: new Date().toISOString(),
      iteration: ckpt?.iteration ?? 0,
      totalGapsResolved: ckpt?.totalGapsResolved ?? 0,
      totalErrors: ckpt?.totalErrors ?? 0,
      completedTasks: [...(ckpt?.completedTasks ?? []), taskId],
      failedTasks: ckpt?.failedTasks ?? [],
      seededTasks: ckpt?.seededTasks ?? [],
      lockedTasks: ckpt?.lockedTasks ?? [],
      taskAttempts: ckpt?.taskAttempts,
      taskMetadata: ckpt?.taskMetadata,
      lastSuccessfulIteration: ckpt?.lastSuccessfulIteration,
    };
    await this.save(base);
  }

  async markTaskFailed(taskId: string): Promise<void> {
    // RFC 0033: Inventory is the authoritative state store.
    const playbookName = process.env.CONVERGE_PLAYBOOK || "default";
    try {
      appendTaskStatus(this.projectDir, playbookName, taskId, "dropped", { checkpointMirrored: true });
    } catch {
      // Inventory mirror is best-effort; fall through to journal write.
    }
    const ckpt = await this.load();
    const base: CheckpointV2 = {
      version: 2,
      timestamp: new Date().toISOString(),
      iteration: ckpt?.iteration ?? 0,
      totalGapsResolved: ckpt?.totalGapsResolved ?? 0,
      totalErrors: (ckpt?.totalErrors ?? 0) + 1,
      completedTasks: ckpt?.completedTasks ?? [],
      failedTasks: [...(ckpt?.failedTasks ?? []), taskId],
      seededTasks: ckpt?.seededTasks ?? [],
      lockedTasks: ckpt?.lockedTasks ?? [],
      taskAttempts: ckpt?.taskAttempts,
      taskMetadata: ckpt?.taskMetadata,
      lastSuccessfulIteration: ckpt?.lastSuccessfulIteration,
    };
    await this.save(base);
  }

  async markTaskSeeded(taskId: string): Promise<void> {
    // RFC 0033: Inventory is the authoritative state store.
    const playbookName = process.env.CONVERGE_PLAYBOOK || "default";
    try {
      appendTaskStatus(this.projectDir, playbookName, taskId, "blocked", { checkpointMirrored: true });
    } catch {
      // Inventory mirror is best-effort; fall through to journal write.
    }
    const ckpt = await this.load();
    const base: CheckpointV2 = {
      version: 2,
      timestamp: new Date().toISOString(),
      iteration: ckpt?.iteration ?? 0,
      totalGapsResolved: ckpt?.totalGapsResolved ?? 0,
      totalErrors: ckpt?.totalErrors ?? 0,
      completedTasks: ckpt?.completedTasks ?? [],
      failedTasks: ckpt?.failedTasks ?? [],
      seededTasks: [...(ckpt?.seededTasks ?? []), taskId],
      lockedTasks: ckpt?.lockedTasks ?? [],
      taskAttempts: ckpt?.taskAttempts,
      taskMetadata: ckpt?.taskMetadata,
      lastSuccessfulIteration: ckpt?.lastSuccessfulIteration,
    };
    await this.save(base);
  }

  async getTaskAttemptCount(taskId: string): Promise<number> {
    const ckpt = await this.load();
    if (!ckpt) return 0;
    return ckpt.taskAttempts?.[taskId] ?? 0;
  }

  async incrementTaskAttempt(taskId: string): Promise<number> {
    const ckpt = await this.load();
    const attempts: Record<string, number> = { ...(ckpt?.taskAttempts ?? {}) };
    attempts[taskId] = (attempts[taskId] ?? 0) + 1;
    const base: CheckpointV2 = {
      version: 2,
      timestamp: new Date().toISOString(),
      iteration: ckpt?.iteration ?? 0,
      totalGapsResolved: ckpt?.totalGapsResolved ?? 0,
      totalErrors: ckpt?.totalErrors ?? 0,
      completedTasks: ckpt?.completedTasks ?? [],
      failedTasks: ckpt?.failedTasks ?? [],
      seededTasks: ckpt?.seededTasks ?? [],
      lockedTasks: ckpt?.lockedTasks ?? [],
      taskAttempts: attempts,
      taskMetadata: ckpt?.taskMetadata,
      lastSuccessfulIteration: ckpt?.lastSuccessfulIteration,
    };
    await this.save(base);
    return attempts[taskId];
  }

  async removeFromCompleted(taskId: string): Promise<void> {
    const ckpt = await this.load();
    if (!ckpt) return;
    const base: CheckpointV2 = {
      version: 2,
      timestamp: new Date().toISOString(),
      iteration: ckpt.iteration ?? 0,
      totalGapsResolved: ckpt.totalGapsResolved ?? 0,
      totalErrors: ckpt.totalErrors ?? 0,
      completedTasks: (ckpt.completedTasks ?? []).filter((id) => id !== taskId),
      failedTasks: [...(ckpt.failedTasks ?? []), taskId],
      seededTasks: ckpt.seededTasks ?? [],
      lockedTasks: ckpt.lockedTasks ?? [],
      taskAttempts: ckpt.taskAttempts,
      taskMetadata: ckpt.taskMetadata,
      lastSuccessfulIteration: ckpt.lastSuccessfulIteration,
    };
    await this.save(base);
  }
}

/* ------------------------------------------------------------------ */
/*  UnitStateManager — per-unit state                                   */
/* ------------------------------------------------------------------ */

export class UnitStateManager {
  private projectDir: string;
  private level: string;
  private ids: string[];

  constructor(projectDir: string, level: string, ...ids: string[]) {
    this.projectDir = projectDir;
    this.level = level;
    this.ids = ids;
  }

  private get checkpointPath(): string {
    // When an execution is active, isolate task state under
    // journal/{playbook}/executions/{executionId}/tasks/{...ids}
    const executionId = process.env.CONVERGE_EXECUTION_ID;
    if (executionId) {
      // ids[0] is the playbook name, ids[1..] are task segments
      const playbook = this.ids[0] ?? "default";
      const taskSegments = this.ids.slice(1);
      return path.join(
        this.projectDir,
        ".converge",
        "journal",
        playbook,
        "executions",
        executionId,
        "tasks",
        ...taskSegments,
        "checkpoint.json",
      );
    }
    // level is "task" → directory is "tasks"
    const levelDir = this.level === "task" ? "tasks" : this.level;
    const parts = [this.projectDir, ".converge", "journal", this.ids[0], levelDir, ...this.ids.slice(1)];
    return path.join(...parts, "checkpoint.json");
  }

  async load(): Promise<UnitCheckpoint | null> {
    const p = this.checkpointPath;
    if (!existsSync(p)) return null;
    try {
      return JSON.parse(await readFile(p, "utf-8")) as UnitCheckpoint;
    } catch (parseErr) {
      // Corruption-resilience: treat unreadable checkpoint as absent so
      // the task re-runs. Surface a structured warning so operators see
      // the downgrade — silent corruption recovery used to hide recurring
      // disk problems and burn AI budget on invisible re-runs.
      const m = parseErr instanceof Error ? parseErr.message : String(parseErr);
      console.warn(
        `[checkpoint:unit] corrupt checkpoint at ${p} (${m}). ` +
          `Treating as absent; task will re-run.`,
      );
      return null;
    }
  }

  async save(ckpt: UnitCheckpoint): Promise<void> {
    const p = this.checkpointPath;
    const dir = path.dirname(p);
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
    await atomicWriteFile(p, JSON.stringify(ckpt, null, 2));
  }

  async startAttempt(_attemptNumber: number): Promise<void> {
    await this.save({ status: "running" });
  }

  async completeAttempt(
    _attemptNumber: number,
    _result: string,
    _startedAt?: string,
  ): Promise<void> {
    // State is updated via markComplete/markFailed
  }

  async updateProgress(progress: UnitProgress): Promise<void> {
    const current = await this.load();
    await this.save({
      status: current?.status ?? "pending",
      completedAt: current?.completedAt,
      progress,
    });
  }

  async getAttemptCount(): Promise<number> {
    const checkpointDir = path.dirname(this.checkpointPath);
    const attemptsDir = path.join(checkpointDir, "attempts");
    if (!existsSync(attemptsDir)) return 0;
    try {
      const entries = await readdir(attemptsDir);
      // Count numbered attempt directories (01, 02, etc.)
      return entries.filter((e) => /^\d{2}$/.test(e)).length;
    } catch {
      return 0;
    }
  }

  async markSeeded(): Promise<void> {
    await this.save({ status: "seeded" });
  }

  async markComplete(): Promise<void> {
    await this.save({ status: "complete", completedAt: new Date().toISOString() });
  }

  async markFailed(): Promise<void> {
    await this.save({ status: "failed" });
  }

  async markBlocked(): Promise<void> {
    await this.save({ status: "blocked" });
  }
}

/* ------------------------------------------------------------------ */
/*  TaskUnitStateManager — per-task state                                 */

export class TaskUnitStateManager {
  private projectDir: string;
  private epicId: string;
  private taskId: string;

  constructor(projectDir: string, epicId: string, taskId: string) {
    this.projectDir = projectDir;
    this.epicId = epicId;
    this.taskId = taskId;
  }

  private get checkpointPath(): string {
    // When an execution is active, isolate task state under
    // journal/{playbook}/executions/{executionId}/tasks/{taskId}
    const executionId = process.env.CONVERGE_EXECUTION_ID;
    if (executionId) {
      return path.join(
        this.projectDir,
        ".converge",
        "journal",
        this.epicId,
        "executions",
        executionId,
        "tasks",
        this.taskId,
        "checkpoint.json",
      );
    }
    return path.join(
      this.projectDir,
      ".converge",
      "journal",
      this.epicId,
      "tasks",
      this.taskId,
      "checkpoint.json",
    );
  }

  async load(): Promise<TaskCheckpoint | null> {
    const p = this.checkpointPath;
    if (!existsSync(p)) return null;
    try {
      return JSON.parse(await readFile(p, "utf-8")) as TaskCheckpoint;
    } catch (parseErr) {
      // See UnitStateManager.load above for rationale: warn rather than
      // silently re-run.
      const m = parseErr instanceof Error ? parseErr.message : String(parseErr);
      console.warn(
        `[checkpoint:task] corrupt checkpoint at ${p} (${m}). ` +
          `Treating as absent; task will re-run.`,
      );
      return null;
    }
  }

  async save(ckpt: TaskCheckpoint): Promise<void> {
    const p = this.checkpointPath;
    const dir = path.dirname(p);
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
    await atomicWriteFile(p, JSON.stringify(ckpt, null, 2));
  }

  async startAttempt(_attemptNumber: number): Promise<void> {
    await this.save({ status: "running" });
  }

  async completeAttempt(
    _attemptNumber: number,
    _result: string,
    _startedAt?: string,
  ): Promise<void> {
    // State is updated via markComplete/markFailed
  }

  async markBlocked(): Promise<void> {
    await this.save({ status: "blocked" });
  }
}
