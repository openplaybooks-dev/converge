---
id: 011-logs-panel
title: Session events log viewer
outputs:
  - packages/converge-studio/src/app/runs/[playbook]/[sessionId]/logs
  - packages/converge-studio/src/app/api/runs/[playbook]/[sessionId]/logs
checks:
  - id: logs-page-exists
    description: Logs page exists under run detail
    cmd: "test -f 'packages/converge-studio/src/app/runs/[playbook]/[sessionId]/logs/page.tsx'"
  - id: logs-api-exists
    description: Logs API route exists and returns JSON
    cmd: "test -f 'packages/converge-studio/src/app/api/runs/[playbook]/[sessionId]/logs/route.ts'"
  - id: typecheck-passes
    cmd: "pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq"
---

The live session view (`006-live-session-view`) renders gantt + journal in real time. That's the "watch a run" use case. This task adds the "look back at what happened" use case: a flat, filterable, searchable table of every event the session emitted.

**Reuse:** `src/lib/converge-adapter/sessions.ts` already exposes `readSession(playbook, sessionId)`. Extend (don't duplicate) it with `readSessionEvents(playbook, sessionId)` that reads the session's event log file from `.converge/journal/<playbook>/<sessionId>/events.jsonl` (or whatever the on-disk shape is — verify against an existing journal).

**Add `src/app/api/runs/[playbook]/[sessionId]/logs/route.ts`** — GET returns `{ items: SessionEvent[] }`. Optional query params: `?level=error|warn|info`, `?since=<iso>`, `?limit=N` (default 500, max 5000).

**Add `src/app/runs/[playbook]/[sessionId]/logs/page.tsx`** — server component that fetches the API route and renders:
- A filter bar: level dropdown, free-text search (client-side filter over the loaded set), refresh button.
- A virtualized table (use `<table>` with overflow-y-auto for now; reach for `react-window` only if rows exceed 1000).
- Columns: timestamp · level · taskPath · message. Wrap long messages, don't truncate.
- A link back to the live session view.

**Add a tab/link** from `src/app/runs/[playbook]/[sessionId]/page.tsx` to `/runs/[playbook]/[sessionId]/logs` so users can pivot from the live view to the log view.

**Verification:**
- Pick a real session under `.converge/journal/` and load `/runs/<playbook>/<sessionId>/logs`. The events table shows real events.
- Filter by level reduces the row count.
- The API returns `{ items: [] }` (empty array, 200) for a session that has no events yet — never 500.
