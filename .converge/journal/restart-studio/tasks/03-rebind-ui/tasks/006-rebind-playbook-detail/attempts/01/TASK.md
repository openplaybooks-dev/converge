# Task: 03-rebind-ui/006-rebind-playbook-detail

Clone MC's `src/components/panels/agent-detail-tabs.tsx` → `src/components/playbook-detail-tabs.tsx` and rebind:

**Tabs:** Overview / Tasks / Runs / Config (replace MC's 7 agent tabs)

**Overview:** description, run config (mode/maxIterations/maxDuration), last-run summary (timestamp, duration, status pill, iterations). MetricCard + SignalPill + StatRow primitives.

**Tasks:** ViewSwitcher (tree default) over `views/TaskTree`, `views/TableView`, `views/KanbanBoard`. Click → `/playbooks/<name>/tasks/<taskPath>`.

**Runs:** TableView filtered by playbook. "Trigger run" button → POST `/api/run`.

**Config:** Monaco YAML editor. Initial: `fetch('/api/playbooks/<name>')`. Save: `PUT /api/playbooks/<name>` with new YAML. Theme follows `useTheme()`.

**`/playbooks/[name]/page.tsx`** mounts `<PlaybookDetailTabs playbook={playbook} />`. Server-render the playbook fetch.

**Keep:** MC's tab nav visual treatment, sticky tab on scroll, status pill in header.