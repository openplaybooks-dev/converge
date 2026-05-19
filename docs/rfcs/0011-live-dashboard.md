# RFC 0011: Live observability dashboard

**Status**: Draft
**Backwards-compatible**: Yes (additive)
**Estimate**: 2 weeks

## Problem

For multi-day runs the developer needs at-a-glance answers:

- Which tasks have failed and why? Cluster by error class.
- What's the burn rate ($, tokens) so far?
- Which task is the bottleneck (slowest median completion)?
- What's the DAG layer currently executing?
- Which provider's calls are slowest right now?

Today: tail events.jsonl + custom grep. Doesn't scale.

## Proposal

A `converge ui` subcommand that boots a small local HTTP server reading from the journal (RFC 0004) and serves a live single-page dashboard.

### Views

1. **Gantt** — task timeline, color-coded by state, zoomable.
2. **DAG graph** — node-graph with live status; click for forensics.
3. **Failure clusters** — group by error class + message pattern; show count.
4. **Cost & tokens** — running totals, per-task heat map.
5. **Provider stats** — calls / latency p50/p95/p99 by provider + model.
6. **Task drilldown** — every event for a single task, prior attempts, FEEDBACK.md, retry-context.json.

### Implementation

- Server: Node/Bun, ~500 LOC, reads from JournalReader (RFC 0004).
- Client: lightweight HTML + a tiny SPA. Probably Lit or HTMX rather than React — keep it scrappy and dependency-light.
- Live updates via Server-Sent Events from `journal/active.jsonl`.

## Implementation steps

1. RFC 0004 must land first (need the JournalReader API).
2. Server skeleton + `/api/tasks`, `/api/events`, `/api/sse`.
3. One view at a time, in priority order: gantt → failures → cost.
4. Polish: dark mode, keyboard shortcuts, deep links.

## Test plan

1. Boot with a recorded journal → all views render.
2. Live mode: run a synthetic playbook, observe SSE events updating views.
3. Browser perf: 10k events should not lock up the UI (virtualization on tables).

## Out of scope

- Authentication (the server binds to localhost by default).
- Multi-playbook view (one playbook at a time).
- Editing tasks from the UI (read-only v1).
