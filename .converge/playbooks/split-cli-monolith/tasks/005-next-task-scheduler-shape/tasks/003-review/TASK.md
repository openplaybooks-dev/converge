---
id: 003-review
title: Review — PR4 — Move cli/next-task.ts directly to scheduler-ready shape
checks:
  - id: review-approved
    description: Code review passed
    cmd: "grep -q 'APPROVED' D:/converge/.converge/artifacts/split-cli/005-next-task-scheduler-shape/review/report.md"
vars:
  taskId: 003-review
  parentId: 005-next-task-scheduler-shape
  title: PR4 — Move cli/next-task.ts directly to scheduler-ready shape
  tier: 2 — In-core reorg
  task: "Single-destination move of the 1449-line next-task.ts into packages/core/src/scheduler/, split into 5 files. PR10 becomes a directory-level git mv with zero reshuffle."
  spec: "Move `packages/core/src/cli/next-task.ts` (1449 L) directly to `packages/core/src/scheduler/` — the location that becomes `packages/scheduler/src/` in PR10. This avoids a double-move: PR10 will be a `git mv` of a directory.\n\n**Why not `tree/next-task/`:** that was the prior plan, but it means two moves (cli → tree, then tree → scheduler pkg). Going directly to `scheduler/` now makes PR10 a mechanical directory rename.\n\n**Target split:**\n\n| New file                              | Lines | Source range (cli/next-task.ts) |\n| ------------------------------------- | ----- | ------------------------------- |\n| `scheduler/types.ts`                  | ~80   | `TaskNode`, `WbsProgress`, `TaskStates`, `ExecutionSpan`, `NextTaskResult` |\n| `scheduler/build-tree.ts`             | ~450  | `treeNodesToTaskNodes` + `buildTaskTree`                                    |\n| `scheduler/task-states.ts`            | ~700  | `getCompletedTaskIds` + `getTaskStates`                                     |\n| `scheduler/execution-plan.ts`         | ~80   | `calculateExecutionPlan`                                                     |\n| `scheduler/find-next.ts`              | ~50   | `findNextTask`                                                               |\n| `scheduler/index.ts`                  | barrel | re-export public API                                                         |\n\n**Rules:**\n- No behavior change. Pure partitioning.\n- Every split file ≤500 lines.\n- Public API reaches through `scheduler/index.ts`. Consumers import from `../scheduler`.\n- Use `git mv` so file history is preserved.\n\n**Import sites to update (10):**\n- 6 `cli/commands-*.ts` files importing next-task\n- `cli/reconcile.ts`\n- `cli/autonomous-run.ts`\n- `cli/tree-display.ts`\n- `checkpoint/ensure-epic-checkpoints.ts`\n\nFind with: `grep -rn \"from.*cli/next-task\" packages/core/src`\n\n**Acceptance:**\n- PR1 scheduler suites green (they were written against future paths — should now resolve correctly)\n- `pnpm --filter @converge/core build` clean\n- `pnpm --filter @converge/core test` green\n- Every split file ≤500 lines\n- `madge --circular packages/core/src/scheduler` — no cycles"
  projectDir: "D:/converge"
  artifactsDir: "D:/converge/.converge/artifacts/split-cli/005-next-task-scheduler-shape"
  phaseTemplateDir: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/tasks/review"
  wbsSection: 
---

# Code review — PR4 — Move cli/next-task.ts directly to scheduler-ready shape

Review the diff against the PR spec and acceptance criteria.

## Inputs

- **PR summary:** Single-destination move of the 1449-line next-task.ts into packages/core/src/scheduler/, split into 5 files. PR10 becomes a directory-level git mv with zero reshuffle.
- **Full spec:**

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

- Analysis: `D:/converge/.converge/artifacts/split-cli/005-next-task-scheduler-shape/analyze/plan.md`
- Implementation plan: `D:/converge/.converge/artifacts/split-cli/005-next-task-scheduler-shape/implement/plan.md`

## Review criteria

1. **Alignment** — does the diff match the spec? Files named in the spec should be the only files changed (plus strictly required import updates). If scope drifted, **REJECT**.
2. **Acceptance criteria** — every bullet in the spec's Acceptance block must be satisfied. If not, REJECT.
3. **Behavior-locking tests (PR1)** — still green? If a move/split broke them, the split is wrong, REJECT.
4. **No shims** — the user explicitly chose hard breaks for public exports (PR4, PR13). If a re-export shim was added "for safety", REJECT.
5. **Line limits** — for split PRs (3, 5, 6, 9), every new file ≤500 lines. If any file is larger, REJECT.
6. **Layering (CRITICAL for Tier B, PR10–PR13)** — `@converge/core` is the programmatic interface; `@converge/cli` is the terminal-facing shell; a future web UI must be able to integrate directly with `core` without touching `cli` or `display`. Run these audits and **REJECT** on any hit:
   - `grep -rn "@converge/display\|@converge/cli" packages/core/src` → no matches (core never imports CLI-layer packages)
   - `grep -n "@converge/display\|@converge/cli" packages/core/package.json` → no matches
   - `grep -rn "process\.exit\|process\.stdout\.write\|process\.stderr\.write" packages/core/src` → no matches
   - `grep -rn "console\.\(log\|error\|warn\|info\)" packages/core/src | grep -v ".test.ts"` → no matches
   - `grep -rn "@converge/display" packages/scheduler/src packages/journal/src 2>/dev/null` → no matches
7. **Style** — matches existing codebase conventions.

## Steps

1. `git diff --stat` — confirm only spec-scoped files changed.
2. `git diff` — read the full diff.
3. Re-run `pnpm test` to confirm green.
4. Compare diff against each Acceptance bullet.

## Output

Write `D:/converge/.converge/artifacts/split-cli/005-next-task-scheduler-shape/review/report.md`:
- If acceptable: `APPROVED` on its own line, followed by brief notes.
- If not: `REJECTED` on its own line, followed by specific, actionable feedback so the implement phase knows what to fix.
