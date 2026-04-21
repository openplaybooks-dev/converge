---
id: 001-execute
title: "Execute: Single-destination move of the 1449-line next-task.ts into packages/core/src/scheduler/, split into 5 files. PR10 becomes a directory-level git mv with zero reshuffle."
---

Implement the PR.

**Summary:** Single-destination move of the 1449-line next-task.ts into packages/core/src/scheduler/, split into 5 files. PR10 becomes a directory-level git mv with zero reshuffle.

**Spec:**
Move `packages/core/src/cli/next-task.ts` (1449 L) directly to `packages/core/src/scheduler/` — the location that becomes `packages/scheduler/src/` in PR10. This avoids a double-move: PR10 will be a `git mv` of a directory.

**Why not `tree/next-task/`:** that was the prior plan, but it means two moves (cli → tree, then tree → scheduler pkg). Going directly to `scheduler/` now makes PR10 a mechanical directory rename.

**Target split:**

| New file                              | Lines | Source range (cli/next-task.ts) |
| ------------------------------------- | ----- | ------------------------------- |
| `scheduler/types.ts`                  | ~80   | `TaskNode`, `WbsProgress`, `TaskStates`, `ExecutionSpan`, `NextTaskResult` |
| `scheduler/build-tree.ts`             | ~450  | `treeNodesToTaskNodes` + `buildTaskTree`                                    |
| `scheduler/task-states.ts`            | ~700  | `getCompletedTaskIds` + `getTaskStates`                                     |
| `scheduler/execution-plan.ts`         | ~80   | `calculateExecutionPlan`                                                     |
| `scheduler/find-next.ts`              | ~50   | `findNextTask`                                                               |
| `scheduler/index.ts`                  | barrel | re-export public API                                                         |

**Rules:**
- No behavior change. Pure partitioning.
- Every split file ≤500 lines.
- Public API reaches through `scheduler/index.ts`. Consumers import from `../scheduler`.
- Use `git mv` so file history is preserved.

**Import sites to update (10):**
- 6 `cli/commands-*.ts` files importing next-task
- `cli/reconcile.ts`
- `cli/autonomous-run.ts`
- `cli/tree-display.ts`
- `checkpoint/ensure-epic-checkpoints.ts`

Find with: `grep -rn "from.*cli/next-task" packages/core/src`

**Acceptance:**
- PR1 scheduler suites green (they were written against future paths — should now resolve correctly)
- `pnpm --filter @converge/core build` clean
- `pnpm --filter @converge/core test` green
- Every split file ≤500 lines
- `madge --circular packages/core/src/scheduler` — no cycles

**Analysis:** `D:/converge/.converge/artifacts/split-cli/005-next-task-scheduler-shape/analyze/plan.md`
