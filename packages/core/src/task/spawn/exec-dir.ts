/**
 * RFC 0021 — Per-task execution directory.
 *
 * Every task gets a stable directory the runtime guarantees exists
 * before the body runs. It's the home for everything per-task and
 * per-attempt-stable: spawn manifests, retry context, evidence files,
 * arbitrary scratch the body wants to keep across attempts.
 *
 *   .converge/journal/<playbook>/tasks/<task-id>/exec/
 *
 * Surfaces:
 *   - Env var:           CONVERGE_TASK_DIR=<absolute path>
 *   - Auto-injected var: vars.exec_dir = <workspace-relative path>
 *
 * The directory is empty on first creation but **persists across attempts
 * within the same task**, so a partially built manifest survives a body
 * crash and the repair attempt can patch it instead of regenerating.
 */
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

/**
 * Workspace-relative exec dir path. Used as the `vars.exec_dir`
 * value injected into rendered child TASK.md files.
 */
export function execDirFor(playbook: string, taskId: string): string {
  return `.converge/journal/${playbook}/tasks/${taskId}/exec`;
}

/**
 * Create the per-task exec dir if it doesn't already exist; return the
 * absolute path. Idempotent and crash-safe — the directory persists
 * across attempts on purpose, so partial work the body wrote on a
 * previous attempt survives into the next.
 */
export async function ensureExecDir(
  workspace: string,
  playbook: string,
  taskId: string,
): Promise<string> {
  const abs = join(workspace, execDirFor(playbook, taskId));
  await mkdir(abs, { recursive: true });
  return abs;
}
