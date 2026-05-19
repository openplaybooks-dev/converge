/**
 * RFC 0005 — Frontier checkpoint for fast resume (part 1).
 *
 * Persists the DAG's runtime frontier (ready / running / deferred sets +
 * totals) so `converge run --resume` can skip the full DAG re-walk and
 * dispatch directly. Part 1 ships the pure schema + frontier-derivation
 * function + validation. Part 2 (separate PR) wires this into the
 * coordinator's state-update points and the resume path.
 */
import type { TaskDag } from "../dag/task-dag.ts";

export const FRONTIER_SCHEMA_VERSION = 1;

export interface FrontierReady {
  taskId: string;
  dependsOnDone: string[];
}

export interface FrontierDeferred {
  taskId: string;
  lastError: string;
  retryAfterMs?: number;
}

export interface FrontierRunning {
  taskId: string;
  leasedBy: string;
  since: string;
}

export interface Frontier {
  schemaVersion: typeof FRONTIER_SCHEMA_VERSION;
  ts: string;
  ready: FrontierReady[];
  deferred: FrontierDeferred[];
  running: FrontierRunning[];
  totalCompleted: number;
  totalPending: number;
}

/**
 * Derive the current frontier from a live DAG. Pure — no I/O.
 *
 * `ready[]` is the set of nodes whose deps are all done (delegates to
 * `dag.getReady()` so we stay consistent with the runner's own ready
 * decision). `running[]` is whatever the caller passes — the DAG itself
 * doesn't track lease ownership, so we accept it as input.
 */
export function deriveFrontier(args: {
  dag: TaskDag;
  ts?: Date;
  running?: FrontierRunning[];
  deferred?: FrontierDeferred[];
}): Frontier {
  const ts = (args.ts ?? new Date()).toISOString();
  const ready: FrontierReady[] = args.dag.getReady().map((n) => ({
    taskId: n.id,
    dependsOnDone: [...n.depends_on],
  }));
  let totalCompleted = 0;
  let totalPending = 0;
  for (const n of args.dag.nodes.values()) {
    if (n.status === "complete" || n.status === "pass") totalCompleted++;
    else if (n.status === "pending" || n.status === "ready" || n.status === "seeded") totalPending++;
  }
  return {
    schemaVersion: FRONTIER_SCHEMA_VERSION,
    ts,
    ready,
    deferred: args.deferred ?? [],
    running: args.running ?? [],
    totalCompleted,
    totalPending,
  };
}

/**
 * Validate a parsed frontier against a live DAG. Returns null if the
 * frontier is usable, or a reason string explaining why it must be
 * rebuilt. The resume path falls back to a full DAG walk when this
 * returns non-null.
 */
export function validateFrontier(frontier: unknown, dag: TaskDag): string | null {
  if (!frontier || typeof frontier !== "object") return "frontier is not an object";
  const f = frontier as Partial<Frontier>;
  if (f.schemaVersion !== FRONTIER_SCHEMA_VERSION) {
    return `schemaVersion mismatch: expected ${FRONTIER_SCHEMA_VERSION}, got ${String(f.schemaVersion)}`;
  }
  if (typeof f.ts !== "string") return "missing ts";
  if (!Array.isArray(f.ready) || !Array.isArray(f.deferred) || !Array.isArray(f.running)) {
    return "ready/deferred/running must each be arrays";
  }
  if (typeof f.totalCompleted !== "number" || typeof f.totalPending !== "number") {
    return "totals must be numbers";
  }
  const expectedSize = countDagNodes(dag);
  if (f.totalCompleted + f.totalPending > expectedSize) {
    return `totals (${f.totalCompleted}+${f.totalPending}) exceed DAG size (${expectedSize})`;
  }
  for (const entry of f.ready) {
    if (!entry || typeof entry.taskId !== "string" || !dag.nodes.has(entry.taskId)) {
      return `ready entry references unknown task: ${JSON.stringify(entry)}`;
    }
  }
  for (const entry of f.running) {
    if (!entry || typeof entry.taskId !== "string" || !dag.nodes.has(entry.taskId)) {
      return `running entry references unknown task: ${JSON.stringify(entry)}`;
    }
  }
  for (const entry of f.deferred) {
    if (!entry || typeof entry.taskId !== "string" || !dag.nodes.has(entry.taskId)) {
      return `deferred entry references unknown task: ${JSON.stringify(entry)}`;
    }
  }
  return null;
}

function countDagNodes(dag: TaskDag): number {
  let n = 0;
  for (const _ of dag.nodes) n++;
  return n;
}
