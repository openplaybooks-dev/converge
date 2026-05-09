---
id: 03-manifest-mode
title: Phase 03 — Wire manifest-only DAG view for plan review
blocking: true
inputs:
  - apps/planner/src/components/DagFlow.tsx
  - apps/planner/src/lib/use-dag-data.ts
outputs:
  - apps/planner/src/components/ManifestDagView.tsx
  - apps/planner/src/components/PlaybookPlanContract.tsx (modified)
checks:
  - id: manifest-dag-view-exists
    cmd: "test -f apps/planner/src/components/ManifestDagView.tsx"
    description: ManifestDagView.tsx exists
  - id: manifest-dag-view-uses-dag-data
    cmd: "grep -q 'useDagData' apps/planner/src/components/ManifestDagView.tsx"
    description: Component uses useDagData hook
  - id: manifest-dag-view-uses-dag-flow
    cmd: "grep -q 'DagFlow' apps/planner/src/components/ManifestDagView.tsx"
    description: Component renders DagFlow
  - id: manifest-dag-view-imported-in-plan
    cmd: "grep -q 'ManifestDagView' apps/planner/src/components/PlaybookPlanContract.tsx"
    description: PlaybookPlanContract imports ManifestDagView
  - id: typecheck-clean
    cmd: "cd apps/planner && npx tsc --noEmit --pretty 2>&1 | head -30"
    description: TypeScript compiles without errors
tags:
  - phase
children:
  - 001-manifest-dag-view
  - 002-integrate-into-plan-view
---

Wire the DAG to render the compiled plan (manifest only, no execution status).

## ManifestDagView component

A client component that:
- Accepts `playbookName` and optional `onSelectTask`/`selectedTaskId` props
- Fetches manifest from `/api/playbooks/<name>/manifest` on mount
- Passes manifest through `useDagData` with `runstate: null`
- Renders `<DagFlow>` with the resulting nodes/edges
- Shows loading spinner while fetching
- Shows empty state if no playbook selected or no manifest exists
- Nodes show `state`-based coloring (concrete/expected/frontier) without runStatus overlay

## Integration into PlaybookPlanContract

Add a view toggle to `PlaybookPlanContract.tsx`:
- Add `dagView: boolean` state (default false)
- Add a toggle button in the header area (Workflow icon for DAG, ListTree for tree)
- When `dagView` is true, render `<ManifestDagView playbookName={...} />` instead of the plan contract editor
- The existing PlanContract (Tasks/Tests/Seeds tabs) remains the default view

## Convergence

Verify:
- Selecting a playbook that has a compiled manifest renders its DAG
- Selecting a playbook without a manifest shows the empty state
- Toggling between plan editor and DAG view works
- The toggle button is subtle and matches the existing UI style
