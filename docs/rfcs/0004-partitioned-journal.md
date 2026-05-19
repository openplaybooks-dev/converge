# RFC 0004: Partitioned, indexed journal

**Status**: Draft
**Backwards-compatible**: No — journal format change
**Estimate**: 1 week

## Problem

A 200-task run in `examples/baby-app` produced ~4000 events in `events.jsonl`: 1168 TOOL_RESULT + 1168 TOOL_CALL + 595 TASK_ATTEMPT_START + ... At thousand-task scale this scales to 25k-100k events / 100-500 MB per run. Every `converge inspect`, `tail`, `grep`, and journal-replay does a linear scan.

Worse: the runner re-reads `runstate.json` and `tasks.jsonl` on every coordinator pass. On a multi-day run with thousands of tasks, this turns into measurable overhead per layer.

## Current state

- Single file: `.converge/journal/<playbook>/events.jsonl`. Append-only.
- `inventory/<playbook>/tasks.jsonl` — full snapshot rewritten on each update? Need to confirm but suspect yes.
- No index. Lookups by task ID require full scan.

## Proposal

### 1. Partition events

```
.converge/journal/<playbook>/
├── events/
│   ├── active.jsonl              # current write target, fsync'd per event
│   ├── 2026-05-18.jsonl          # archived (read-only)
│   ├── 2026-05-19.jsonl
│   └── by-task/
│       ├── 03-build-screens.jsonl  # hard-linked subset
│       └── ...
├── events.index                  # SQLite or LMDB: {taskId, offset, byteRange}
└── runstate.json
```

- `active.jsonl` rotates daily or when it exceeds a size threshold (50 MB default).
- Archive partitions are read-only; OS page cache handles fast access.
- `by-task/` is optional: hard links into archives, useful for `converge inspect <task>` O(1) reads.

### 2. Index

Embedded SQLite `events.index` with one row per event:

```sql
CREATE TABLE events (
  ts INTEGER NOT NULL,
  taskId TEXT NOT NULL,
  eventType TEXT NOT NULL,
  errorClass TEXT,
  partition TEXT NOT NULL,
  offset INTEGER NOT NULL,
  length INTEGER NOT NULL
);
CREATE INDEX idx_task ON events(taskId, ts);
CREATE INDEX idx_type ON events(eventType, ts);
CREATE INDEX idx_class ON events(errorClass);
```

Index is rebuilt on demand from archives if missing/corrupt; not authoritative.

### 3. Journal API

Replace direct file reads in `packages/core/src/journal/` with an API:

```ts
interface JournalReader {
  byTask(taskId: string, opts?: { limit?: number; since?: number }): AsyncIterable<JournalEvent>;
  byType(type: string): AsyncIterable<JournalEvent>;
  byErrorClass(cls: ErrorClass): AsyncIterable<JournalEvent>;
  range(from: number, to: number): AsyncIterable<JournalEvent>;
  latest(taskId: string): Promise<JournalEvent | null>;
}
```

All consumers (`converge inspect`, `converge show`, `converge status`, dashboard) go through this. No more raw `fs.readFile` on events.jsonl.

## Migration

- Provide `converge migrate journal <playbook>` that converts old single-file events.jsonl to the partitioned shape and builds the index.
- Print a one-time deprecation warning on read if old shape detected; auto-migrate if `--auto-migrate` flag set on next `converge run`.
- Old `tail -F events.jsonl` workflows break. Provide `converge tail <playbook>` as the replacement (reads `active.jsonl`).

## Implementation steps

1. Define schemas (`JournalEvent`, partition/offset shape).
2. Write the rotation logic in `packages/core/src/journal/event-writer.ts`.
3. Add SQLite dependency (use `better-sqlite3` for sync API — fits the existing journal pattern).
4. Build the reader API.
5. Migrate every consumer in the repo to use the API.
6. Add `converge migrate journal`.
7. Add `converge tail` for the live stream.

## Test plan

1. Write 100k synthetic events → verify rotation kicks in at threshold.
2. Read by task ID with 100k events → assert sub-millisecond response.
3. Crash mid-write → verify index can be rebuilt from archives.
4. Migration: take a recorded baby-app events.jsonl, run migrate, verify all queries return same data.

## Out of scope

- Distributed journal (multiple writers) — that's RFC 0007 distributed-workers concern.
- Compression (could come later via gzip rotation).
