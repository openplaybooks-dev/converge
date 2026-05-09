---
id: 001-execution-view-toggle
title: Add DAG/tree view toggle to ExecutionView
inputs:
  - apps/planner/src/components/ExecutionView.tsx
  - apps/planner/src/components/DagFlow.tsx
  - apps/planner/src/lib/use-dag-data.ts
outputs:
  - apps/planner/src/components/ExecutionView.tsx (modified)
checks:
  - id: execution-view-has-toggle
    cmd: "grep -qE '(viewMode|toggle)' apps/planner/src/components/ExecutionView.tsx"
    description: ExecutionView has view mode state and toggle
  - id: execution-view-imports-dag-flow
    cmd: "grep -q 'DagFlow' apps/planner/src/components/ExecutionView.tsx"
    description: ExecutionView imports DagFlow
  - id: execution-view-imports-use-dag-data
    cmd: "grep -q 'useDagData' apps/planner/src/components/ExecutionView.tsx"
    description: ExecutionView imports useDagData
  - id: execution-view-keeps-tree
    cmd: "grep -q 'RunStateTree' apps/planner/src/components/ExecutionView.tsx"
    description: ExecutionView still imports and renders RunStateTree
---

Read the current `apps/planner/src/components/ExecutionView.tsx` first. Then modify it:

### Changes

1. **Add imports:**
```typescript
import { useState } from 'react'
import { ListTree, Workflow } from 'lucide-react'
import { DagFlow } from './DagFlow'
import { useDagData } from '@/lib/use-dag-data'
```

2. **Add `manifest` prop:**
```typescript
interface ExecutionViewProps {
  dag: RunStateDag | null
  manifest?: any  // NEW — for DAG view
  onSelectTask?: (taskId: string) => void
  selectedTaskId?: string | null
}
```

3. **Add view mode state:**
```typescript
const [viewMode, setViewMode] = useState<'tree' | 'dag'>('tree')
```

4. **Compute DAG data:**
```typescript
const { nodes: dagNodes, edges: dagEdges } = useDagData({
  manifest: manifest ?? null,
  runstate: dag ? { nodes: dag.nodes, edges: dag.edges } : null,
})
```

5. **Add toggle button row** before the view content:
```tsx
<div className="flex items-center justify-between mb-2">
  {/* existing banner goes here, shortened */}

  <div className="flex items-center gap-0.5 bg-muted/30 rounded-lg p-0.5">
    <button
      onClick={() => setViewMode('tree')}
      className={cn(
        'p-1.5 rounded-md transition-colors',
        viewMode === 'tree' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
      )}
      title="Tree view"
    >
      <ListTree className="w-3.5 h-3.5" />
    </button>
    <button
      onClick={() => setViewMode('dag')}
      className={cn(
        'p-1.5 rounded-md transition-colors',
        viewMode === 'dag' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
      )}
      title="DAG view"
    >
      <Workflow className="w-3.5 h-3.5" />
    </button>
  </div>
</div>
```

6. **Conditional rendering:**
```tsx
{viewMode === 'tree' ? (
  <RunStateTree dag={dag} onSelectTask={onSelectTask} selectedTaskId={selectedTaskId} />
) : (
  <div className="h-[500px] w-full rounded-xl border border-border/60 overflow-hidden">
    <DagFlow
      nodes={dagNodes}
      edges={dagEdges}
      onNodeClick={onSelectTask}
      selectedNodeId={selectedTaskId}
      isLive={dag !== null}
    />
  </div>
)}
```

### Style notes
- The toggle is a segmented button (two icons in a rounded pill), matching dbt-style switchers
- Default is 'tree' so existing behavior is preserved
- The selectTask callback is shared between both views
- The banner text can stay as-is or be shortened
