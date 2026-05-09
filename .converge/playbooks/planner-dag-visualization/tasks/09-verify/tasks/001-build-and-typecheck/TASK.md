---
id: 001-build-and-typecheck
title: Run full build and typecheck; verify all integration points
checks:
  - id: typecheck-passes
    cmd: "cd apps/planner && npx tsc --noEmit --pretty 2>&1 | head -30"
    description: TypeScript typecheck passes with zero errors
  - id: build-succeeds
    cmd: "cd apps/planner && npx next build 2>&1 | tail -30"
    description: Production build succeeds
  - id: all-files-exist
    cmd: |
      test -f apps/planner/src/components/DagFlow.tsx &&
      test -f apps/planner/src/components/DagFlowNode.tsx &&
      test -f apps/planner/src/lib/use-dag-data.ts &&
      test -f apps/planner/src/components/ManifestDagView.tsx &&
      echo "All files present"
    description: All four new files exist
  - id: execution-view-has-both-views
    cmd: |
      grep -q 'DagFlow' apps/planner/src/components/ExecutionView.tsx &&
      grep -q 'RunStateTree' apps/planner/src/components/ExecutionView.tsx &&
      echo "Both views wired"
    description: ExecutionView has both DAG and tree views
  - id: no-unused-imports
    cmd: |
      count=$(cd apps/planner && npx tsc --noEmit --pretty 2>&1 | grep -c "is declared but its value is never read" || true)
      echo "Unused imports: $count"
      test "$count" -eq 0
    description: No unused imports in the planner
---

Run the complete verification:

### 1. TypeScript
```bash
cd apps/planner && npx tsc --noEmit --pretty
```
Fix any type errors. Common issues:
- Missing `dag_type` on `ManifestNodeData` in dag-layout.ts
- Import path mismatches for `@/lib/utils`, `@/lib/use-dag-data`, etc.
- `NodeProps` generic type from @xyflow/react (use `NodeProps` without type arg, cast `data` inside)

### 2. Build
```bash
cd apps/planner && npx next build
```
Fix any build errors. Common issues:
- CSS import not found → verify `@import '@xyflow/react/dist/style.css'` path
- Client component missing `'use client'` directive
- Missing peer dependencies (shouldn't happen — @xyflow/react and dagre are in package.json)

### 3. File audit
Verify all four new files exist and are non-empty.

### 4. Integration audit
Run the grep checks from the playbook-level checks to verify:
- dag-layout.ts is imported by a consumer
- ExecutionView has view toggle
- PlaybookTab fetches manifest
- SSE integration in use-dag-data
- Node click handler in DagFlow
- xyflow CSS in globals.css

### 5. Report
Summarize findings. If all checks pass, the playbook is complete.
