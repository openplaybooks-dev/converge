---
id: 001-dag-flow-component
title: Create DagFlow.tsx — React Flow container component
inputs:
  - apps/planner/src/lib/dag-layout.ts
outputs:
  - apps/planner/src/components/DagFlow.tsx
checks:
  - id: dag-flow-exists
    cmd: "test -f apps/planner/src/components/DagFlow.tsx"
    description: DagFlow.tsx file exists
  - id: dag-flow-imports-reactflow
    cmd: "grep -q 'from.*@xyflow/react' apps/planner/src/components/DagFlow.tsx"
    description: DagFlow imports from @xyflow/react
  - id: dag-flow-registers-node-types
    cmd: "grep -q 'nodeTypes' apps/planner/src/components/DagFlow.tsx"
    description: DagFlow registers custom nodeTypes
  - id: dag-flow-uses-minimap
    cmd: "grep -q 'MiniMap' apps/planner/src/components/DagFlow.tsx"
    description: DagFlow includes MiniMap
  - id: dag-flow-uses-controls
    cmd: "grep -q 'Controls' apps/planner/src/components/DagFlow.tsx"
    description: DagFlow includes Controls
  - id: dag-flow-handles-empty
    cmd: "grep -qE '(empty|no tasks|no nodes)' apps/planner/src/components/DagFlow.tsx"
    description: DagFlow has an empty state
---

Create the DagFlow React Flow container component at `apps/planner/src/components/DagFlow.tsx`.

```typescript
'use client'

import { useCallback, useEffect, useRef } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesInitialized,
  useReactFlow,
  type Node,
  type Edge,
} from '@xyflow/react'
import { DagFlowNode } from './DagFlowNode'
import { cn } from '@/lib/utils'

const nodeTypes = { convergeTask: DagFlowNode }

const defaultEdgeOptions = {
  type: 'smoothstep' as const,
  style: { stroke: 'hsl(var(--muted-foreground) / 0.4))', strokeWidth: 1.5 },
}

interface DagFlowProps {
  nodes: Node[]
  edges: Edge[]
  onNodeClick?: (nodeId: string) => void
  selectedNodeId?: string | null
  isLive?: boolean
  className?: string
}

function DagFlowInner({ nodes, edges, onNodeClick, selectedNodeId, isLive, className }: DagFlowProps) {
  const { fitView } = useReactFlow()
  const initialized = useNodesInitialized()
  const prevLengthRef = useRef(nodes.length)

  useEffect(() => {
    if (initialized) {
      const timer = setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50)
      return () => clearTimeout(timer)
    }
  }, [initialized, nodes.length])

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      onNodeClick?.(node.id)
    },
    [onNodeClick],
  )

  if (nodes.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-full min-h-[400px] text-xs text-muted-foreground', className)}>
        No tasks to display. Run a playbook to populate the DAG.
      </div>
    )
  }

  const edgeOptions = isLive
    ? { ...defaultEdgeOptions, animated: true }
    : defaultEdgeOptions

  return (
    <div className={cn('h-full min-h-[400px] w-full', className)}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={edgeOptions}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="hsl(var(--muted-foreground) / 0.15)" />
        <Controls
          position="bottom-left"
          className="[&>button]:bg-card [&>button]:border-border/60 [&>button]:text-foreground"
        />
        <MiniMap
          position="bottom-right"
          className="!bg-surface-1 !border-border/60"
          maskColor="hsl(var(--background) / 0.6)"
          nodeColor={(node) => {
            const status = node.data?.runStatus
            if (status === 'running') return 'hsl(var(--primary))'
            if (status === 'error') return 'hsl(350 89% 60%)'
            if (status === 'pass') return 'hsl(160 84% 39%)'
            if (status === 'skipped') return 'hsl(45 93% 47%)'
            return 'hsl(var(--muted-foreground))'
          }}
        />
      </ReactFlow>
    </div>
  )
}

export function DagFlow(props: DagFlowProps) {
  return (
    <ReactFlowProvider>
      <DagFlowInner {...props} />
    </ReactFlowProvider>
  )
}
```

Implementation notes:
1. `DagFlowInner` is the inner component that uses `useReactFlow()` — it must be inside `ReactFlowProvider`
2. `DagFlow` (exported) wraps with `ReactFlowProvider`
3. `fitView` fires on initial mount and when node count changes
4. Empty state renders a centered placeholder
5. Minimap nodeColor function maps runStatus to the same palette as RunStateTree
6. Controls and MiniMap are themed using Tailwind classes matching the void design system
