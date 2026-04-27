# Task: 04-ui/006-live-session-view

Build the live (or historical) session view.

**Layout**:

- Header: playbook, sessionId, status pill, start/end times, iteration count.
- Main view: `ViewSwitcher` from `@/components/views` with allowed modes `['gantt', 'tree', 'table']` (default `gantt`).
  - **Gantt mode**: `SessionGantt` from `@/components/views`. Rows = task paths derived from session events; attempts derived from `TASK_ATTEMPT_START` / `TASK_ATTEMPT_END` events. Live sessions extend ongoing bars to "now".
  - **Tree mode**: `TaskTree` showing the playbook's task hierarchy with each node's status reflecting this session's progress (resolved from events: pending / running / completed / failed).
  - **Table mode**: flat table of tasks with this session's per-task status, attempt count, duration.
- Side panel (always visible regardless of mode):
  - **Journal stream** — virtualized list of events; auto-scroll on new events; filter by `eventType`.
  - **Task panel** — clicking a task in any view (gantt bar, tree node, or table row) shows that task's checkpoint + the event subset for that task.

**Data flow**:

1. On mount, `GET /api/runs/[playbook]/[sessionId]` for metadata.
2. `GET /api/runs/[playbook]/[sessionId]/events?limit=500` for initial backlog.
3. If session is `running`, subscribe to `/api/runs/[playbook]/[sessionId]/stream` SSE for live events; on disconnect, send `Last-Event-ID` to resume.
4. If session is `completed`/`failed`, no SSE — just paginate through events with the events endpoint.

**Status detection**: a session is "running" if `metadata.endTime` is unset. Re-fetch metadata on a 5s interval as a safety net (in case the watcher misses a write).

**Reuse**: Mission Control's existing log/timeline components and virtualization (react-virtual or similar). Do not reimplement.

**Performance**: large sessions can have thousands of events. Use virtual scrolling on the journal stream and limit gantt rendering to a windowed time range with zoom/pan.