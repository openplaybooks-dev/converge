/**
 * Target Structure
 *
 * Single-target model (dbt-inspired): one playbook = one target directory.
 * No execution isolation — each run overwrites the previous runstate.
 *
 *   target/{playbook}/
 *     manifest.json
 *     manifest.prev.json
 *     runstate.json
 *     runstate.prev.json
 *     events.jsonl
 *     tasks/{taskId}/
 *
 * The journal tree mirrors the playbook tree 1:1 for task-level forensics.
 */

import { join } from "node:path";
import type { PlaybookContext } from "../task/playbook/types.ts";

/* ------------------------------------------------------------------ */
/*  Journal Structure Utilities                                       */
/* ------------------------------------------------------------------ */

export interface JournalStructure {
  root: string;
  project: string;
  epic?: string;
  task?: string;
  attempt?: string;
}

/* ------------------------------------------------------------------ */
/*  Playbook Context from Environment                                  */
/* ------------------------------------------------------------------ */

function getPlaybookContextFromEnv(): PlaybookContext | undefined {
  const playbook = process.env.CONVERGE_PLAYBOOK;
  if (playbook) return { playbook };
  return undefined;
}

/* ------------------------------------------------------------------ */
/*  Attempt Utilities                                                  */
/* ------------------------------------------------------------------ */

function getActiveAttemptNumber(): string | undefined {
  return process.env.CONVERGE_TASK_ATTEMPT;
}

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
  return join(taskJournalDir(projectDir, epicId, taskId), "attempts", padded);
}

const PER_ATTEMPT_FILE_TYPES = new Set(["events", "log", "gaps"]);

/* ------------------------------------------------------------------ */
/*  Target Directory — single source of truth                          */
/* ------------------------------------------------------------------ */

/**
 * Get the target root directory for the active playbook.
 *   target/{playbook}/
 *
 * Resolution order:
 *   1. process.env.CONVERGE_TARGET_DIR — explicit override
 *   2. projectDir/.converge/target/{playbook} — default
 */
export function getTargetDir(projectDir: string, playbookName?: string): string {
  const override = process.env.CONVERGE_TARGET_DIR;
  if (override) return override;
  const name = playbookName ?? getPlaybookContextFromEnv()?.playbook ?? "default";
  return join(projectDir, ".converge", "journal", name);
}

/**
 * Get the manifest path in the target directory.
 */
export function getTargetManifestPath(projectDir: string, playbookName?: string): string {
  return join(getTargetDir(projectDir, playbookName), "manifest.json");
}

/**
 * Get the runstate path in the target directory.
 */
export function getTargetRunstatePath(projectDir: string, playbookName?: string): string {
  return join(getTargetDir(projectDir, playbookName), "runstate.json");
}

/**
 * Get the events path in the target directory.
 */
export function getTargetEventsPath(projectDir: string, playbookName?: string): string {
  return join(getTargetDir(projectDir, playbookName), "events.jsonl");
}

/**
 * Get the task directory within the target.
 */
export function getTargetTaskDir(
  projectDir: string,
  taskId: string,
  playbookName?: string,
): string {
  return join(getTargetDir(projectDir, playbookName), "tasks", taskId);
}

/* ------------------------------------------------------------------ */
/*  Legacy execution-path accessors (kept for migration compat)        */
/* ------------------------------------------------------------------ */

/**
 * @deprecated Use getTargetDir() instead.
 */
export function getExecutionsDir(projectDir: string): string {
  return getTargetDir(projectDir);
}

/**
 * @deprecated Use getTargetDir() instead. The executionId parameter is ignored.
 */
export function getExecutionDir(projectDir: string, _executionId?: string): string {
  return getTargetDir(projectDir);
}

/**
 * @deprecated Use getTargetTaskDir() instead.
 */
export function getExecutionTaskDir(
  projectDir: string,
  _executionId: string,
  taskId: string,
): string {
  return getTargetTaskDir(projectDir, taskId);
}

/**
 * @deprecated Use getTargetManifestPath() instead.
 */
export function getExecutionManifestPath(
  projectDir: string,
  _executionId: string,
): string {
  return getTargetManifestPath(projectDir);
}

/* ------------------------------------------------------------------ */
/*  Execution scope — no-op in single-target model                     */
/* ------------------------------------------------------------------ */

/**
 * @deprecated Single-target model — no execution isolation needed.
 */
export function setExecutionScope(_executionId: string): void {
  // no-op: single target, no execution scoping
}

/**
 * @deprecated Single-target model — no execution isolation needed.
 */
export function clearExecutionScope(): void {
  // no-op: single target, no execution scoping
}

/* ------------------------------------------------------------------ */
/*  Main Structure Function                                            */
/* ------------------------------------------------------------------ */

export function getJournalStructure(
  projectDir: string,
  epicId?: string,
  taskId?: string,
  _playbookCtx?: PlaybookContext,
): JournalStructure {
  const root = join(projectDir, ".converge", "journal");
  const project = join(root, "project");

  const structure: JournalStructure = { root, project };

  if (epicId) {
    structure.epic = join(root, epicId);

    if (taskId) {
      structure.task = join(root, epicId, "tasks", taskId);

      const activeAttempt = getActiveAttemptNumber();
      if (activeAttempt) {
        const activeAttemptDir = process.env.CONVERGE_TASK_ATTEMPT_DIR;
        structure.attempt = activeAttemptDir ?? join(structure.task, "attempts", activeAttempt);
      }
    }
  }

  return structure;
}

/* ------------------------------------------------------------------ */
/*  Journal File Paths                                                  */
/* ------------------------------------------------------------------ */

const journalRoot = (projectDir: string) => join(projectDir, ".converge", "journal");

export function getJournalFilePath(
  projectDir: string,
  level: "project" | "epic" | "task",
  fileType: "gaps" | "events" | "log" | "summary" | "status",
  epicId?: string,
  taskId?: string,
): string {
  const extension =
    fileType === "gaps" ? "yml"
    : fileType === "summary" ? "md"
    : fileType === "events" ? "jsonl"
    : fileType === "status" ? "json"
    : "log";

  const filename = `${fileType}.${extension}`;
  const root = journalRoot(projectDir);

  switch (level) {
    case "project":
      return join(root, "project", filename);
    case "epic": {
      if (!epicId) throw new Error("Epic ID required for epic-level journal");
      const attempt = getActiveAttemptNumber();
      if (attempt && PER_ATTEMPT_FILE_TYPES.has(fileType)) {
        return join(root, epicId, "attempts", attempt, "logs", filename);
      }
      return join(root, epicId, filename);
    }
    case "task": {
      if (!epicId || !taskId) throw new Error("Epic ID and Task ID required for task-level journal");
      const attempt = getActiveAttemptNumber();
      if (attempt && PER_ATTEMPT_FILE_TYPES.has(fileType)) {
        return join(root, epicId, "tasks", taskId, "attempts", attempt, "logs", filename);
      }
      return join(root, epicId, "tasks", taskId, filename);
    }
  }
}

export function getEpicTasksDir(projectDir: string, epicId: string): string {
  return join(journalRoot(projectDir), epicId);
}

export function getEpicsDir(projectDir: string): string {
  const root = join(projectDir, ".converge", "journal");
  const ctx = getPlaybookContextFromEnv();
  return join(root, ctx?.playbook ?? "default");
}

export function getJournalRoot(projectDir: string): string {
  const override = process.env.CONVERGE_JOURNAL_ROOT;
  if (override) return override;
  const root = join(projectDir, ".converge", "journal");
  const name = getPlaybookContextFromEnv()?.playbook ?? "default";
  return join(root, name);
}

/* ------------------------------------------------------------------ */
/*  Playbook Scope Helpers                                              */
/* ------------------------------------------------------------------ */

export function setPlaybookScope(playbookName: string, projectDir: string): void {
  process.env.CONVERGE_PLAYBOOK = playbookName;
  process.env.CONVERGE_PLAYBOOK_DIR = join(
    projectDir, ".converge", "playbooks", playbookName,
  );
  process.env.CONVERGE_WORKSPACE = projectDir;
}

export function clearPlaybookScope(): void {
  delete process.env.CONVERGE_PLAYBOOK;
  delete process.env.CONVERGE_PLAYBOOK_DIR;
  delete process.env.CONVERGE_WORKSPACE;
  delete process.env.CONVERGE_CURRENT_TASK_PATH;
  delete process.env.CONVERGE_JOURNAL_ROOT;
  delete process.env.CONVERGE_TARGET_DIR;
}

/* ------------------------------------------------------------------ */
/*  Lifecycle Paths                                                     */
/* ------------------------------------------------------------------ */

function taskJournalDir(projectDir: string, epicId: string, taskId: string): string {
  return join(projectDir, ".converge", "journal", epicId, "tasks", taskId);
}

export function getTaskBeforeDir(
  projectDir: string,
  epicId: string,
  taskId: string,
): string {
  return join(taskJournalDir(projectDir, epicId, taskId), "before");
}

export function getTaskAfterDir(
  projectDir: string,
  epicId: string,
  taskId: string,
): string {
  return join(taskJournalDir(projectDir, epicId, taskId), "after");
}

/** @deprecated Corrections no longer exist — each retry is a new attempt. */
export function getTaskCorrectionsDir(
  projectDir: string,
  epicId: string,
  taskId: string,
): string {
  return join(taskJournalDir(projectDir, epicId, taskId), "corrections");
}

export function getAncestorJournalPaths(
  projectDir: string,
  epicId: string,
  taskId: string,
): string[] {
  const segments = taskId.split("/").filter(Boolean);
  const paths: string[] = [];
  for (let depth = 1; depth < segments.length; depth++) {
    const ancestorId = segments.slice(0, depth).join("/");
    paths.push(taskJournalDir(projectDir, epicId, ancestorId));
  }
  return paths;
}

/* ------------------------------------------------------------------ */
/*  Breadcrumbs                                                         */
/* ------------------------------------------------------------------ */

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
    breadcrumbs.push({
      level: "task",
      name: taskName || taskId,
      path: taskJournalDir(projectDir, epicId, taskId),
    });
  }

  return breadcrumbs;
}
