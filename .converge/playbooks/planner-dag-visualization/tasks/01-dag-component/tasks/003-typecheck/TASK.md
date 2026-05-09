---
id: 003-typecheck
title: Verify DagFlow and DagFlowNode typecheck
inputs:
  - apps/planner/src/components/DagFlow.tsx
  - apps/planner/src/components/DagFlowNode.tsx
checks:
  - id: dag-components-typecheck
    cmd: "cd apps/planner && npx tsc --noEmit --pretty 2>&1 | head -50"
    description: TypeScript compiles DagFlow.tsx and DagFlowNode.tsx without errors
---

Run the TypeScript compiler to verify the new components compile cleanly.

1. Run `cd apps/planner && npx tsc --noEmit --pretty`
2. If errors, fix imports, type mismatches, or missing exports
3. Ensure `@xyflow/react` types resolve correctly (already in package.json)
4. Ensure `Node`, `Edge`, `NodeProps` types are used correctly
5. Ensure `cn` import from `@/lib/utils` resolves
6. Ensure `lucide-react` or other dependencies used only import existing modules
