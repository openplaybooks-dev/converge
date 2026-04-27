# Task: 03-rebind-ui/005-rebind-runs-pages

Build the two `/runs` pages. Reuse MC's polished panels: log-viewer-panel, activity-feed-panel, gantt visual treatment.

**`/runs/page.tsx`** (list):
- ViewSwitcher: `table` (default) | `kanban` (grouped by status)
- TableView columns: playbook, sessionId, startTime, duration, iterations, status pill
- KanbanBoard columns: running / completed / failed
- Live indicator pill on running rows (subscribe to `/api/events`)
- Empty state: `<EmptyStateLaunchpad>` with copy "No runs yet"

**`/runs/[playbook]/[sessionId]/page.tsx`** (live session view):
- Header: playbook · sessionId · status pill · iters
- ViewSwitcher: gantt | tree | table
- Gantt mode → embed `views/SessionGantt`
- Tree mode → `views/TaskTree`
- Table mode → `views/TableView`
- Side panel: `<LogViewerPanel>` + `<ActivityFeedPanel>` (rebind both to subscribe to `/api/runs/<playbook>/<sessionId>/stream` SSE)
- Resizable split-pane (use MC's `terminal/split-pane-layout.tsx`)

Replace MC's WebSocket subscriptions in those panels with `EventSource('/api/runs/...')`.