import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export type TaskStatusState =
  | "pending"
  | "running"
  | "complete"
  | "failed"
  | "skipped";

interface CoreTaskStatus {
  taskId?: string;
  status?: string;
  attempt?: number;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  error?: string;
}

/**
 * Read status.json directly from the deterministic on-disk path the runner
 * writes for non-keyed playbooks: `.converge/journal/<playbook>/tasks/<id>/status.json`.
 *
 * `core/journal`'s `readTaskStatus()` does the same lookup but routes through
 * an env-var-driven resolver (`CONVERGE_PLAYBOOK`) — that's wrong for a server
 * reading many playbooks, so we read the file directly. Keyed playbooks store
 * statuses under `<name>-<key>` per run; surfacing those is M5b's job.
 */
async function readStatusFile(
  projectDir: string,
  playbookName: string,
  taskId: string,
): Promise<CoreTaskStatus | null> {
  const path = join(
    projectDir,
    ".converge",
    "journal",
    playbookName,
    "tasks",
    taskId,
    "status.json",
  );
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as CoreTaskStatus;
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "ENOENT"
    ) {
      return null;
    }
    return null;
  }
}

export interface TaskRunStatus {
  taskId: string;
  state: TaskStatusState;
  attempt?: number;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  error?: string;
}

/**
 * Read per-task status for a non-keyed playbook (epicId == playbook name).
 * Returns null entries for tasks that have no status.json yet.
 *
 * For keyed playbooks (where the journal writes under `<name>-<key>` per
 * run), this lookup misses; we render those as "pending" and surface live
 * runs in M5b.
 */
export async function readPlaybookStatuses(
  projectDir: string,
  playbookName: string,
  taskIds: string[],
): Promise<Record<string, TaskRunStatus | null>> {
  const entries = await Promise.all(
    taskIds.map(async (id): Promise<[string, TaskRunStatus | null]> => {
      const status = await readStatusFile(projectDir, playbookName, id);
      return [id, status ? toTaskRunStatus(id, status) : null];
    }),
  );
  return Object.fromEntries(entries);
}

const VALID_STATES = new Set<TaskStatusState>([
  "pending",
  "running",
  "complete",
  "failed",
  "skipped",
]);

function toTaskRunStatus(
  taskId: string,
  s: CoreTaskStatus,
): TaskRunStatus {
  const candidate = (s.status ?? "pending") as TaskStatusState;
  const state = VALID_STATES.has(candidate) ? candidate : "pending";
  return {
    taskId: s.taskId ?? taskId,
    state,
    attempt: s.attempt,
    startedAt: s.startedAt,
    completedAt: s.completedAt,
    durationMs: s.durationMs,
    error: s.error,
  };
}
