import type { RunState } from "@/lib/status-style";

export interface LensTask {
  id: string;
  title?: string;
  blocking?: boolean;
  dependencies: string[];
}

/**
 * Compute the longest path (in edges) from any root to each task. Tasks with
 * no in-edges are level 0; their direct dependents are level 1; and so on.
 * Used by the tree and gantt lenses to lay out a DAG vertically.
 */
export function topoLevels(tasks: LensTask[]): Map<string, number> {
  const ids = new Set(tasks.map((t) => t.id));
  const indeg = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const t of tasks) {
    indeg.set(t.id, 0);
    adj.set(t.id, []);
  }
  for (const t of tasks) {
    for (const dep of t.dependencies) {
      if (!ids.has(dep)) continue;
      adj.get(dep)!.push(t.id);
      indeg.set(t.id, (indeg.get(t.id) ?? 0) + 1);
    }
  }

  const level = new Map<string, number>();
  const queue: string[] = [];
  for (const [id, d] of indeg) {
    if (d === 0) {
      level.set(id, 0);
      queue.push(id);
    }
  }
  while (queue.length > 0) {
    const cur = queue.shift()!;
    const curLevel = level.get(cur) ?? 0;
    for (const next of adj.get(cur) ?? []) {
      const proposed = curLevel + 1;
      if ((level.get(next) ?? -1) < proposed) level.set(next, proposed);
      indeg.set(next, (indeg.get(next) ?? 0) - 1);
      if (indeg.get(next) === 0) queue.push(next);
    }
  }
  // Cycle nodes never had indeg drop to 0 — pin them at the deepest seen +1
  // so they still render somewhere instead of disappearing silently.
  const fallback = (Math.max(0, ...level.values()) || 0) + 1;
  for (const t of tasks) {
    if (!level.has(t.id)) level.set(t.id, fallback);
  }
  return level;
}

/**
 * Group tasks by the lens-friendly RunState. Pending is the default when no
 * status entry exists yet.
 */
export function groupByStatus(
  tasks: LensTask[],
  statuses: Record<string, { state: RunState } | null>,
): Record<RunState, LensTask[]> {
  const buckets: Record<RunState, LensTask[]> = {
    pending: [],
    running: [],
    complete: [],
    failed: [],
    skipped: [],
  };
  for (const t of tasks) {
    const state = statuses[t.id]?.state ?? "pending";
    buckets[state].push(t);
  }
  return buckets;
}

export interface GanttBounds {
  startMs: number;
  endMs: number;
  spanMs: number;
}

/**
 * Compute the wall-clock window the Gantt should cover. Returns null when no
 * task has any timing data — the lens then renders an empty state.
 */
export function ganttBounds(
  statuses: Record<
    string,
    { startedAt?: string; completedAt?: string } | null
  >,
  now: number = Date.now(),
): GanttBounds | null {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const status of Object.values(statuses)) {
    if (!status) continue;
    if (status.startedAt) {
      const t = Date.parse(status.startedAt);
      if (Number.isFinite(t)) min = Math.min(min, t);
    }
    if (status.completedAt) {
      const t = Date.parse(status.completedAt);
      if (Number.isFinite(t)) max = Math.max(max, t);
    }
  }
  if (!Number.isFinite(min)) return null;
  if (!Number.isFinite(max) || max <= min) max = Math.max(min + 1000, now);
  return { startMs: min, endMs: max, spanMs: max - min };
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = s / 60;
  if (m < 60) return `${m.toFixed(1)}m`;
  const h = m / 60;
  return `${h.toFixed(1)}h`;
}
