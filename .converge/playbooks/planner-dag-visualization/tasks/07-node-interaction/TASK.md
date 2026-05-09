---
id: 07-node-interaction
title: Phase 07 — Node click opens TaskRunDrawer
blocking: true
inputs:
  - apps/planner/src/components/DagFlow.tsx
  - apps/planner/src/components/PlaybookTab.tsx
  - apps/planner/src/components/TaskRunDrawer.tsx
outputs:
  - apps/planner/src/components/DagFlow.tsx (verified)
  - apps/planner/src/components/PlaybookTab.tsx (verified)
checks:
  - id: dag-flow-has-onnodeclick
    cmd: "grep -q 'onNodeClick' apps/planner/src/components/DagFlow.tsx"
    description: DagFlow exposes onNodeClick prop
  - id: dag-flow-onclick-calls-callback
    cmd: "grep -qE '(handleNodeClick|onNodeClick\\?\\()' apps/planner/src/components/DagFlow.tsx"
    description: DagFlow calls onNodeClick when a node is clicked
  - id: execution-view-passes-onselecttask
    cmd: "grep -q 'onSelectTask' apps/planner/src/components/ExecutionView.tsx"
    description: ExecutionView passes onSelectTask to DagFlow
  - id: typecheck-clean
    cmd: "cd apps/planner && npx tsc --noEmit --pretty 2>&1 | head -30"
    description: TypeScript compiles without errors
tags:
  - phase
children:
  - 001-verify-drawer-integration
---

Ensure clicking a DAG node opens the TaskRunDrawer with the selected task's
detailed journal log. This should follow the exact same pattern as the
existing tree view: click a leaf node → set drawerTaskId → fetch task
details → open drawer.

## Verification

The integration should already work via the existing callback chain:

1. `DagFlow` receives `onNodeClick` prop → calls it with `node.id` on click
2. `ExecutionView` passes `onSelectTask` as `onNodeClick`
3. `PlaybookTab` handles `onSelectTask` by calling `setDrawerTaskId(taskId)`
4. `drawerTaskId` triggers the useEffect that fetches task details and opens `TaskRunDrawer`
5. `selectedNodeId` = `drawerTaskId` ensures the clicked node stays highlighted

## What to check

1. **DagFlow.tsx**: Verify `handleNodeClick` calls `onNodeClick?.(node.id)` on node click
2. **ExecutionView.tsx**: Verify `onNodeClick={onSelectTask}` is passed to DagFlow
3. **PlaybookTab.tsx**: Verify the existing drawer flow still works — `onSelectTask` → `setDrawerTaskId` → fetch → open drawer
4. **TaskRunDrawer.tsx**: No changes needed — it works with task ID regardless of whether it came from tree or DAG

## If gaps exist

If DagFlow doesn't yet have node click handling, add it:
```typescript
const handleNodeClick = useCallback(
  (_event: React.MouseEvent, node: Node) => {
    onNodeClick?.(node.id)
  },
  [onNodeClick],
)
```

And pass `<ReactFlow onNodeClick={handleNodeClick} ...>`
