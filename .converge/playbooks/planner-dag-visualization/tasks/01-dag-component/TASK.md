---
id: 01-dag-component
title: Phase 01 — Create DagFlow.tsx and DagFlowNode.tsx React Flow components
blocking: true
inputs:
  - apps/planner/src/lib/dag-layout.ts
  - apps/planner/src/components/RunStateTree.tsx
outputs:
  - apps/planner/src/components/DagFlow.tsx
  - apps/planner/src/components/DagFlowNode.tsx
checks:
  - id: dag-flow-exists
    cmd: "test -f apps/planner/src/components/DagFlow.tsx"
    description: DagFlow.tsx exists
  - id: dag-flow-node-exists
    cmd: "test -f apps/planner/src/components/DagFlowNode.tsx"
    description: DagFlowNode.tsx exists
  - id: dag-flow-imports-reactflow
    cmd: "grep -q 'from.*@xyflow/react' apps/planner/src/components/DagFlow.tsx"
    description: DagFlow imports from @xyflow/react
  - id: dag-flow-node-has-handles
    cmd: "grep -q 'Handle' apps/planner/src/components/DagFlowNode.tsx"
    description: DagFlowNode uses React Flow Handles
  - id: dag-flow-node-handles-status
    cmd: "grep -qE '(status|runStatus)' apps/planner/src/components/DagFlowNode.tsx"
    description: DagFlowNode renders status-aware styling
  - id: components-typecheck
    cmd: "cd apps/planner && npx tsc --noEmit --pretty 2>&1 | head -50"
    description: Both components typecheck without errors
tags:
  - phase
children:
  - 001-dag-flow-component
  - 002-dag-flow-node
  - 003-typecheck
---

Create the core React Flow visualization components. These are pure visual
components that accept `nodes` and `edges` props — they don't fetch data or
know about manifests or runstate.

## DagFlow.tsx

The container component that:
- Wraps `<ReactFlow>` with `ReactFlowProvider`
- Accepts `nodes: Node[]`, `edges: Edge[]`, `onNodeClick`, `selectedNodeId`, `isLive` props
- Renders a minimap (bottom-right), controls (bottom-left), and themed background
- Sets fitView on initial render and when nodes/edges change
- Has `proOptions={{ hideAttribution: true }}`
- Registers `nodeTypes` mapping `'convergeTask'` to `DagFlowNode`
- Uses `defaultEdgeOptions` with `type: 'smoothstep'`, animated when `isLive` is true
- Handles empty state gracefully (centered "No tasks to display" message)
- Uses `className` for height: `h-full min-h-[400px] w-full`

## DagFlowNode.tsx

The custom node component that:
- Uses React Flow's `Handle` pattern (target at top, source at bottom)
- Reads `data` matching the shape from `computeDagLayout` output:
  - `label` (task ID), `state` (concrete|expected|frontier), `runStatus` (optional)
  - `dag_type` (normal|diverge|converge, optional)
  - `tags`, `checks`, `inputs`, `outputs` (for badges/tooltip)
- Renders:
  - A card with rounded corners, border color based on `runStatus` or `state`
  - Left accent stripe for diverge (cyan) and converge (violet) nodes
  - Status dot indicator matching RunStateTree's color scheme
  - For `running`: subtle pulse animation on the dot
  - For `error`: red-tinted border
  - Monospace task ID label
  - Badge row for tag/check/output/input counts
- Supports `selected` state with ring highlight
- Uses CSS variables from globals.css for theme compatibility

Status colors must match RunStateTree.tsx exactly:
- `STATUS_DOT`: pending=bg-muted-foreground/30, running=bg-primary shadow glow, pass=bg-emerald-500, error=bg-rose-500, skipped=bg-yellow-500/70
- Border: pending=border-border/60, running=border-primary/40, pass=border-emerald-500/30, error=border-rose-500/40
