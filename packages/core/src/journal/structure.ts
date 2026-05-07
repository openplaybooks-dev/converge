/**
 * Journal Structure
 *
 * The journal tree mirrors the playbook tree 1:1. Playbooks choose their own
 * nesting convention — some use `playbooks/{pb}/tasks/{a}/tasks/{b}/` (every
 * child wrapped in `tasks/`), others use `playbooks/{pb}/tasks/{a}/{b}/`
 * (direct child of parent). Journal must match whichever the playbook uses.
 *
 * Resolution order for `structure.task`:
 *   1. Probe the playbook source on disk for the actual layout.
 *   2. Fall back to the `tasks/{seg}/tasks/{seg}/...` default (used when the
 *      playbook source isn't available, e.g. mid-WBS-spawn).
 *
 * No `spawned/` marker ever appears — WBS writes directly to `tasks/{id}/`.
 */

import { join, relative } from "node:path";
import { existsSync } from "node:fs";
import type { PlaybookContext } from "../task/playbook/types.ts";

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

/**
 * Resolve a taskId to a path *under the playbook source*, by probing each
 * segment for `{cur}/{seg}` (direct child) or `{cur}/tasks/{seg}` (wrapped
 * child). Returns the matched relative segments (without the playbook root)
 * or `null` if probing fails mid-way.
 *
 * Used to drive the journal path so the journal matches whatever nesting
 * convention the playbook chose.
 */
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

/**
 * Get hierarchical journal directory structure.
 *
 * Mirrors the playbook tree 1:1: `journal/{pb}/[tasks/{seg}/tasks/{seg}/...]`.
 * The playbook's own root TASK.md has no `tasks/` wrapper; every child segment
 * adds one. Pure function of (playbook, taskId) — no disk probing.
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
    const playbookName = ctx?.playbook ?? "default";
    const playbookRoot = join(root, playbookName);
    const executionId = process.env.CONVERGE_EXECUTION_ID;

    // `epic` is a legacy concept. When epicId is the playbook name, the epic
    // dir IS the playbook root. Otherwise we fall back to the old
    // journal/{pb}/tasks/{epicId} layout for non-playbook callers.
    const skipEpicSegment = epicId === playbookName;
    structure.epic = skipEpicSegment
      ? playbookRoot
      : join(playbookRoot, "tasks", epicId);

    if (taskId) {
      const segments = taskId.split("/").filter(Boolean);

      // When an execution is active, task runtime state lives under
      // journal/{pb}/executions/{executionId}/tasks/{taskId}/ so each
      // execution has an isolated view of task state.
      // The task path always includes the full taskId — never drop the
      // epic prefix, because the execution directory is scoped to the
      // playbook already. Dropping would cause duplicate spawn paths.
      if (executionId) {
        structure.task = join(
          playbookRoot,
          "executions",
          executionId,
          "tasks",
          ...segments,
        );
      } else {
        // Probe the playbook source to mirror its actual nesting convention.
        const probeSegments = skipEpicSegment ? segments : [epicId, ...segments];
        const rel = resolvePlaybookRelSegments(projectDir, playbookName, probeSegments);
        if (rel) {
          const tail = skipEpicSegment ? rel : rel.slice(rel[0] === "tasks" ? 2 : 1);
          structure.task = join(structure.epic, ...tail);
        } else {
          const taskPath = segments.flatMap((s) => ["tasks", s]);
          structure.task = join(structure.epic, ...taskPath);
        }
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
 * Get the executions directory: journal/{playbook}/executions/
 * Defaults to 'default' when no playbook context.
 */
export function getExecutionsDir(projectDir: string): string {
  const root = join(projectDir, ".converge", "journal");
  const name = getPlaybookContextFromEnv()?.playbook ?? "default";
  return join(root, name, "executions");
}

/**
 * Get a specific execution directory: journal/{playbook}/executions/{executionId}/
 */
export function getExecutionDir(projectDir: string, executionId: string): string {
  return join(getExecutionsDir(projectDir), executionId);
}

/**
 * Get the journal directory for a task within an execution.
 */
export function getExecutionTaskDir(
  projectDir: string,
  executionId: string,
  taskId: string,
): string {
  return join(getExecutionDir(projectDir, executionId), "tasks", taskId);
}

/**
 * Get the manifest path within an execution directory.
 */
export function getExecutionManifestPath(
  projectDir: string,
  executionId: string,
): string {
  return join(getExecutionDir(projectDir, executionId), "manifest.json");
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
 * Set execution-scoped env var so task state is isolated under
 * journal/{playbook}/executions/{executionId}/tasks/ instead of
 * the shared journal/{playbook}/tasks/.
 */
export function setExecutionScope(executionId: string): void {
  process.env.CONVERGE_EXECUTION_ID = executionId;
}

/**
 * Clear execution scope. Call after the run finishes.
 */
export function clearExecutionScope(): void {
  delete process.env.CONVERGE_EXECUTION_ID;
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
