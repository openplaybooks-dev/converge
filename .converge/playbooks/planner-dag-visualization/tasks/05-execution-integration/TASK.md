---
id: 05-execution-integration
title: Phase 05 — Integrate DAG view into ExecutionView with toggle
blocking: true
inputs:
  - apps/planner/src/components/DagFlow.tsx
  - apps/planner/src/lib/use-dag-data.ts
  - apps/planner/src/components/ExecutionView.tsx
  - apps/planner/src/components/PlaybookTab.tsx
outputs:
  - apps/planner/src/components/ExecutionView.tsx (modified)
  - apps/planner/src/components/PlaybookTab.tsx (modified)
checks:
  - id: execution-view-has-toggle
    cmd: "grep -qE '(viewMode|toggle.*dag|toggle.*tree)' apps/planner/src/components/ExecutionView.tsx"
    description: ExecutionView has view mode state and toggle
  - id: execution-view-imports-dag-flow
    cmd: "grep -q 'DagFlow' apps/planner/src/components/ExecutionView.tsx"
    description: ExecutionView imports DagFlow
  - id: execution-view-keeps-tree
    cmd: "grep -q 'RunStateTree' apps/planner/src/components/ExecutionView.tsx"
    description: ExecutionView still renders RunStateTree in tree mode
  - id: playbook-tab-fetches-manifest
    cmd: "grep -q '/manifest' apps/planner/src/components/PlaybookTab.tsx"
    description: PlaybookTab fetches manifest for selected playbook
  - id: playbook-tab-passes-manifest
    cmd: "grep -q 'manifest' apps/planner/src/components/PlaybookTab.tsx"
    description: PlaybookTab passes manifest prop to ExecutionView
  - id: typecheck-clean
    cmd: "cd apps/planner && npx tsc --noEmit --pretty 2>&1 | head -30"
    description: TypeScript compiles without errors
tags:
  - phase
children:
  - 001-execution-view-toggle
  - 002-playbook-tab-data-flow
---

Modify ExecutionView to support both tree and DAG views with a toggle button,
and wire the manifest data flow from PlaybookTab.

## ExecutionView changes

- Add `viewMode: 'tree' | 'dag'` state, default `'tree'`
- Add a toggle button row above the view content (Workflow icon for DAG, ListTree icon for tree)
- When viewMode is 'tree', render existing RunStateTree as before
- When viewMode is 'dag', compute DAG data via `useDagData` and render DagFlow
- Accept new `manifest` prop
- Pass through `onSelectTask` and `selectedTaskId` to both views
- DAG view gets a taller container: `h-[500px]`

## PlaybookTab changes

- Add `manifest` state and fetch from `/api/playbooks/<name>/manifest` when selected playbook changes
- Pass `manifest` to `<ExecutionView>` as a new prop
- Clear manifest when selectedPlaybook becomes null

## Convergence

Verify:
1. Selecting a playbook with an active run shows the runstate statuses in both tree and DAG views
2. The toggle switches between views without losing selected task state
3. Toggle defaults to tree (existing behavior preserved)
4. Both views handle the empty/null case correctly
