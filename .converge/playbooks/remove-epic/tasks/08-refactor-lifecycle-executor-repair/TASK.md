---
id: 08-refactor-lifecycle-executor-repair
title: Refactor lifecycle, executor, and repair systems — epicId → playbookId
blocking: true
dependencies: [07-refactor-journal]
---

Remove epicId from execution pipeline files. Replace with playbookId where context is needed.

**Lifecycle (~6 files):**
- `packages/core/src/lifecycle/task-runner.ts`
- `packages/core/src/lifecycle/before.ts`
- `packages/core/src/lifecycle/after.ts`
- `packages/core/src/lifecycle/correct.ts`
- `packages/core/src/lifecycle/ancestor-propagation.ts`
- `packages/core/src/lifecycle/context-propagation.ts`
- Plus: summary.ts, prune.ts, diagnose.ts, context-snapshot.ts

For each: replace `ctx.epicId` with `ctx.playbookId`, update method signatures, remove epic grouping.

**Executor (~6 files):**
- `packages/core/src/executor/task-executor.ts`
- `packages/core/src/executor/function-executor.ts`
- `packages/core/src/executor/spawn-runner.ts`
- `packages/core/src/executor/loop-executor.ts`
- `packages/core/src/executor/plan-executor.ts`
- `packages/core/src/executor/wbs-executor.ts`

For each: replace epicId with playbookId, remove epic-specific logic.

**Repair (~10 files):**
- `packages/core/src/repair/strategies/dependency-backoff.ts`
- `packages/core/src/repair/strategies/incomplete-producer-output.ts`
- `packages/core/src/repair/navigator/actions.ts`
- `packages/core/src/repair/helpers/task.ts`
- `packages/core/src/repair/strategies/missing-input-pattern.ts`
- Plus remaining repair files

For each: replace epicId with playbookId, remove epic path references (e.g., `.converge/epics/{epicId}/...`).
