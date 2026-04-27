---
id: 004-rebind-dashboard-page
title: Rebind dashboard.tsx to render the four converge widgets
dependencies:
  - 003-build-converge-widgets
outputs:
  - packages/studio/src/components/dashboard/dashboard.tsx
checks:
  - id: dashboard-imports-converge-widgets
    description: dashboard.tsx imports all four converge widgets
    cmd: "grep -q 'recent-runs-widget' packages/studio/src/components/dashboard/dashboard.tsx && grep -q 'playbook-health-widget' packages/studio/src/components/dashboard/dashboard.tsx && grep -q 'live-activity-widget' packages/studio/src/components/dashboard/dashboard.tsx && grep -q 'quick-actions-widget' packages/studio/src/components/dashboard/dashboard.tsx"
---

Edit `src/components/dashboard/dashboard.tsx`. **Keep MC's grid layout, density, padding, responsive breakpoints.** Replace its widget imports with the four from leaf 003.

Suggested 2x2 grid:
```
┌─────────────────────┬─────────────────────┐
│  PlaybookHealth     │  RecentRuns         │
├─────────────────────┼─────────────────────┤
│  LiveActivity       │  QuickActions       │
└─────────────────────┴─────────────────────┘
```

If MC's dashboard imports MC widgets we'll delete in Phase 04 (fleet-status, agent-network, system-health, etc.), drop those imports.
