---
id: 001-analyze
title: Analyze — PR4 — Move cli/next-task.ts directly to scheduler-ready shape
checks:
  - id: plan-written
    description: Analysis plan exists
    cmd: "test -f D:/converge/.converge/artifacts/split-cli/005-next-task-scheduler-shape/analyze/plan.md"
vars:
  taskId: 001-analyze
  parentId: 005-next-task-scheduler-shape
  title: PR4 — Move cli/next-task.ts directly to scheduler-ready shape
  tier: 2 — In-core reorg
  task: "Single-destination move of the 1449-line next-task.ts into packages/core/src/scheduler/, split into 5 files. PR10 becomes a directory-level git mv with zero reshuffle."
  spec: "Move `packages/core/src/cli/next-task.ts` (1449 L) directly to `packages/core/src/scheduler/` — the location that becomes `packages/scheduler/src/` in PR10. This avoids a double-move: PR10 will be a `git mv` of a directory.\n\n**Why not `tree/next-task/`:** that was the prior plan, but it means two moves (cli → tree, then tree → scheduler pkg). Going directly to `scheduler/` now makes PR10 a mechanical directory rename.\n\n**Target split:**\n\n| New file                              | Lines | Source range (cli/next-task.ts) |\n| ------------------------------------- | ----- | ------------------------------- |\n| `scheduler/types.ts`                  | ~80   | `TaskNode`, `WbsProgress`, `TaskStates`, `ExecutionSpan`, `NextTaskResult` |\n| `scheduler/build-tree.ts`             | ~450  | `treeNodesToTaskNodes` + `buildTaskTree`                                    |\n| `scheduler/task-states.ts`            | ~700  | `getCompletedTaskIds` + `getTaskStates`                                     |\n| `scheduler/execution-plan.ts`         | ~80   | `calculateExecutionPlan`                                                     |\n| `scheduler/find-next.ts`              | ~50   | `findNextTask`                                                               |\n| `scheduler/index.ts`                  | barrel | re-export public API                                                         |\n\n**Rules:**\n- No behavior change. Pure partitioning.\n- Every split file ≤500 lines.\n- Public API reaches through `scheduler/index.ts`. Consumers import from `../scheduler`.\n- Use `git mv` so file history is preserved.\n\n**Import sites to update (10):**\n- 6 `cli/commands-*.ts` files importing next-task\n- `cli/reconcile.ts`\n- `cli/autonomous-run.ts`\n- `cli/tree-display.ts`\n- `checkpoint/ensure-epic-checkpoints.ts`\n\nFind with: `grep -rn \"from.*cli/next-task\" packages/core/src`\n\n**Acceptance:**\n- PR1 scheduler suites green (they were written against future paths — should now resolve correctly)\n- `pnpm --filter @converge/core build` clean\n- `pnpm --filter @converge/core test` green\n- Every split file ≤500 lines\n- `madge --circular packages/core/src/scheduler` — no cycles"
  projectDir: "D:/converge"
  artifactsDir: "D:/converge/.converge/artifacts/split-cli/005-next-task-scheduler-shape"
  phaseTemplateDir: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/tasks/analyze"
  wbsSection: 
---

# Analyze — PR4 — Move cli/next-task.ts directly to scheduler-ready shape

Read the PR spec, inspect current code, and write a concrete implementation plan.

## Inputs

**PR summary:** Single-destination move of the 1449-line next-task.ts into packages/core/src/scheduler/, split into 5 files. PR10 becomes a directory-level git mv with zero reshuffle.

**Full spec:**

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

## Steps

1. **Read the spec** above carefully — it names exact file paths, line ranges, and acceptance criteria.
2. **Inspect current state:**
   - Read every file path named in the spec; note its current size, exports, imports.
   - Run `grep -rn "from.*<module>" packages/core/src` to enumerate real import sites — the spec's numbers are estimates, the grep is truth.
   - Check `git log --oneline -- <path>` for recent churn that might complicate the move.
3. **Identify risks:**
   - Cyclic imports introduced by the split
   - Public API paths that downstream packages (swebench, tbench) import from
   - Line-range drift since the spec was written — symbols may have moved
4. **Write the plan.**

## Output

Write `D:/converge/.converge/artifacts/split-cli/005-next-task-scheduler-shape/analyze/plan.md`:

```markdown
# PR4 — Move cli/next-task.ts directly to scheduler-ready shape — Analysis

## Source audit
- <file>: <current lines>, <exports>, <consumers found via grep>

## Implementation plan
1. Step — what to do and why
2. Step — ...

## Risks & mitigations
- <risk>: <mitigation>

## Acceptance checklist (copy from spec)
- [ ] <criterion>
- [ ] <criterion>
```
