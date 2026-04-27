---
id: 002-playbooks-list-detail
title: Playbooks list page and detail page
dependencies:
  - 001-prune-mc-pages
  - 007-view-modes
outputs:
  - packages/converge-studio/src/app/playbooks/page.tsx
  - packages/converge-studio/src/app/playbooks/[name]/page.tsx
checks:
  - id: pages-exist
    description: List + detail page files exist
    cmd: "test -f 'packages/converge-studio/src/app/playbooks/page.tsx' && test -f 'packages/converge-studio/src/app/playbooks/[name]/page.tsx'"
  - id: typecheck
    description: Pages typecheck
    cmd: "pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq"
---

Build the playbook list page and the per-playbook detail page.

**`(studio)/playbooks/page.tsx`** — list:

- Fetches `GET /api/playbooks` (server component or client with SWR/fetch).
- Renders a table/grid: name, description, mode, task count, last-run time.
- Each row links to `/playbooks/<name>`.
- Top-right "+ New playbook" button → `/playbooks/new`.

**`(studio)/playbooks/[name]/page.tsx`** — detail:

- Fetches `GET /api/playbooks/[name]` for raw + parsed YAML.
- Layout: header (name, description, mode, key run config), tabs/panels:
  - **YAML** — Monaco editor pre-filled with raw YAML; "Save" button calls `PUT /api/playbooks/[name]` with the edited text. Show validation errors from the API.
  - **Tasks** — fetches `GET /api/playbooks/[name]/tasks`. Uses `ViewSwitcher` from `@/components/views` with allowed modes `['table', 'kanban', 'tree']` (default `tree`). Each task links to the task editor.
    - **Table mode**: columns id / title / has-children / blocking / last-checkpoint-status.
    - **Kanban mode**: columns by checkpoint status (`pending` / `running` / `completed` / `failed` / `blocked`).
    - **Tree mode**: nested by directory (parent task → child tasks via `tasks/` subdir), driven by `TaskTree`.
  - **Sessions** — fetches `GET /api/runs?playbook=[name]`; recent sessions table linking to the live session view.
- "Run" button (top-right): opens the run launcher modal (Phase 05 wires the actual API call).

**Reuse**: Mission Control's existing detail-page layout shell, tab components, table components. Do not rebuild from scratch.

**State refresh**: subscribe to `/api/watch` SSE; on `playbook-changed`/`task-added`/`session-added` events for this playbook, re-fetch the relevant panel.
