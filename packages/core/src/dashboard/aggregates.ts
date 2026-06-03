/**
 * RFC 0011 — Live observability dashboard (part 1: aggregates).
 *
 * Ships the pure data-shaping pieces every dashboard view depends on.
 * The HTTP server + SPA client land in part 2 once RFC 0004's
 * JournalReader is wired up.
 *
 * Why aggregates-first: locking the API response shapes early lets the
 * client be developed against fixture data while the journal layer
 * catches up.
 */

export interface TaskRollup {
  taskId: string;
  status:
    | "pending"
    | "running"
    | "complete"
    | "pass"
    | "failed"
    | "deferred"
    | "seeded";
  attempts: number;
  durationMs: number;
  lastErrorClass?: "transient" | "deterministic" | "authoring";
  lastErrorMessage?: string;
}

export interface FailureCluster {
  errorClass: "transient" | "deterministic" | "authoring";
  /** First ~80 chars of the canonical reason, used as cluster key. */
  reason: string;
  count: number;
  taskIds: string[];
}

export interface CostRollup {
  totalUsd: number;
  totalCalls: number;
  totalSeconds: number;
  byModel: Array<{ model: string; calls: number; usd: number }>;
}

export interface ProviderStats {
  provider: string;
  calls: number;
  /** Latency percentiles in ms. */
  p50: number;
  p95: number;
  p99: number;
}

/* ------------------------------------------------------------------ */
/*  Failure clustering                                                */
/* ------------------------------------------------------------------ */

export interface FailureEvent {
  taskId: string;
  errorClass: "transient" | "deterministic" | "authoring";
  reason: string;
}

/**
 * Group failures by (errorClass, normalised reason). Reasons that
 * differ only in numbers (line numbers, timeout values, IDs) collapse
 * into the same cluster so "9000 attempts" and "8000 attempts" share a
 * bucket.
 */
export function clusterFailures(events: FailureEvent[]): FailureCluster[] {
  const map = new Map<string, FailureCluster>();
  for (const ev of events) {
    const norm = normaliseReason(ev.reason);
    const key = `${ev.errorClass}::${norm}`;
    let bucket = map.get(key);
    if (!bucket) {
      bucket = {
        errorClass: ev.errorClass,
        reason: norm.slice(0, 80),
        count: 0,
        taskIds: [],
      };
      map.set(key, bucket);
    }
    bucket.count++;
    if (!bucket.taskIds.includes(ev.taskId)) bucket.taskIds.push(ev.taskId);
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

function normaliseReason(s: string): string {
  return (
    s
      // Collapse runs of digits to "N" so "600000ms" and "300000ms" collapse to
      // "Nms" — word boundary doesn't fire between digits and trailing letters,
      // so use a permissive digit match instead.
      .replace(/\d+/g, "N")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/* ------------------------------------------------------------------ */
/*  Latency percentiles                                               */
/* ------------------------------------------------------------------ */

/**
 * Compute p50/p95/p99 over an array of latency samples in ms. Uses
 * nearest-rank — samples are sorted, the percentile is at index
 * `ceil(p/100 * n) - 1`. Returns zeros for an empty input.
 */
export function percentiles(samplesMs: number[]): {
  p50: number;
  p95: number;
  p99: number;
} {
  if (samplesMs.length === 0) return { p50: 0, p95: 0, p99: 0 };
  const sorted = [...samplesMs].sort((a, b) => a - b);
  const at = (p: number) =>
    sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)];
  return { p50: at(50), p95: at(95), p99: at(99) };
}

/* ------------------------------------------------------------------ */
/*  Cost rollup                                                       */
/* ------------------------------------------------------------------ */

export interface CostSample {
  model: string;
  usd: number;
  seconds: number;
  calls: number;
}

export function rollupCost(samples: CostSample[]): CostRollup {
  const byModelMap = new Map<string, { calls: number; usd: number }>();
  let totalUsd = 0;
  let totalCalls = 0;
  let totalSeconds = 0;
  for (const s of samples) {
    totalUsd += s.usd;
    totalCalls += s.calls;
    totalSeconds += s.seconds;
    const bucket = byModelMap.get(s.model) ?? { calls: 0, usd: 0 };
    bucket.calls += s.calls;
    bucket.usd += s.usd;
    byModelMap.set(s.model, bucket);
  }
  const byModel = [...byModelMap.entries()]
    .map(([model, v]) => ({ model, ...v }))
    .sort((a, b) => b.usd - a.usd);
  return {
    totalUsd: round2(totalUsd),
    totalCalls,
    totalSeconds,
    byModel: byModel.map((b) => ({
      model: b.model,
      calls: b.calls,
      usd: round2(b.usd),
    })),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
