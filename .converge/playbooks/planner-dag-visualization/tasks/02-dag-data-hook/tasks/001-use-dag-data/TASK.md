---
id: 001-use-dag-data
title: Create use-dag-data.ts hook
inputs:
  - apps/planner/src/lib/dag-layout.ts
outputs:
  - apps/planner/src/lib/use-dag-data.ts
checks:
  - id: use-dag-data-exists
    cmd: "test -f apps/planner/src/lib/use-dag-data.ts"
    description: use-dag-data.ts exists
  - id: use-dag-data-imports-dag-layout
    cmd: "grep -q 'dag-layout' apps/planner/src/lib/use-dag-data.ts"
    description: Imports computeDagLayout from dag-layout.ts
  - id: use-dag-data-sexports-reactflow-types
    cmd: "grep -qE '(Node|Edge)' apps/planner/src/lib/use-dag-data.ts"
    description: Returns @xyflow/react Node[] and Edge[]
  - id: use-dag-data-accepts-manifest
    cmd: "grep -qE '(ManifestData|manifest)' apps/planner/src/lib/use-dag-data.ts"
    description: Accepts ManifestData input
  - id: use-dag-data-handles-null
    cmd: "grep -qE '(null|undefined)' apps/planner/src/lib/use-dag-data.ts"
    description: Handles null/undefined input
  - id: use-dag-data-uses-usememo
    cmd: "grep -q 'useMemo' apps/planner/src/lib/use-dag-data.ts"
    description: Uses useMemo for layout computation
---

Create `apps/planner/src/lib/use-dag-data.ts`.

```typescript
'use client'

import { useMemo } from 'react'
import type { Node, Edge } from '@xyflow/react'
import { computeDagLayout, type ManifestData } from './dag-layout'
import type { DagFlowNodeData } from '@/components/DagFlowNode'

export type { DagFlowNodeData }

export interface DagSourceRunstateNode {
  id: string
  status?: string
  dag_type?: 'normal' | 'diverge' | 'converge'
  depends_on?: string[]
  depended_on_by?: string[]
  title?: string
  [key: string]: unknown
}

export interface DagSource {
  manifest?: ManifestData | null
  runstate?: {
    nodes: Record<string, DagSourceRunstateNode>
    edges?: Array<{ from: string; to: string }>
  } | null
}

export function useDagData(source: DagSource): { nodes: Node[]; edges: Edge[] } {
  return useMemo(() => {
    const { manifest, runstate } = source

    if (!manifest && !runstate) return { nodes: [], edges: [] }

    // Build merged manifest — start from manifest nodes, layer on runstate data
    const mergedNodes: ManifestData['nodes'] = {}

    // 1. Base: all manifest nodes
    if (manifest?.nodes) {
      for (const [id, data] of Object.entries(manifest.nodes)) {
        mergedNodes[id] = { ...data }
      }
    }

    // 2. Overlay: runstate nodes
    if (runstate?.nodes) {
      for (const [id, rn] of Object.entries(runstate.nodes)) {
        if (mergedNodes[id]) {
          // Overlay runStatus from runstate onto existing manifest node
          if (rn.status && ['pending', 'running', 'pass', 'error', 'skipped'].includes(rn.status)) {
            mergedNodes[id].runStatus = rn.status as ManifestData['nodes'][string]['runStatus']
          }
          // Overlay dag_type for diverge/converge distinction
          if (rn.dag_type && rn.dag_type !== 'normal') {
            ;(mergedNodes[id] as Record<string, unknown>).dag_type = rn.dag_type
          }
        } else {
          // Synthetic node only in runstate (diverge/converge splits) — create placeholder
          mergedNodes[id] = {
            id,
            state: 'concrete',
            tags: [],
            depends_on: rn.depends_on ?? [],
            depended_on_by: rn.depended_on_by ?? [],
            checks: [],
            inputs: [],
            outputs: [],
            runStatus: (['pending', 'running', 'pass', 'error', 'skipped'].includes(rn.status ?? '')
              ? rn.status as ManifestData['nodes'][string]['runStatus']
              : undefined),
            dag_type: rn.dag_type as ManifestData['nodes'][string]['dag_type'],
          }
        }
      }
    } else if (!manifest) {
      // Only runstate, no manifest — build entirely from runstate nodes
      for (const [id, rn] of Object.entries(runstate!.nodes!)) {
        mergedNodes[id] = {
          id,
          state: 'concrete',
          tags: [],
          depends_on: rn.depends_on ?? [],
          depended_on_by: rn.depended_on_by ?? [],
          checks: [],
          inputs: [],
          outputs: [],
          runStatus: (['pending', 'running', 'pass', 'error', 'skipped'].includes(rn.status ?? '')
            ? rn.status as ManifestData['nodes'][string]['runStatus']
            : undefined),
          dag_type: rn.dag_type as ManifestData['nodes'][string]['dag_type'],
        }
      }
    }

    // Build parent_map / child_map from depends_on relationships
    const child_map: Record<string, string[]> = {}
    const parent_map: Record<string, string[]> = {}
    for (const [id, data] of Object.entries(mergedNodes)) {
      for (const dep of data.depends_on) {
        ;(child_map[dep] ??= []).push(id)
        ;(parent_map[id] ??= []).push(dep)
      }
    }

    // Compute layout
    const result = computeDagLayout({ nodes: mergedNodes, child_map, parent_map })

    // Supplement edges from runstate edges (dedup by ID)
    if (runstate?.edges) {
      const edgeIds = new Set(result.edges.map(e => e.id))
      for (const e of runstate.edges) {
        const edgeId = `${e.from}->${e.to}`
        if (!edgeIds.has(edgeId) && mergedNodes[e.from] && mergedNodes[e.to]) {
          result.edges.push({
            id: edgeId,
            source: e.from,
            target: e.to,
            type: 'smoothstep',
            style: { stroke: 'hsl(var(--muted-foreground) / 0.4)', strokeWidth: 1.5 },
          })
          edgeIds.add(edgeId)
        }
      }
    }

    return result
  }, [source.manifest, source.runstate])
}
```

Also update `apps/planner/src/lib/dag-layout.ts` to add `dag_type` to the node data output:

In `ManifestNodeData` interface, add:
```typescript
dag_type?: 'normal' | 'diverge' | 'converge'
```

In `computeDagLayout`, in the `nodes.push()` call, add to `data:`:
```typescript
dag_type: (data as Record<string, unknown>).dag_type as 'normal' | 'diverge' | 'converge' | undefined,
```
