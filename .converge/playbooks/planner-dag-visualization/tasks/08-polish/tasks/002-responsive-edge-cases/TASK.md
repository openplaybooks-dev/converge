---
id: 002-responsive-edge-cases
title: Handle empty, single, and large graphs
inputs:
  - apps/planner/src/components/DagFlow.tsx
outputs:
  - apps/planner/src/components/DagFlow.tsx
checks:
  - id: dag-flow-handles-empty
    cmd: "grep -qE '(empty|no tasks|no nodes|nodes\\.length === 0)' apps/planner/src/components/DagFlow.tsx"
    description: DagFlow handles empty nodes array
  - id: dag-flow-uses-fitview
    cmd: "grep -q 'fitView' apps/planner/src/components/DagFlow.tsx"
    description: DagFlow calls fitView for layout
---

Read `apps/planner/src/components/DagFlow.tsx`. Verify and fix edge cases:

### 1. Empty state
Already implemented in Phase 01 — verify it renders the centered placeholder when `nodes.length === 0`.

### 2. Single node
Verify `fitView` is called on mount and when node count changes. Single nodes should center in the viewport. If the single node renders at a corner, add:
```typescript
useEffect(() => {
  if (initialized && nodes.length > 0) {
    const timer = setTimeout(() => fitView({ padding: 0.3, duration: 300 }), 100)
    return () => clearTimeout(timer)
  }
}, [initialized, nodes.length, fitView])
```

### 3. Large graphs (50+ nodes)
xyflow handles this via viewport virtualization. Verify:
- `minZoom: 0.1` and `maxZoom: 2` are set on ReactFlow
- `fitView` has reasonable padding (0.2)
- Nodes are not draggable (`nodesDraggable={false}`) to prevent accidental moves

### 4. Loading state
If any parent component passes empty arrays during loading, the empty state shows. This is acceptable — the parent should handle its own loading state (ManifestDagView already does).

### 5. Verify edge rendering
- Edges with `type: 'smoothstep'` render correctly
- Edge labels don't overlap node cards
- Animated edges (live mode) don't cause performance issues
