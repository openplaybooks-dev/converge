---
id: 02-dag-data-hook
title: Phase 02 — Create useDagData hook bridging dag-layout.ts to React Flow
blocking: true
inputs:
  - apps/planner/src/lib/dag-layout.ts
  - apps/planner/src/components/DagFlow.tsx
outputs:
  - apps/planner/src/lib/use-dag-data.ts
checks:
  - id: use-dag-data-exists
    cmd: "test -f apps/planner/src/lib/use-dag-data.ts"
    description: use-dag-data.ts exists
  - id: use-dag-data-imports-dag-layout
    cmd: "grep -q 'dag-layout' apps/planner/src/lib/use-dag-data.ts"
    description: Imports computeDagLayout from dag-layout.ts
  - id: use-dag-data-accepts-manifest
    cmd: "grep -qE '(ManifestData|manifest)' apps/planner/src/lib/use-dag-data.ts"
    description: Accepts ManifestData input
  - id: use-dag-data-handles-null
    cmd: "grep -qE '(null|undefined)' apps/planner/src/lib/use-dag-data.ts"
    description: Handles null/undefined input gracefully
  - id: use-dag-data-exports-reactflow-types
    cmd: "grep -qE '(Node|Edge)' apps/planner/src/lib/use-dag-data.ts"
    description: Returns @xyflow/react Node[] and Edge[]
  - id: hook-typechecks
    cmd: "cd apps/planner && npx tsc --noEmit --pretty 2>&1 | head -50"
    description: Hook compiles without type errors
tags:
  - phase
children:
  - 001-use-dag-data
  - 002-typecheck
---

Create the data hook that wraps `computeDagLayout()` and returns React
Flow-compatible data. This is the single bridge between raw manifest/runstate
data and the visual DAG components.

## useDagData hook

**Signature:**
```typescript
function useDagData(source: DagSource): { nodes: Node[]; edges: Edge[] }
```

**Input shape (`DagSource`):**
```typescript
interface DagSource {
  manifest?: ManifestData | null
  runstate?: {
    nodes: Record<string, { id: string; status?: string; dag_type?: string; depends_on?: string[]; depended_on_by?: string[]; [key: string]: unknown }>
    edges?: Array<{ from: string; to: string }>
  } | null
}
```

**Responsibilities:**
1. Accept either a `ManifestData` (from manifest.json API) or a runstate DAG, or both
2. If `manifest` is provided: use it as the base — all manifest nodes become DAG nodes
3. If `runstate` is also provided:
   - For each runstate node that exists in manifest: overlay `runStatus` and `dag_type`
   - For each runstate node NOT in manifest (synthetic diverge/converge splits): create an ad-hoc `concrete` node with the runstate's status and dag_type
   - Supplement edges from runstate edges (deduplicated by edge ID)
4. Call `computeDagLayout(mergedManifest)` to get positioned nodes/edges
5. Return `{ nodes, edges }` ready to pass to `<DagFlow>`
6. Handle `null`/empty gracefully → return `{ nodes: [], edges: [] }`
7. Use `useMemo` for layout computation (keyed on manifest + runstate references)
8. Export the `DagFlowNodeData` type for consumers

## Extend dag-layout.ts

Add `dag_type` field to the node data output in `computeDagLayout`:
```typescript
// In the node.data object:
dag_type: data.dag_type,  // 'normal' | 'diverge' | 'converge'
```

## Convergence

After children create the hook and update dag-layout, verify:
- The hook typechecks
- dag-layout.ts passes `dag_type` through to node data
- The hook handles all three cases: manifest-only, runstate-only, both
- Empty input returns empty arrays without crashing
