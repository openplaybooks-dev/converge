---
id: 09-verify
title: Phase 09 — Verify build, typecheck, and integration
blocking: true
inputs:
  - (all modified files)
checks:
  - id: typecheck-clean
    cmd: "cd apps/planner && npx tsc --noEmit --pretty 2>&1 | head -30"
    description: TypeScript typecheck passes
  - id: build-clean
    cmd: "cd apps/planner && npx next build 2>&1 | tail -30"
    description: Next.js production build succeeds
  - id: dag-flow-renders
    cmd: "grep -q 'DagFlow' apps/planner/src/components/ExecutionView.tsx"
    description: ExecutionView references DagFlow
  - id: tree-still-works
    cmd: "grep -q 'RunStateTree' apps/planner/src/components/ExecutionView.tsx"
    description: RunStateTree still renders in tree mode
  - id: dag-layout-imported
    cmd: "grep -q 'dag-layout' apps/planner/src/lib/use-dag-data.ts || grep -q 'dag-layout' apps/planner/src/components/DagFlow.tsx"
    description: dag-layout.ts is imported
  - id: xyflow-css-present
    cmd: "grep -q '@xyflow/react' apps/planner/src/app/globals.css"
    description: xyflow CSS imported
  - id: no-dead-imports
    cmd: "cd apps/planner && npx tsc --noEmit --pretty 2>&1 | grep -c 'is declared but its value is never read' || echo 0"
    description: Zero unused imports
tags:
  - phase
children:
  - 001-build-and-typecheck
---

Final verification phase. Run the full build pipeline and verify no regressions.

## Verification steps

1. **TypeScript**: `cd apps/planner && npx tsc --noEmit --pretty`
   - Should pass with zero errors
   - Check for unused imports (reveals dead code)

2. **Production build**: `cd apps/planner && npx next build`
   - Should compile all components including DagFlow and DagFlowNode
   - No build warnings about unresolved imports
   - @xyflow/react CSS import resolves correctly

3. **File existence**: Verify all expected output files exist:
   - `apps/planner/src/components/DagFlow.tsx`
   - `apps/planner/src/components/DagFlowNode.tsx`
   - `apps/planner/src/lib/use-dag-data.ts`
   - `apps/planner/src/components/ManifestDagView.tsx`

4. **Integration points**:
   - `ExecutionView.tsx` imports both `DagFlow` AND `RunStateTree`
   - `ExecutionView.tsx` has view toggle (viewMode state)
   - `PlaybookTab.tsx` fetches manifest and passes to ExecutionView
   - `use-dag-data.ts` imports `computeDagLayout` from `dag-layout.ts`
   - `dag-layout.ts` exports `dag_type` in node data
   - `globals.css` imports `@xyflow/react/dist/style.css` and overrides theme variables

5. **No regressions**:
   - `RunStateTree` still imported and rendered (tree mode works)
   - Existing API routes unchanged
   - No changes to `@openplaybooks/converge-core` packages

## Convergence

After children run, review the build output. If any check fails, trace to the responsible phase and fix. The playbook is complete when all 12 playbook-level checks pass.
