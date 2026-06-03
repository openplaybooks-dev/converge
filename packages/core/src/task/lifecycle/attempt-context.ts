/**
 * TaskAttemptContext — RFC 0048 compact per-attempt machine surface.
 *
 * Replaces the duplicated per-attempt markdown scaffolds (NEEDS.md,
 * CHECK.md, copied TASK.md, etc.) as the default AI-facing runtime
 * record. Generated markdown files remain available as rendered views,
 * but the agent no longer reads them by default.
 *
 * The on-disk filename is `attempt.json`; the type was renamed from
 * `AttemptRecord` to avoid collision with the repair-strategy
 * `AttemptRecord` in `packages/core/src/navigator/repair/types.ts:194`.
 *
 * Invariants:
 *  - one record has enough information to render the current attempt;
 *  - provider/tool logs stay referenced, not embedded;
 *  - retry hints are structured and scoped to the current failure;
 *  - the authored source `TASK.md` path is explicit when definitions
 *    need editing.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export type AttemptStatus =
  | "ready"
  | "blocked"
  | "running"
  | "success"
  | "failed"
  | "interrupted";

export interface AttemptInput {
  /** Glob or literal pattern from the task's `inputs:` frontmatter. */
  pattern: string;
  /** Total number of files that matched. May be 0 (caller treats as blocked). */
  count: number;
  /**
   * Bounded sample of resolved paths — never the full set when large.
   * Used by the prompt layer to show the agent what actually exists.
   */
  samples: string[];
}

export interface AttemptOutput {
  /** Path declared in the task's `outputs:` frontmatter. */
  path: string;
  exists: boolean;
  sizeBytes?: number;
}

export interface AttemptCheck {
  id: string;
  description: string;
  cmd: string;
  passed?: boolean;
  exitCode?: number | string;
  output?: string;
}

export type RetryHintKind =
  | "missing-output"
  | "check-failed"
  | "blocked-input"
  | "loop";

export interface RetryHint {
  kind: RetryHintKind;
  /** Path (for missing-output) or check id (for check-failed) etc. */
  target: string;
  message: string;
  /** The attempt that produced this hint (1-based). */
  sourceAttempt: number;
}

export interface AttemptLogRefs {
  /** Relative path under the attempt directory. */
  events?: string;
  /** Provider log file paths under the attempt directory. */
  provider?: string[];
  /** Tool-call index files. */
  toolIndex?: string[];
}

export interface TaskAttemptContext {
  taskId: string;
  playbook: string;
  /** 1-based attempt number. */
  attempt: number;
  status: AttemptStatus;
  /** Filesystem path to the authored `TASK.md` (relative to projectDir). */
  taskSourcePath: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  inputs: AttemptInput[];
  outputs: AttemptOutput[];
  checks: AttemptCheck[];
  skills: string[];
  retryHints: RetryHint[];
  logs: AttemptLogRefs;
}

const ATTEMPT_FILE = "attempt.json";

/**
 * Write the full context, overwriting any existing attempt.json.
 * Creates `attemptDir` (recursively) if it does not exist.
 */
export async function writeAttemptContext(
  attemptDir: string,
  ctx: TaskAttemptContext,
): Promise<void> {
  await mkdir(attemptDir, { recursive: true });
  await writeFile(
    join(attemptDir, ATTEMPT_FILE),
    JSON.stringify(ctx, null, 2) + "\n",
    "utf-8",
  );
}

/**
 * Read the current context, or null if attempt.json does not exist.
 * The reader is forward-compatible: it returns the parsed JSON as-is
 * (with the static type narrowing applied), so future schema fields
 * round-trip rather than being silently dropped.
 */
export async function readAttemptContext(
  attemptDir: string,
): Promise<TaskAttemptContext | null> {
  const filePath = join(attemptDir, ATTEMPT_FILE);
  try {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw) as TaskAttemptContext;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

/**
 * Apply a partial update to the existing context. Missing fields are
 * preserved. `retryHints` are appended to the existing list rather than
 * replaced, so callers can stream hints during a single attempt.
 *
 * If no attempt.json exists yet, a minimal stub is created with the
 * provided fields and empty arrays/lists. This is useful for the
 * first-write path inside `writeContextSnapshot()`, but most callers
 * should call `writeAttemptContext` first when they have a full record.
 */
export async function updateAttemptContext(
  attemptDir: string,
  partial: Partial<TaskAttemptContext> & { retryHints?: RetryHint[] },
): Promise<TaskAttemptContext> {
  const current = await readAttemptContext(attemptDir);
  const base: TaskAttemptContext = current ?? {
    taskId: partial.taskId ?? "",
    playbook: partial.playbook ?? "",
    attempt: partial.attempt ?? 0,
    status: partial.status ?? "ready",
    taskSourcePath: partial.taskSourcePath ?? "",
    inputs: partial.inputs ?? [],
    outputs: partial.outputs ?? [],
    checks: partial.checks ?? [],
    skills: partial.skills ?? [],
    retryHints: partial.retryHints ?? [],
    logs: partial.logs ?? {},
  };
  const next: TaskAttemptContext = {
    ...base,
    ...partial,
    retryHints: [...base.retryHints, ...(partial.retryHints ?? [])],
  };
  await writeAttemptContext(attemptDir, next);
  return next;
}
