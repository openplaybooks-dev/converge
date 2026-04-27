# Task: 03-rebind-ui/004-rebind-dashboard-page

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