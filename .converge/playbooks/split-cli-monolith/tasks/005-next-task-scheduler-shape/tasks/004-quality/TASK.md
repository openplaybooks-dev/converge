---
id: 004-quality
title: Quality gate — PR4 — Move cli/next-task.ts directly to scheduler-ready shape
checks:
  - id: typecheck
    description: Zero type errors
    cmd: "cd D:/converge && pnpm typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq"
  - id: tests
    description: Tests pass
    cmd: "cd D:/converge && pnpm test 2>&1 | tail -1"
  - id: cli-smoke
    description: converge --help runs (tolerates pre/post-PR13 bin location)
    cmd: "cd D:/converge && node packages/core/dist/cli/main.js --help >/dev/null 2>&1 || node packages/cli/dist/main.js --help >/dev/null 2>&1"
vars:
  taskId: 004-quality
  parentId: 005-next-task-scheduler-shape
  title: PR4 — Move cli/next-task.ts directly to scheduler-ready shape
  tier: 2 — In-core reorg
  task: "Single-destination move of the 1449-line next-task.ts into packages/core/src/scheduler/, split into 5 files. PR10 becomes a directory-level git mv with zero reshuffle."
  spec: "Move `packages/core/src/cli/next-task.ts` (1449 L) directly to `packages/core/src/scheduler/` — the location that becomes `packages/scheduler/src/` in PR10. This avoids a double-move: PR10 will be a `git mv` of a directory.\n\n**Why not `tree/next-task/`:** that was the prior plan, but it means two moves (cli → tree, then tree → scheduler pkg). Going directly to `scheduler/` now makes PR10 a mechanical directory rename.\n\n**Target split:**\n\n| New file                              | Lines | Source range (cli/next-task.ts) |\n| ------------------------------------- | ----- | ------------------------------- |\n| `scheduler/types.ts`                  | ~80   | `TaskNode`, `WbsProgress`, `TaskStates`, `ExecutionSpan`, `NextTaskResult` |\n| `scheduler/build-tree.ts`             | ~450  | `treeNodesToTaskNodes` + `buildTaskTree`                                    |\n| `scheduler/task-states.ts`            | ~700  | `getCompletedTaskIds` + `getTaskStates`                                     |\n| `scheduler/execution-plan.ts`         | ~80   | `calculateExecutionPlan`                                                     |\n| `scheduler/find-next.ts`              | ~50   | `findNextTask`                                                               |\n| `scheduler/index.ts`                  | barrel | re-export public API                                                         |\n\n**Rules:**\n- No behavior change. Pure partitioning.\n- Every split file ≤500 lines.\n- Public API reaches through `scheduler/index.ts`. Consumers import from `../scheduler`.\n- Use `git mv` so file history is preserved.\n\n**Import sites to update (10):**\n- 6 `cli/commands-*.ts` files importing next-task\n- `cli/reconcile.ts`\n- `cli/autonomous-run.ts`\n- `cli/tree-display.ts`\n- `checkpoint/ensure-epic-checkpoints.ts`\n\nFind with: `grep -rn \"from.*cli/next-task\" packages/core/src`\n\n**Acceptance:**\n- PR1 scheduler suites green (they were written against future paths — should now resolve correctly)\n- `pnpm --filter @converge/core build` clean\n- `pnpm --filter @converge/core test` green\n- Every split file ≤500 lines\n- `madge --circular packages/core/src/scheduler` — no cycles"
  projectDir: "D:/converge"
  artifactsDir: "D:/converge/.converge/artifacts/split-cli/005-next-task-scheduler-shape"
  phaseTemplateDir: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/tasks/quality"
  wbsSection: 
---

# Quality gate — PR4 — Move cli/next-task.ts directly to scheduler-ready shape

Final verification after code review approval. Hard gate — if anything fails here, fix it in-place before this PR is considered done.

## Steps

1. `cd D:/converge && pnpm typecheck` — must be zero errors.
2. `cd D:/converge && pnpm test` — all tests must pass.
3. `converge --help` must run (from whichever bin location applies at this point in the sequence).
4. For Tier B PRs (10–13): also run `pnpm -r build && pnpm -r test` to confirm every workspace package is healthy.
5. If anything fails, fix it here — don't defer.
