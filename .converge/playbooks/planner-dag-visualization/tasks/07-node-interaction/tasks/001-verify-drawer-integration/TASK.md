---
id: 001-verify-drawer-integration
title: Verify node-click-to-drawer integration end-to-end
inputs:
  - apps/planner/src/components/DagFlow.tsx
  - apps/planner/src/components/ExecutionView.tsx
  - apps/planner/src/components/PlaybookTab.tsx
  - apps/planner/src/components/TaskRunDrawer.tsx
checks:
  - id: dag-flow-calls-onnodeclick
    cmd: "grep -qE '(handleNodeClick|onNodeClick)' apps/planner/src/components/DagFlow.tsx"
    description: DagFlow handles node clicks and calls onNodeClick
  - id: execution-view-wires-onnodeclick
    cmd: "grep -q 'onSelectTask' apps/planner/src/components/ExecutionView.tsx"
    description: ExecutionView passes onSelectTask to DagFlow as onNodeClick
  - id: task-run-drawer-exists
    cmd: "test -f apps/planner/src/components/TaskRunDrawer.tsx"
    description: TaskRunDrawer component exists
---

Trace the full click-to-drawer flow and verify every link:

### 1. DagFlow.tsx
Read the current file. Verify or add:
```typescript
const handleNodeClick = useCallback(
  (_event: React.MouseEvent, node: Node) => {
    onNodeClick?.(node.id)
  },
  [onNodeClick],
)
```
And on `<ReactFlow>`: `onNodeClick={handleNodeClick}`

### 2. ExecutionView.tsx  
Read the current file. Verify the DagFlow receives `onSelectTask`:
```tsx
<DagFlow onNodeClick={onSelectTask} ... />
```

### 3. PlaybookTab.tsx
Read the current file. Verify the existing drawer flow:
- `onSelectTask` prop to ExecutionView is `(taskId) => setDrawerTaskId(taskId)`
- `useEffect` watches `drawerTaskId`, fetches task details, opens drawer

### 4. TaskRunDrawer.tsx
Read to confirm it works with a task ID string. No changes expected.

### 5. Test
- Start a run on any playbook
- Switch to DAG view
- Click a node
- Verify the TaskRunDrawer opens with that task's details
- Close the drawer, click a different node
- Verify the drawer updates to the new task
