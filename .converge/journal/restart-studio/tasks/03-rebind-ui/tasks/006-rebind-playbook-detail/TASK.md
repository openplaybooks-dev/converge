---
id: 006-rebind-playbook-detail
title: Rebind playbook detail page using agent-detail-tabs as visual template
outputs:
  - packages/studio/src/app/playbooks/[name]/page.tsx
  - packages/studio/src/components/playbook-detail-tabs.tsx
checks:
  - id: detail-page-exists
    description: /playbooks/[name]/page.tsx exists
    cmd: "test -f 'packages/studio/src/app/playbooks/[name]/page.tsx'"
  - id: detail-tabs-component-exists
    description: playbook-detail-tabs.tsx exists with 4 tabs
    cmd: "test -f packages/studio/src/components/playbook-detail-tabs.tsx && grep -q 'Overview' packages/studio/src/components/playbook-detail-tabs.tsx && grep -q 'Tasks' packages/studio/src/components/playbook-detail-tabs.tsx && grep -q 'Runs' packages/studio/src/components/playbook-detail-tabs.tsx && grep -q 'Config' packages/studio/src/components/playbook-detail-tabs.tsx"
---

Clone MC's `src/components/panels/agent-detail-tabs.tsx` → `src/components/playbook-detail-tabs.tsx` and rebind:

**Tabs:** Overview / Tasks / Runs / Config (replace MC's 7 agent tabs)

**Overview:** description, run config (mode/maxIterations/maxDuration), last-run summary (timestamp, duration, status pill, iterations). MetricCard + SignalPill + StatRow primitives.

**Tasks:** ViewSwitcher (tree default) over `views/TaskTree`, `views/TableView`, `views/KanbanBoard`. Click → `/playbooks/<name>/tasks/<taskPath>`.

**Runs:** TableView filtered by playbook. "Trigger run" button → POST `/api/run`.

**Config:** Monaco YAML editor. Initial: `fetch('/api/playbooks/<name>')`. Save: `PUT /api/playbooks/<name>` with new YAML. Theme follows `useTheme()`.

**`/playbooks/[name]/page.tsx`** mounts `<PlaybookDetailTabs playbook={playbook} />`. Server-render the playbook fetch.

**Keep:** MC's tab nav visual treatment, sticky tab on scroll, status pill in header.
