---
id: 002-typecheck
title: Verify use-dag-data.ts typechecks
inputs:
  - apps/planner/src/lib/use-dag-data.ts
checks:
  - id: hook-typechecks
    cmd: "cd apps/planner && npx tsc --noEmit --pretty 2>&1 | head -50"
    description: TypeScript compiles use-dag-data.ts without errors
---

Run `cd apps/planner && npx tsc --noEmit --pretty` and fix any type errors.

Ensure:
1. `computeDagLayout` import resolves correctly
2. `ManifestData` type import resolves
3. `DagFlowNodeData` re-export works
4. `Node` and `Edge` types from `@xyflow/react` are used correctly
5. No implicit `any` types remain
