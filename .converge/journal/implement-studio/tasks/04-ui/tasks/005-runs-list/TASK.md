---
id: 005-runs-list
title: Runs list page
dependencies:
  - 001-prune-mc-pages
  - 007-view-modes
outputs:
  - packages/converge-studio/src/app/runs/page.tsx
checks:
  - id: page-exists
    description: Runs list page exists
    cmd: "test -f 'packages/converge-studio/src/app/runs/page.tsx'"
  - id: typecheck
    description: Page typechecks
    cmd: "pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq"
---

Build the global runs list page (sessions across all playbooks).

**Layout**:

- Top filter bar: playbook selector, status filter (running / completed / failed), date range (optional).
- `ViewSwitcher` from `@/components/views` with allowed modes `['table', 'kanban']` (default `table`).
  - **Table mode**: columns playbook, sessionId (truncated), startTime, duration (or "running"), iterations, status. A "Live" indicator pill on running rows.
  - **Kanban mode**: columns by status (`running` / `completed` / `failed`). Each card shows playbook, sessionId, startTime, iterations.
- Each card/row links to `/runs/<playbook>/<sessionId>`.

**Data flow**:

- Initial: `GET /api/runs` (or with `?playbook=` if a filter is set).
- Subscribe to `/api/watch` SSE; on `session-added`/`session-changed` events, re-fetch (or merge incrementally for performance later).

**Reuse**: Mission Control's existing runs/sessions table component if present.

**No data state**: if no sessions exist for any playbook, show an empty state with copy "No sessions yet — run a playbook from its detail page to start one."
