/**
 * RFC 0020 — Container convergence detection.
 *
 * When a task with `seed: { mode: cli }` has spawned its children, the
 * runner marks it `seeded` and lets it sit blocked until the children
 * complete. At that point the parent should converge to `complete` exactly
 * once.
 *
 * The earlier implementation re-queued the parent to `pending` for an
 * "assembly" pass. The seed-preflight then short-circuited with
 * `done: success`, the post-task block re-set status to `seeded`, and this
 * loop fired again — an infinite re-lease cycle (observed at 9000+
 * attempts in a real run before the fix).
 *
 * The convergence rule is now: any `seeded` node whose union of
 * `spawned_children` and `children` is non-empty and entirely
 * `complete` / `pass` transitions directly to `complete`.
 *
 * This module is intentionally tiny and side-effect-light: it accepts an
 * optional `onConverge` callback for the runner to persist the transition
 * (e.g. `resultsMgr.markComplete`). Tests exercise the helper directly.
 */
import type { TaskDag } from "../dag/task-dag.ts";

export interface ConvergeSeededParentsOptions {
  /**
   * Invoked once per newly-converged parent in the order they are
   * detected. The runner uses this to persist `markComplete` to the
   * results manager. Errors from the callback propagate to the caller.
   */
  onConverge?: (id: string) => void | Promise<void>;
}

/**
 * Walk the DAG and mark every `seeded` parent whose children are all
 * done as `complete`. Returns the list of newly-converged parent IDs in
 * iteration order. Idempotent: re-running on a converged DAG returns
 * an empty list.
 */
export async function convergeSeededParents(
  dag: TaskDag,
  opts: ConvergeSeededParentsOptions = {},
): Promise<string[]> {
  const converged: string[] = [];
  for (const [nid, n] of dag.nodes) {
    if (n.status !== "seeded") continue;
    const allChildIds = [
      ...(n.spawned_children ?? []),
      ...(n.children ?? []),
    ];
    if (allChildIds.length === 0) continue;
    const allDone = allChildIds.every((cid) => {
      const child = dag.nodes.get(cid);
      return child != null && (child.status === "complete" || child.status === "pass");
    });
    if (!allDone) continue;

    dag.markComplete(nid);
    converged.push(nid);
    if (opts.onConverge) await opts.onConverge(nid);
  }
  return converged;
}
