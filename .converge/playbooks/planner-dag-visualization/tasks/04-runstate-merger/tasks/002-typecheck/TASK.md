---
id: 002-typecheck
title: Verify runstate merger typechecks
inputs:
  - apps/planner/src/lib/use-dag-data.ts
  - apps/planner/src/lib/dag-layout.ts
checks:
  - id: typecheck-clean
    cmd: "cd apps/planner && npx tsc --noEmit --pretty 2>&1 | head -30"
    description: TypeScript compiles without errors
---

Run `cd apps/planner && npx tsc --noEmit --pretty` and fix any type errors.

Also verify:
1. `dag_type` field flows from runstate → useDagData → computeDagLayout → DagFlowNode
2. DagFlowNode already handles `dag_type` from its Phase 01 implementation
3. No implicit `any` types in the merge logic
