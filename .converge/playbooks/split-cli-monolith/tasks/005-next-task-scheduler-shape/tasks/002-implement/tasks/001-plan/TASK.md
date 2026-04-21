---
id: 001-plan
title: Plan implementation — PR4 — Move cli/next-task.ts directly to scheduler-ready shape
checks:
  - id: impl-plan-written
    description: Implementation plan exists
    cmd: "test -f D:/converge/.converge/artifacts/split-cli/005-next-task-scheduler-shape/implement/plan.md"
vars:
  taskId: 001-plan
  title: PR4 — Move cli/next-task.ts directly to scheduler-ready shape
  task: "Single-destination move of the 1449-line next-task.ts into packages/core/src/scheduler/, split into 5 files. PR10 becomes a directory-level git mv with zero reshuffle."
  spec: "Move `packages/core/src/cli/next-task.ts` (1449 L) directly to `packages/core/src/scheduler/` — the location that becomes `packages/scheduler/src/` in PR10. This avoids a double-move: PR10 will be a `git mv` of a directory.\n\n**Why not `tree/next-task/`:** that was the prior plan, but it means two moves (cli → tree, then tree → scheduler pkg). Going directly to `scheduler/` now makes PR10 a mechanical directory rename.\n\n**Target split:**\n\n| New file                              | Lines | Source range (cli/next-task.ts) |\n| ------------------------------------- | ----- | ------------------------------- |\n| `scheduler/types.ts`                  | ~80   | `TaskNode`, `WbsProgress`, `TaskStates`, `ExecutionSpan`, `NextTaskResult` |\n| `scheduler/build-tree.ts`             | ~450  | `treeNodesToTaskNodes` + `buildTaskTree`                                    |\n| `scheduler/task-states.ts`            | ~700  | `getCompletedTaskIds` + `getTaskStates`                                     |\n| `scheduler/execution-plan.ts`         | ~80   | `calculateExecutionPlan`                                                     |\n| `scheduler/find-next.ts`              | ~50   | `findNextTask`                                                               |\n| `scheduler/index.ts`                  | barrel | re-export public API                                                         |\n\n**Rules:**\n- No behavior change. Pure partitioning.\n- Every split file ≤500 lines.\n- Public API reaches through `scheduler/index.ts`. Consumers import from `../scheduler`.\n- Use `git mv` so file history is preserved.\n\n**Import sites to update (10):**\n- 6 `cli/commands-*.ts` files importing next-task\n- `cli/reconcile.ts`\n- `cli/autonomous-run.ts`\n- `cli/tree-display.ts`\n- `checkpoint/ensure-epic-checkpoints.ts`\n\nFind with: `grep -rn \"from.*cli/next-task\" packages/core/src`\n\n**Acceptance:**\n- PR1 scheduler suites green (they were written against future paths — should now resolve correctly)\n- `pnpm --filter @converge/core build` clean\n- `pnpm --filter @converge/core test` green\n- Every split file ≤500 lines\n- `madge --circular packages/core/src/scheduler` — no cycles"
  projectDir: "D:/converge"
  artifactsDir: "D:/converge/.converge/artifacts/split-cli/005-next-task-scheduler-shape"
  subTemplateDir: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/tasks/implement/tasks/plan"
  wbsSection: 
---

# Plan implementation — PR4 — Move cli/next-task.ts directly to scheduler-ready shape

Read the analysis and produce a concrete, file-level implementation plan.

## Steps

1. Read `D:/converge/.converge/artifacts/split-cli/005-next-task-scheduler-shape/analyze/plan.md`.
2. Reconcile the analysis against current code state — the analysis may have been written minutes or hours ago, but files may have drifted. Re-check line ranges and grep counts if they're load-bearing.
3. Write the final implementation plan. Be specific: file paths, exact lines, what becomes what.

## Output

Write `D:/converge/.converge/artifacts/split-cli/005-next-task-scheduler-shape/implement/plan.md`:

```markdown
# PR4 — Move cli/next-task.ts directly to scheduler-ready shape — Implementation Plan

## Summary
<one line>

## Changes (ordered)
1. File: `packages/core/src/...` — <create | move | edit | delete>; what
2. File: `packages/core/src/...` — ...

## Order of Operations
1. Do X first because Y depends on it
2. Then Z

## Post-change verification commands
- `pnpm --filter @converge/core build`
- `pnpm --filter @converge/core test`
- <any smoke checks specific to this PR>
```
