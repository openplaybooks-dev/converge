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
import { existsSync } from "node:fs";
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
  const structure = getJournalStructure(projectDir, epicId, taskId);
  return join(structure.task!, "attempts", padded);
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
/*  Epic Root Resolution                                               */
/* ------------------------------------------------------------------ */

function getEpicsRoot(journalRoot: string, ctx?: PlaybookContext): string {
  const name = ctx?.playbook ?? "default";
  return join(journalRoot, name, "tasks");
}

function resolvePlaybookRelSegments(
  projectDir: string,
  playbookName: string,
  taskSegments: string[],
): string[] | null {
  const playbookRoot = join(projectDir, ".converge", "playbooks", playbookName);
  if (!existsSync(playbookRoot)) return null;

  const out: string[] = [];
  let cur = playbookRoot;
  for (const seg of taskSegments) {
    const wrapped = join(cur, "tasks", seg);
    const direct = join(cur, seg);
    if (existsSync(wrapped)) {
      out.push("tasks", seg);
      cur = wrapped;
    } else if (existsSync(direct)) {
      out.push(seg);
      cur = direct;
    } else {
      return null;
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Main Structure Function                                            */
/* ------------------------------------------------------------------ */

export function getJournalStructure(
  projectDir: string,
  epicId?: string,
  taskId?: string,
  playbookCtx?: PlaybookContext,
): JournalStructure {
  const root = join(projectDir, ".converge", "journal");
  const project = join(root, "project");

  const structure: JournalStructure = { root, project };
  const ctx = playbookCtx ?? getPlaybookContextFromEnv();

  if (epicId) {
    const playbookName = ctx?.playbook ?? "default";
    const playbookRoot = join(root, playbookName);

    const skipEpicSegment = epicId === playbookName;
    structure.epic = skipEpicSegment
      ? playbookRoot
      : join(playbookRoot, "tasks", epicId);

    if (taskId) {
      const segments = taskId.split("/").filter(Boolean);

      // Task forensics live under the journal — mirrors playbook nesting.
      // Use target for the new single-target model via getTargetTaskDir().
      const probeSegments = skipEpicSegment ? segments : [epicId, ...segments];
      const rel = resolvePlaybookRelSegments(projectDir, playbookName, probeSegments);
      if (rel) {
        const tail = skipEpicSegment ? rel : rel.slice(rel[0] === "tasks" ? 2 : 1);
        structure.task = join(structure.epic, ...tail);
      } else {
        const taskPath = segments.flatMap((s) => ["tasks", s]);
        structure.task = join(structure.epic, ...taskPath);
      }

      // Populate attempt dir if active
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

/* ------------------------------------------------------------------ */
/*  Journal File Paths                                                  */
/* ------------------------------------------------------------------ */

export function getJournalFilePath(
  projectDir: string,
  level: "project" | "epic" | "task",
  fileType: "gaps" | "events" | "log" | "summary" | "status",
  epicId?: string,
  taskId?: string,
): string {
  const structure = getJournalStructure(projectDir, epicId, taskId);

  const extension =
    fileType === "gaps" ? "yml"
    : fileType === "summary" ? "md"
    : fileType === "events" ? "jsonl"
    : fileType === "status" ? "json"
    : "log";

  const filename = `${fileType}.${extension}`;

  switch (level) {
    case "project":
      return join(structure.project, filename);
    case "epic":
      if (!structure.epic) throw new Error("Epic ID required for epic-level journal");
      return join(structure.epic, filename);
    case "task":
      if (!structure.task) throw new Error("Epic ID and Task ID required for task-level journal");
      if (structure.attempt && PER_ATTEMPT_FILE_TYPES.has(fileType)) {
        return join(structure.attempt, "logs", filename);
      }
      return join(structure.task, filename);
  }
}

export function getEpicTasksDir(projectDir: string, epicId: string): string {
  const structure = getJournalStructure(projectDir, epicId);
  return structure.epic!;
}

export function getEpicsDir(projectDir: string): string {
  const root = join(projectDir, ".converge", "journal");
  const ctx = getPlaybookContextFromEnv();
  return getEpicsRoot(root, ctx);
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
  process.env.CONVERGE_JOURNAL_ROOT = join(
    projectDir, ".converge", "journal", playbookName,
  );
  process.env.CONVERGE_TARGET_DIR = join(
    projectDir, ".converge", "journal", playbookName,
  );
}

export function clearPlaybookScope(): void {
  delete process.env.CONVERGE_PLAYBOOK;
  delete process.env.CONVERGE_PLAYBOOK_DIR;
  delete process.env.CONVERGE_JOURNAL_ROOT;
  delete process.env.CONVERGE_TARGET_DIR;
}

/* ------------------------------------------------------------------ */
/*  Lifecycle Paths                                                     */
/* ------------------------------------------------------------------ */

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
    const structure = getJournalStructure(projectDir, epicId, taskId);
    breadcrumbs.push({
      level: "task",
      name: taskName || taskId,
      path: structure.task!,
    });
  }

  return breadcrumbs;
}
