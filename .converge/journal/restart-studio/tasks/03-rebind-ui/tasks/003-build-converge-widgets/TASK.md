---
id: 003-build-converge-widgets
title: Build 4 converge dashboard widgets
outputs:
  - packages/studio/src/components/dashboard/widgets/recent-runs-widget.tsx
  - packages/studio/src/components/dashboard/widgets/playbook-health-widget.tsx
  - packages/studio/src/components/dashboard/widgets/live-activity-widget.tsx
  - packages/studio/src/components/dashboard/widgets/quick-actions-widget.tsx
checks:
  - id: all-four-widgets-exist
    description: All four converge widgets exist
    cmd: "test -f packages/studio/src/components/dashboard/widgets/recent-runs-widget.tsx && test -f packages/studio/src/components/dashboard/widgets/playbook-health-widget.tsx && test -f packages/studio/src/components/dashboard/widgets/live-activity-widget.tsx && test -f packages/studio/src/components/dashboard/widgets/quick-actions-widget.tsx"
  - id: widgets-use-converge-data
    description: Widgets reference converge data hooks or APIs
    cmd: "grep -ql 'listSessions\\|listPlaybooks\\|useConvergeEvents\\|/api/runs\\|/api/playbooks\\|/api/events' packages/studio/src/components/dashboard/widgets/recent-runs-widget.tsx packages/studio/src/components/dashboard/widgets/playbook-health-widget.tsx packages/studio/src/components/dashboard/widgets/live-activity-widget.tsx 2>/dev/null"
---

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
