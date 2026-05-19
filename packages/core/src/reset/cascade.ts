/**
 * RFC 0013 — Surgical reset cascade semantics (part 1).
 *
 * Pure descendant-walk: given a DAG and a target task id, return the
 * set of tasks to reset under either `--cascade` (transitive
 * descendants including spawn children) or `--isolated` (target only;
 * descendants marked stale-input). Part 2 wires this into the CLI
 * `converge reset --cascade/--isolated/--dry-run` flow.
 */
import type { TaskDag } from "../dag/task-dag.ts";

export type ResetMode = "cascade" | "isolated";

export interface ResetPlan {
  mode: ResetMode;
  /** Tasks whose attempts/ directories will be deleted. */
  toClear: string[];
  /** Tasks marked stale-input (isolated mode only — they remain on disk). */
  toMarkStale: string[];
}

/**
 * Compute the reset plan for `targetId` under `mode`. Throws if the
 * target doesn't exist in the DAG.
 *
 * Descendants include both `depended_on_by` edges (static downstream)
 * and `spawned_children` (dynamic — children a seeded task created at
 * runtime).
 */
export function computeResetPlan(dag: TaskDag, targetId: string, mode: ResetMode): ResetPlan {
  if (!dag.nodes.has(targetId)) throw new Error(`Task not found in DAG: ${targetId}`);
  const descendants = collectDescendants(dag, targetId);
  if (mode === "cascade") {
    const ordered = [targetId, ...[...descendants].sort()];
    return { mode, toClear: ordered, toMarkStale: [] };
  }
  // isolated
  return {
    mode,
    toClear: [targetId],
    toMarkStale: [...descendants].sort(),
  };
}

function collectDescendants(dag: TaskDag, rootId: string): Set<string> {
  const out = new Set<string>();
  const stack = [rootId];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    const node = dag.nodes.get(cur);
    if (!node) continue;
    const next = [
      ...(node.depended_on_by ?? []),
      ...(node.spawned_children ?? []),
    ];
    for (const id of next) {
      if (id === rootId) continue;
      if (out.has(id)) continue;
      out.add(id);
      stack.push(id);
    }
  }
  return out;
}

/**
 * Render a `--dry-run` block listing the tasks the plan touches.
 * Caller decides whether to print it.
 */
export function formatResetPlan(plan: ResetPlan): string {
  const lines: string[] = [];
  lines.push(`Reset mode: ${plan.mode}`);
  lines.push(`Would clear ${plan.toClear.length} task${plan.toClear.length === 1 ? "" : "s"}:`);
  for (const id of plan.toClear) lines.push(`  - ${id}`);
  if (plan.toMarkStale.length > 0) {
    lines.push(`Mark stale-input (${plan.toMarkStale.length}):`);
    for (const id of plan.toMarkStale) lines.push(`  - ${id}`);
  }
  return lines.join("\n");
}
