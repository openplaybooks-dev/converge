/**
 * Journal Structure
 *
 * Creates hierarchical journal structure that mirrors task organization.
 *
 * Path routing:
 *   With playbook context (CONVERGE_PLAYBOOK=X):
 *     journal/{playbook}/tasks/{epicId}/{taskId}/...
 *   Without (legacy / default):
 *     journal/tasks/{epicId}/{taskId}/...
 *
 * The internal task hierarchy is identical either way — only the root changes.
 */

import { join } from "node:path";
import { existsSync } from "node:fs";
import type { PlaybookContext } from "../playbook/types.ts";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/**
 * Determine whether `segment` (a task folder name) lives directly under the
 * epic root or inside the epic's `tasks/` subdirectory.
 *
 * Priority order:
 *   1. Existing journal entry at `epic/tasks/{segment}` → ['tasks']
 *   2. Existing journal entry at `epic/{segment}`       → []
 *   3. Source epic has `tasks/{segment}`               → ['tasks']
 *   4. Default                                         → []
 */
function resolveFirstSegmentPrefix(
  epicJournalDir: string,
  projectDir: string,
  epicId: string,
  segment: string,
): string[] {
  // Source epic structure is the ground truth — check it first.
  const sourceEpicDir = join(projectDir, ".converge", "epics", epicId);
  if (existsSync(join(sourceEpicDir, "tasks", segment))) return ["tasks"];
  if (existsSync(join(sourceEpicDir, segment))) return [];
  // Also check playbook source: .converge/playbooks/{epicId}/tasks/{segment}
  const sourcePlaybookDir = join(
    projectDir,
    ".converge",
    "playbooks",
    epicId,
    "tasks",
  );
  if (existsSync(join(sourcePlaybookDir, segment))) return [];
  // Fall back to existing journal entries when source is absent.
  if (existsSync(join(epicJournalDir, "tasks", segment))) return ["tasks"];
  return [];
}

/* ------------------------------------------------------------------ */
/*  Journal Structure Utilities                                       */
/* ------------------------------------------------------------------ */

/**
 * Get journal directory structure
 */
export interface JournalStructure {
  /** Root journal directory */
  root: string;

  /** Project-level directory */
  project: string;

  /** Epic-level directory (if epic provided) */
  epic?: string;

  /** Task-level directory (if task provided) */
  task?: string;

  /**
   * Attempt-level directory (if task + attempt number provided or CONVERGE_TASK_ATTEMPT env var set).
   */
  attempt?: string;
}

/* ------------------------------------------------------------------ */
/*  Playbook Context from Environment                                  */
/* ------------------------------------------------------------------ */

/**
 * Read playbook context from environment variable.
 * Returns undefined if not running under a playbook.
 */
function getPlaybookContextFromEnv(): PlaybookContext | undefined {
  const playbook = process.env.CONVERGE_PLAYBOOK;
  if (playbook) {
    return { playbook };
  }
  return undefined;
}

/* ------------------------------------------------------------------ */
/*  Attempt Utilities                                                  */
/* ------------------------------------------------------------------ */

/**
 * Get the active attempt number from env var, or undefined if not in an attempt context.
 */
function getActiveAttemptNumber(): string | undefined {
  return process.env.CONVERGE_TASK_ATTEMPT;
}

/**
 * Get the attempt directory for a specific task attempt.
 */
export function getTaskAttemptDir(
  projectDir: string,
  epicId: string,
  taskId: string,
  attemptNumber: number | string,
): string {
  const padded =
    typeof attemptNumber === "number"
      ? String(attemptNumber).padStart(2, "0")
      : attemptNumber;
  const structure = getJournalStructure(projectDir, epicId, taskId);
  return join(structure.task!, "attempts", padded);
}

/**
 * Per-attempt file types that are routed to the attempt directory when active.
 * Task-level aggregated files (status, summary) always stay at the task directory.
 */
const PER_ATTEMPT_FILE_TYPES = new Set(["events", "log", "gaps"]);

/* ------------------------------------------------------------------ */
/*  Epic Root Resolution                                               */
/* ------------------------------------------------------------------ */

/**
 * Get the epics root directory for a given context.
 *
 * Always: journal/{playbook}/tasks/
 * Defaults to 'default' when no playbook context.
 */
function getEpicsRoot(journalRoot: string, ctx?: PlaybookContext): string {
  const name = ctx?.playbook ?? "default";
  return join(journalRoot, name, "tasks");
}

/* ------------------------------------------------------------------ */
/*  Main Structure Function                                            */
/* ------------------------------------------------------------------ */

/**
 * Get hierarchical journal directory structure.
 *
 * Task path mirrors the epic filesystem structure:
 *   Root task:    {epicsRoot}/{epicId}/{taskId}
 *   WBS subtask:  {epicsRoot}/{epicId}/{parent}/tasks/{child}
 *   Deeply nested: {epicsRoot}/{epicId}/{a}/tasks/{b}/tasks/{c}
 */
export function getJournalStructure(
  projectDir: string,
  epicId?: string,
  taskId?: string,
  playbookCtx?: PlaybookContext,
): JournalStructure {
  const root = join(projectDir, ".converge", "journal");
  const project = join(root, "project");

  const structure: JournalStructure = {
    root,
    project,
  };

  // Resolve playbook context: explicit param → env var → none (legacy)
  const ctx = playbookCtx ?? getPlaybookContextFromEnv();

  if (epicId) {
    const epicsRoot = getEpicsRoot(root, ctx);
    // When running under a playbook, the playbook name IS the epic namespace.
    // If epicId matches the playbook name, don't add it again — epicsRoot already
    // includes it: journal/{playbook}/tasks/ is the epic root.
    const playbookName = ctx?.playbook ?? "default";
    const skipEpicSegment = ctx && epicId === playbookName;
    structure.epic = skipEpicSegment ? epicsRoot : join(epicsRoot, epicId);

    if (taskId) {
      const segments = taskId.split("/").filter(Boolean);

      // Playbook tasks: epicId is already baked into epicsRoot, so skip it.
      // Use the same tasks/ separator logic as the non-skip path to mirror the
      // actual filesystem structure: journal/{playbook}/tasks/{a}/tasks/{b}/tasks/{c}
      if (skipEpicSegment) {
        const prefix = resolveFirstSegmentPrefix(
          structure.epic!,
          projectDir,
          epicId,
          segments[0],
        );
        const pathSegments: string[] = [...prefix, segments[0]];
        for (let i = 1; i < segments.length; i++) {
          pathSegments.push("tasks", segments[i]);
        }
        structure.task = join(structure.epic!, ...pathSegments);
      }
      // Epic-level task: when the first segment is the epicId itself,
      // the TASK.md lives in the epic root. The epic IS the task.
      else if (segments[0] === epicId) {
        if (segments.length === 1) {
          structure.task = structure.epic;
        } else {
          const childSegments = segments.slice(1);
          const pathSegments: string[] = ["tasks", childSegments[0]];
          for (let i = 1; i < childSegments.length; i++) {
            pathSegments.push("tasks", childSegments[i]);
          }
          structure.task = join(structure.epic, ...pathSegments);
        }
      } else {
        // Determine whether segments[0] lives directly under the epic root or
        // inside the epic's tasks/ subdirectory, then mirror that structure.
        const prefix = resolveFirstSegmentPrefix(
          structure.epic!,
          projectDir,
          epicId,
          segments[0],
        );
        const pathSegments: string[] = [...prefix, segments[0]];
        for (let i = 1; i < segments.length; i++) {
          pathSegments.push("tasks", segments[i]);
        }
        structure.task = join(structure.epic!, ...pathSegments);
      }

      // Populate attempt dir if an attempt is currently active.
      const activeAttemptDir = process.env.CONVERGE_TASK_ATTEMPT_DIR;
      if (activeAttemptDir) {
        structure.attempt = activeAttemptDir;
      } else {
        const activeAttempt = getActiveAttemptNumber();
        if (activeAttempt) {
          structure.attempt = join(structure.task, "attempts", activeAttempt);
        }
      }
    }
  }

  return structure;
}

/**
 * Get journal file path for a specific type
 */
export function getJournalFilePath(
  projectDir: string,
  level: "project" | "epic" | "task",
  fileType: "gaps" | "events" | "log" | "summary" | "status",
  epicId?: string,
  taskId?: string,
): string {
  const structure = getJournalStructure(projectDir, epicId, taskId);

  const extension =
    fileType === "gaps"
      ? "yml"
      : fileType === "summary"
        ? "md"
        : fileType === "events"
          ? "jsonl"
          : fileType === "status"
            ? "json"
            : "log";

  const filename = `${fileType}.${extension}`;

  switch (level) {
    case "project":
      return join(structure.project, filename);
    case "epic":
      if (!structure.epic) {
        throw new Error("Epic ID required for epic-level journal");
      }
      return join(structure.epic, filename);
    case "task":
      if (!structure.task) {
        throw new Error("Epic ID and Task ID required for task-level journal");
      }
      if (structure.attempt && PER_ATTEMPT_FILE_TYPES.has(fileType)) {
        return join(structure.attempt, "logs", filename);
      }
      return join(structure.task, filename);
  }
}

/**
 * Get the journal directory that contains task entries for an epic.
 */
export function getEpicTasksDir(projectDir: string, epicId: string): string {
  const structure = getJournalStructure(projectDir, epicId);
  return structure.epic!;
}

/**
 * Get the root directory containing all epic/task journals.
 * Playbook-aware: returns journal/{playbook}/tasks/ or journal/tasks/.
 */
export function getEpicsDir(projectDir: string): string {
  const root = join(projectDir, ".converge", "journal");
  const ctx = getPlaybookContextFromEnv();
  return getEpicsRoot(root, ctx);
}

/**
 * Get the sessions directory: journal/{playbook}/sessions/
 * Defaults to 'default' when no playbook context.
 */
export function getSessionsDir(projectDir: string): string {
  const root = join(projectDir, ".converge", "journal");
  const name = getPlaybookContextFromEnv()?.playbook ?? "default";
  return join(root, name, "sessions");
}

/**
 * Get the journal root for the active playbook: journal/{playbook}/
 *
 * Resolution order:
 *   1. process.env.CONVERGE_JOURNAL_ROOT — explicit override, used verbatim
 *   2. projectDir + .converge/journal/ + CONVERGE_PLAYBOOK (or 'default')
 *
 * Callers that export CONVERGE_JOURNAL_ROOT should use `setPlaybookScope()`
 * below so it stays in sync with CONVERGE_PLAYBOOK and CONVERGE_PLAYBOOK_DIR.
 */
export function getJournalRoot(projectDir: string): string {
  const override = process.env.CONVERGE_JOURNAL_ROOT;
  if (override) return override;
  const root = join(projectDir, ".converge", "journal");
  const name = getPlaybookContextFromEnv()?.playbook ?? "default";
  return join(root, name);
}

/* ------------------------------------------------------------------ */
/*  Playbook Scope Helpers (shared process-level vars)                 */
/* ------------------------------------------------------------------ */

/**
 * Set all playbook-scope env vars together so every command (scanner, tree,
 * journal, run) sees the same context. Use this instead of assigning
 * CONVERGE_PLAYBOOK by hand — the bare assignment leaves the journal root
 * and playbook dir unexported, which has bitten us before.
 *
 * Sets:
 *   CONVERGE_PLAYBOOK      — playbook name (e.g. "create-api")
 *   CONVERGE_PLAYBOOK_DIR  — {projectDir}/.converge/playbooks/{name}
 *   CONVERGE_JOURNAL_ROOT  — {projectDir}/.converge/journal/{name}
 */
export function setPlaybookScope(
  playbookName: string,
  projectDir: string,
): void {
  process.env.CONVERGE_PLAYBOOK = playbookName;
  process.env.CONVERGE_PLAYBOOK_DIR = join(
    projectDir,
    ".converge",
    "playbooks",
    playbookName,
  );
  process.env.CONVERGE_JOURNAL_ROOT = join(
    projectDir,
    ".converge",
    "journal",
    playbookName,
  );
}

/**
 * Clear all playbook-scope env vars. Use after a command finishes so later
 * commands in the same process don't inherit stale context.
 */
export function clearPlaybookScope(): void {
  delete process.env.CONVERGE_PLAYBOOK;
  delete process.env.CONVERGE_PLAYBOOK_DIR;
  delete process.env.CONVERGE_JOURNAL_ROOT;
}

/**
 * Get subdirectory paths for the lifecycle phases.
 */
export function getTaskBeforeDir(
  projectDir: string,
  epicId: string,
  taskId: string,
): string {
  const s = getJournalStructure(projectDir, epicId, taskId);
  return join(s.attempt ?? s.task!, "before");
}

export function getTaskAfterDir(
  projectDir: string,
  epicId: string,
  taskId: string,
): string {
  const s = getJournalStructure(projectDir, epicId, taskId);
  return join(s.attempt ?? s.task!, "after");
}

/** @deprecated Corrections no longer exist — each retry is a new attempt. */
export function getTaskCorrectionsDir(
  projectDir: string,
  epicId: string,
  taskId: string,
): string {
  const s = getJournalStructure(projectDir, epicId, taskId);
  return join(s.task!, "corrections");
}

/**
 * Get ancestor task journal directories (from root to immediate parent).
 */
export function getAncestorJournalPaths(
  projectDir: string,
  epicId: string,
  taskId: string,
): string[] {
  const segments = taskId.split("/").filter(Boolean);
  const paths: string[] = [];
  for (let depth = 1; depth < segments.length; depth++) {
    const ancestorId = segments.slice(0, depth).join("/");
    const s = getJournalStructure(projectDir, epicId, ancestorId);
    paths.push(s.task!);
  }
  return paths;
}

/**
 * Get breadcrumb path for context
 */
export interface Breadcrumb {
  level: "project" | "epic" | "task";
  name: string;
  path: string;
}

export function getBreadcrumbs(
  projectDir: string,
  projectName: string,
  epicId?: string,
  epicName?: string,
  taskId?: string,
  taskName?: string,
): Breadcrumb[] {
  const breadcrumbs: Breadcrumb[] = [
    {
      level: "project",
      name: projectName,
      path: join(projectDir, ".converge", "journal", "project"),
    },
  ];

  if (epicId) {
    breadcrumbs.push({
      level: "epic",
      name: epicName || epicId,
      path: join(getEpicsDir(projectDir), epicId),
    });
  }

  if (taskId && epicId) {
    const structure = getJournalStructure(projectDir, epicId, taskId);
    breadcrumbs.push({
      level: "task",
      name: taskName || taskId,
      path: structure.task!,
    });
  }

  return breadcrumbs;
}
