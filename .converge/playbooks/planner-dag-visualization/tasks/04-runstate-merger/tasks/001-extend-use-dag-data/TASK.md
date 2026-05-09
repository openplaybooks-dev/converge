---
id: 001-extend-use-dag-data
title: Extend use-dag-data.ts with full runstate merge and update dag-layout.ts
inputs:
  - apps/planner/src/lib/use-dag-data.ts
  - apps/planner/src/lib/dag-layout.ts
outputs:
  - apps/planner/src/lib/use-dag-data.ts (modified)
  - apps/planner/src/lib/dag-layout.ts (modified)
checks:
  - id: dag-layout-has-dag-type
    cmd: "grep -q 'dag_type' apps/planner/src/lib/dag-layout.ts"
    description: dag-layout.ts has dag_type in ManifestNodeData and node output
  - id: use-dag-data-produces-synthetic
    cmd: "grep -qE '(diverge|converge|synthetic|!mergedNodes)' apps/planner/src/lib/use-dag-data.ts"
    description: useDagData creates synthetic nodes for runstate-only entries
  - id: use-dag-data-validates-status
    cmd: "grep -qE '(pending|running|pass|error|skipped).*\\.includes' apps/planner/src/lib/use-dag-data.ts"
    description: useDagData validates status values before assignment
---

Two changes:

### 1. Update dag-layout.ts

Add to `ManifestNodeData` interface (after `outputs`):
```typescript
dag_type?: 'normal' | 'diverge' | 'converge'
```

In `computeDagLayout`, in the `data:` object of `nodes.push()`:
```typescript
dag_type: (data as Record<string, unknown>).dag_type as DagFlowNodeData['dag_type'],
```

### 2. Verify use-dag-data.ts merge logic

The hook created in Phase 02 already contains the full merge logic. Verify:
- The `DagSourceRunstateNode` interface includes `dag_type` and `status`
- The merge loop handles three cases: manifest-only nodes (just overlay status), runstate-only nodes (create synthetic), and both-present (merge)
- `depends_on`/`depended_on_by` arrays from runstate are used for synthetic nodes
- Status validation checks against `['pending', 'running', 'pass', 'error', 'skipped']`
- Edge deduplication uses Set of edge IDs

If the hook from Phase 02 is already correct, only the dag-layout.ts change is needed. If gaps exist, fill them now.
