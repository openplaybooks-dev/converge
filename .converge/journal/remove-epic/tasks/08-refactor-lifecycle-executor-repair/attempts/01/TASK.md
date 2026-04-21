# Task: 08-refactor-lifecycle-executor-repair

Remove epicId from execution pipeline files. Replace with playbookId where context is needed.

**Lifecycle** (~6 files):
- `packages/core/src/lifecycle/task-runner.ts` (~28 occurrences)
- `packages/core/src/lifecycle/before.ts` (~18 occurrences)
- `packages/core/src/lifecycle/after.ts` (~15 occurrences)
- `packages/core/src/lifecycle/correct.ts` (~15 occurrences)
- `packages/core/src/lifecycle/ancestor-propagation.ts` (~24 occurrences)
- `packages/core/src/lifecycle/context-propagation.ts` (~12 occurrences)
- Also: summary.ts, prune.ts, diagnose.ts, context-snapshot.ts

**Executor** (~6 files):
- `packages/core/src/executor/task-executor.ts` (~10 occurrences)
- `packages/core/src/executor/function-executor.ts` (~12 occurrences)
- `packages/core/src/executor/spawn-runner.ts` (~13 occurrences)
- `packages/core/src/executor/loop-executor.ts` (~16 occurrences)
- `packages/core/src/executor/plan-executor.ts` (~7 occurrences)
- `packages/core/src/executor/wbs-executor.ts` (~6 occurrences)

**Repair** (~10 files):
- `packages/core/src/repair/strategies/dependency-backoff.ts` (~41 occurrences — heaviest)
- `packages/core/src/repair/strategies/incomplete-producer-output.ts` (~15 occurrences)
- `packages/core/src/repair/navigator/actions.ts` (~14 occurrences)
- `packages/core/src/repair/helpers/task.ts` (~7 occurrences)
- `packages/core/src/repair/strategies/missing-input-pattern.ts` (~7 occurrences)
- Plus remaining repair files with fewer occurrences

For each file: replace epicId with playbookId where context is needed, or remove entirely where it was just epic grouping.