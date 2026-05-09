---
id: 04-runstate-merger
title: Phase 04 — Merge runstate statuses onto DAG nodes
blocking: true
inputs:
  - apps/planner/src/lib/use-dag-data.ts
  - apps/planner/src/lib/dag-layout.ts
outputs:
  - apps/planner/src/lib/use-dag-data.ts (extended)
  - apps/planner/src/lib/dag-layout.ts (extended)
checks:
  - id: use-dag-data-merges-runstatus
    cmd: "grep -qE '(runStatus|runstate.*status)' apps/planner/src/lib/use-dag-data.ts"
    description: useDagData overlays runStatus from runstate
  - id: use-dag-data-handles-synthetic-nodes
    cmd: "grep -qE '(diverge|converge|synthetic|dag_type)' apps/planner/src/lib/use-dag-data.ts"
    description: useDagData creates synthetic nodes for diverge/converge splits
  - id: dag-layout-passes-dag-type
    cmd: "grep -q 'dag_type' apps/planner/src/lib/dag-layout.ts"
    description: dag-layout.ts passes dag_type through to node data
  - id: typecheck-clean
    cmd: "cd apps/planner && npx tsc --noEmit --pretty 2>&1 | head -30"
    description: TypeScript compiles without errors
tags:
  - phase
children:
  - 001-extend-use-dag-data
  - 002-typecheck
---

Extend the data hook and layout module to properly merge runstate data.

## What needs to work

When both manifest and runstate are provided:
1. Every manifest node gets its `runStatus` overlaid from the matching runstate node
2. Synthetic nodes only in runstate (diverge/converge splits like `{id}-diverge`, `{id}-converge`) are created on-the-fly as concrete nodes
3. The `dag_type` field from runstate nodes is passed into node data for visual distinction in DagFlowNode
4. Runstate edges supplement manifest edges without duplication
5. Missing runstate produces manifest-only output (no crash)

## Changes to dag-layout.ts

Add `dag_type` to `ManifestNodeData`:
```typescript
dag_type?: 'normal' | 'diverge' | 'converge'
```

Pass it through in `computeDagLayout`'s node data:
```typescript
dag_type: (data as Record<string, unknown>).dag_type as 'normal' | 'diverge' | 'converge' | undefined,
```

## Changes to use-dag-data.ts

The hook from Phase 02 already includes the basic merge logic. Verify and refine:
- Runstate nodes not in manifest get created with `state: 'concrete'`
- Status values are validated against the allowed set before assignment
- Edge deduplication works correctly

## Convergence

Verify with a real runstate.json that has diverge/converge splits:
1. All synthetic diverge/converge nodes appear in the DAG
2. They have correct dag_type badges (cyan for diverge, violet for converge)
3. Status colors render correctly on all nodes
4. No duplicate edges exist
