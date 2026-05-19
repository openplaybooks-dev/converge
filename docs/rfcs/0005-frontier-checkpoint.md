# RFC 0005: Frontier checkpoint for fast resume

**Status**: Draft
**Backwards-compatible**: Yes (additive)
**Estimate**: 3-4 days

## Problem

`converge run --resume` after baby-app's mid-run kill had to walk all completed tasks (~10 cached) before re-discovering the gap. For a 9-task prefix that's fine — 30 seconds. For a 900-task prefix it's 30 minutes of cold-start before any new work begins.

## Proposal

Persist a `frontier.json` file at every checkpoint:

```json
{
  "schemaVersion": 1,
  "ts": "2026-05-19T03:14:00Z",
  "ready": [
    { "taskId": "011-education-04-analyze", "dependsOnDone": ["011-education-03-convert"] }
  ],
  "deferred": [
    { "taskId": "002-browse-05-split", "lastError": "transient: idle timeout", "retryAfterMs": 16000 }
  ],
  "running": [
    { "taskId": "012-mindfulness-02-design", "leasedBy": "worker-1", "since": "2026-05-19T03:13:42Z" }
  ],
  "totalCompleted": 145,
  "totalPending": 73
}
```

Updated atomically (write to `frontier.json.tmp`, fsync, rename) on every task state transition.

`converge run --resume` reads this file first; if valid, it skips DAG re-walk and dispatches directly from `ready[]`.

## Code-level design

- New file: `packages/core/src/journal/frontier.ts` with `readFrontier()`, `writeFrontier()`, `updateFrontier(delta)`.
- Hook into the coordinator's state-update points.
- Validate-on-read: if `totalCompleted + totalPending ≠ DAG size` or schemaVersion is wrong, fall back to full DAG walk and rebuild frontier.

## Implementation steps

1. Define the schema + writer.
2. Hook the writer into existing checkpoint events.
3. Reader path in resume code.
4. Self-healing: when read fails or is inconsistent, fall through to old behaviour, rebuild frontier afterwards.
5. Smoke test: kill a run mid-flight, resume, verify it doesn't re-walk completed tasks.

## Test plan

1. Run a 100-task synthetic playbook to completion, verify frontier matches DAG terminal state.
2. Kill mid-run at task 50, resume, assert <100ms to first new dispatch.
3. Corrupt frontier.json → assert resume falls back gracefully and rebuilds.
4. Compare resume time before/after with a 1000-task synthetic playbook: target 100x faster.

## Out of scope

- Frontier sharing across distributed workers — RFC 0007.
- Frontier-driven scheduling optimizations (priority queues, cost-aware ordering) — future RFC.
