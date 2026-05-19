/**
 * RFC 0004 — Partitioned, indexed journal (part 1: pure helpers).
 *
 * Today the entire run lands in a single `events.jsonl`. At thousand-task
 * scale that file is 100-500 MB and every `inspect` / `tail` / replay
 * does a linear scan.
 *
 * Part 1 ships the pure-function pieces the rotation + index layer will
 * depend on: partition-key derivation, rotation decision, and the
 * `JournalEvent` / index-row schemas. Filesystem rotation, SQLite index
 * write, and the migration tool land in part 2 once the data shapes are
 * locked in.
 */

/* ------------------------------------------------------------------ */
/*  Shapes                                                            */
/* ------------------------------------------------------------------ */

/**
 * A single journal event as written to `active.jsonl`. Mirrors the
 * envelope existing writers already use; new fields (`errorClass`) are
 * optional so old readers keep working.
 */
export interface JournalEvent {
  /** Wall-clock ms epoch when the event was produced. */
  ts: number;
  /** Task id this event belongs to (or `__system__` for cross-task events). */
  taskId: string;
  /** Event type — e.g. `TASK_ATTEMPT_START`, `TOOL_CALL`, `CLAUDEFN_FAILED`. */
  eventType: string;
  /** Optional RFC 0003 error classification for failure events. */
  errorClass?: "transient" | "deterministic" | "authoring";
  /** Arbitrary payload — varies by eventType. */
  payload?: unknown;
}

/**
 * One row in the SQLite index for fast `byTask` / `byType` / `byErrorClass`
 * lookups. The index is rebuildable from archives, so we store offsets
 * (start + length) into the partition file, not the event payload itself.
 */
export interface JournalIndexRow {
  ts: number;
  taskId: string;
  eventType: string;
  errorClass?: "transient" | "deterministic" | "authoring";
  partition: string;
  offset: number;
  length: number;
}

/* ------------------------------------------------------------------ */
/*  Partition derivation                                              */
/* ------------------------------------------------------------------ */

/**
 * Compute the archive partition filename an event belongs in based on
 * its UTC date. Format: `YYYY-MM-DD.jsonl`.
 *
 * The currently-writing partition is always `active.jsonl`. This
 * function returns the *archive* name that `active.jsonl` will become
 * when rotated.
 */
export function partitionForTimestamp(ts: number): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) throw new Error(`partitionForTimestamp: invalid ts ${ts}`);
  const y = d.getUTCFullYear().toString().padStart(4, "0");
  const m = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = d.getUTCDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}.jsonl`;
}

/* ------------------------------------------------------------------ */
/*  Rotation policy                                                   */
/* ------------------------------------------------------------------ */

export interface RotationPolicy {
  /** Hard size ceiling for `active.jsonl` in bytes. Default 50 MB. */
  maxBytes: number;
  /** Rotate at UTC date boundary too. Default true. */
  rotateDaily: boolean;
}

export const DEFAULT_ROTATION_POLICY: RotationPolicy = {
  maxBytes: 50 * 1024 * 1024,
  rotateDaily: true,
};

/**
 * Decide whether `active.jsonl` should rotate before writing the next
 * event. Pure function so the rotation logic is unit-testable without
 * touching the filesystem.
 *
 *   shouldRotate({ activeBytes: 60_000_000, ... }) → true (over cap)
 *   shouldRotate({ activeFirstTs: <yesterday>, nextEventTs: <today>, rotateDaily: true }) → true
 *
 * Returns `false` when `activeFirstTs` is null (file empty — first
 * write goes into `active.jsonl` regardless).
 */
export function shouldRotate(args: {
  activeBytes: number;
  activeFirstTs: number | null;
  nextEventTs: number;
  policy?: RotationPolicy;
}): boolean {
  const policy = args.policy ?? DEFAULT_ROTATION_POLICY;
  if (args.activeFirstTs == null) return false;
  if (args.activeBytes >= policy.maxBytes) return true;
  if (policy.rotateDaily) {
    const before = partitionForTimestamp(args.activeFirstTs);
    const after = partitionForTimestamp(args.nextEventTs);
    if (before !== after) return true;
  }
  return false;
}

/* ------------------------------------------------------------------ */
/*  Index row construction                                            */
/* ------------------------------------------------------------------ */

/**
 * Build an index row for an event that has just been appended to
 * `partition` at byte offset `offset` with serialised length `length`.
 *
 * Caller is responsible for computing the offset (file size before the
 * write) and length (`Buffer.byteLength(JSON.stringify(event) + "\n")`).
 */
export function indexRow(
  event: JournalEvent,
  partition: string,
  offset: number,
  length: number,
): JournalIndexRow {
  if (offset < 0) throw new Error(`indexRow: negative offset ${offset}`);
  if (length <= 0) throw new Error(`indexRow: non-positive length ${length}`);
  const row: JournalIndexRow = {
    ts: event.ts,
    taskId: event.taskId,
    eventType: event.eventType,
    partition,
    offset,
    length,
  };
  if (event.errorClass) row.errorClass = event.errorClass;
  return row;
}
