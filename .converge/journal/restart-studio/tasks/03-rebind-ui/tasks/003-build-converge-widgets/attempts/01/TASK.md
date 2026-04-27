# Task: 03-rebind-ui/003-build-converge-widgets

Build four converge-native widgets that reuse MC's widget primitives (`src/components/dashboard/widget-primitives.tsx` — MetricCard, SignalPill, HealthRow, StatRow, LogRow, QuickAction).

**1. RecentRunsWidget**
- `listSessions({ limit: 10 })` from converge-adapter
- Each row: `StatRow` with playbook + sessionId (truncated) + age
- Status indicator: `SignalPill` colored by session status
- Each row → `/runs/<playbook>/<sessionId>`

**2. PlaybookHealthWidget**
- `listPlaybooks()` + per-playbook `lastSession`
- Per playbook: name, total tasks, completion %, last-run-time, status pill
- Use `HealthRow` primitive

**3. LiveActivityWidget**
- `useConvergeEvents()` SSE → 40-event buffer
- Pulsing green dot at top, color-coded events (info/warn/error)
- Use `LogRow` primitive
- Idle state ("All quiet") if no events in 60s

**4. QuickActionsWidget**
- Static tiles using `QuickAction` primitive
- "New playbook" → `/playbooks/new`
- "View all runs" → `/runs`
- "Open settings" → `/settings`
- "Documentation" → external link to converge docs

All four import from `../widget-primitives.tsx`.