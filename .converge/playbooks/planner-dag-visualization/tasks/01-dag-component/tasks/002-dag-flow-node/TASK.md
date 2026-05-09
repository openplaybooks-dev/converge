---
id: 002-dag-flow-node
title: Create DagFlowNode.tsx — custom React Flow node component
inputs:
  - apps/planner/src/lib/dag-layout.ts
  - apps/planner/src/components/RunStateTree.tsx
outputs:
  - apps/planner/src/components/DagFlowNode.tsx
checks:
  - id: dag-flow-node-exists
    cmd: "test -f apps/planner/src/components/DagFlowNode.tsx"
    description: DagFlowNode.tsx exists
  - id: dag-flow-node-has-handles
    cmd: "grep -q 'Handle' apps/planner/src/components/DagFlowNode.tsx"
    description: DagFlowNode uses React Flow Handles
  - id: dag-flow-node-handles-status
    cmd: "grep -qE '(status|runStatus)' apps/planner/src/components/DagFlowNode.tsx"
    description: DagFlowNode renders status-aware styling
  - id: dag-flow-node-handles-dag-type
    cmd: "grep -q 'dag_type' apps/planner/src/components/DagFlowNode.tsx"
    description: DagFlowNode shows diverge/converge distinction
  - id: dag-flow-node-handles-selected
    cmd: "grep -q 'selected' apps/planner/src/components/DagFlowNode.tsx"
    description: DagFlowNode supports selected state
  - id: dag-flow-node-matches-tree-colors
    cmd: "grep -qE '(emerald|rose|yellow|primary)' apps/planner/src/components/DagFlowNode.tsx"
    description: DagFlowNode uses same status color palette as RunStateTree
---

Create the custom node component at `apps/planner/src/components/DagFlowNode.tsx`.

```typescript
'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { cn } from '@/lib/utils'

export interface DagFlowNodeData {
  label: string
  state: 'concrete' | 'expected' | 'frontier'
  runStatus?: 'pending' | 'running' | 'pass' | 'error' | 'skipped'
  dag_type?: 'normal' | 'diverge' | 'converge'
  tags?: string[]
  checks?: string[]
  inputs?: string[]
  outputs?: string[]
}

// Match RunStateTree.tsx status color scheme exactly
const STATUS_DOT: Record<string, string> = {
  pending: 'bg-muted-foreground/30',
  running: 'bg-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.18)]',
  pass: 'bg-emerald-500',
  error: 'bg-rose-500',
  skipped: 'bg-yellow-500/70',
}

const STATUS_BORDER: Record<string, string> = {
  pending: 'border-border/60',
  running: 'border-primary/40 shadow-[0_8px_32px_-12px_hsl(var(--primary)/0.45)]',
  pass: 'border-emerald-500/30',
  error: 'border-rose-500/40',
  skipped: 'border-yellow-500/30',
}

const STATE_BORDER: Record<string, string> = {
  concrete: 'border-border/80',
  expected: 'border-border/50 border-dashed',
  frontier: 'border-border/30 border-dotted',
}

function DagFlowNodeComponent({ data, selected }: NodeProps) {
  const d = data as unknown as DagFlowNodeData
  const status = d.runStatus || 'pending'
  const hasStatus = !!d.runStatus

  const borderCls = hasStatus ? STATUS_BORDER[status] || STATUS_BORDER.pending : STATE_BORDER[d.state] || STATE_BORDER.concrete
  const dotCls = STATUS_DOT[status] || STATUS_DOT.pending

  const isConverge = d.dag_type === 'converge'
  const isDiverge = d.dag_type === 'diverge'

  return (
    <div
      className={cn(
        'relative rounded-xl border bg-card/80 backdrop-blur-sm px-3 py-2.5 min-w-[200px] max-w-[280px] transition-colors',
        borderCls,
        isConverge && 'border-l-[3px] border-l-violet-500',
        isDiverge && 'border-l-[3px] border-l-cyan-500',
        selected && 'ring-2 ring-primary/50',
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground/40 !w-2.5 !h-2.5" />
      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground/40 !w-2.5 !h-2.5" />

      {/* Status dot (left) */}
      <span
        className={cn(
          'absolute -left-[5px] top-3 h-2.5 w-2.5 rounded-full ring-2 ring-background',
          dotCls,
          status === 'running' && 'animate-pulse',
        )}
        aria-hidden
      />

      {/* Dag type badge */}
      {(isDiverge || isConverge) && (
        <div className="mb-1.5">
          <span className={cn(
            'inline-block text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-full',
            isDiverge ? 'bg-cyan-500/15 text-cyan-400' : 'bg-violet-500/15 text-violet-400',
          )}>
            {d.dag_type}
          </span>
        </div>
      )}

      {/* Task ID */}
      <h4 className="text-[11px] font-semibold font-mono tracking-tight truncate text-foreground/90">
        {d.label}
      </h4>

      {/* Meta chips */}
      <div className="mt-1.5 flex flex-wrap gap-1">
        {(d.tags?.length ?? 0) > 0 && <Chip label="tags" value={d.tags!.length} />}
        {(d.checks?.length ?? 0) > 0 && <Chip label="checks" value={d.checks!.length} />}
        {(d.inputs?.length ?? 0) > 0 && <Chip label="in" value={d.inputs!.length} />}
        {(d.outputs?.length ?? 0) > 0 && <Chip label="out" value={d.outputs!.length} />}
      </div>
    </div>
  )
}

function Chip({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-mono bg-muted/50 text-foreground/70 ring-1 ring-border/50">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
  )
}

export const DagFlowNode = memo(DagFlowNodeComponent)
```

Implementation notes:
1. Use `memo` for performance — React Flow re-renders nodes frequently
2. `data` is cast to `DagFlowNodeData` since xyflow types are generic
3. Left accent stripe (3px border-left) for diverge (cyan) and converge (violet)
4. Status dot matches RunStateTree colors exactly
5. Dashed border for expected nodes, dotted for frontier
6. Selected state: `ring-2 ring-primary/50`
7. Handles at top (target) and bottom (source) for top-to-bottom DAG layout
8. Mini chip row shows metadata counts
