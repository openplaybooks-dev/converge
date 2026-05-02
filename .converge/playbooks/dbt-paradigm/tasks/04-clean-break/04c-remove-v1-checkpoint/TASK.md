---
title: Strip V1 checkpoint compatibility from 8 locations
description: |
  Remove all `version === 1` branching. V1 checkpoints are no longer
  supported. Keep only V2 code paths.

inputs:
  - packages/core/src/checkpoint/manager.ts
  - packages/core/src/checkpoint/migration.ts
  - packages/core/src/task/tree/task-tree.ts
  - packages/core/src/task/lifecycle/ancestor-propagation.ts
  - packages/cli/src/commands.ts
  - packages/cli/src/next-task.ts

outputs:
  - packages/core/src/checkpoint
  - packages/core/src/task
  - packages/cli/src/commands.ts
  - packages/cli/src/next-task.ts

checks:
  - id: no-v1-branching
    cmd: test -f packages/cli/src/commands.ts && ! grep -rq 'version === 1' packages/core/src/checkpoint/ packages/core/src/task/ packages/cli/src/commands.ts packages/cli/src/next-task.ts
    description: No V1 checkpoint version branching.
  - id: typecheck-green
    cmd: test -f packages/cli/src/commands.ts && pnpm -r typecheck
    description: Repo typechecks.
  - id: tests-green
    cmd: test -f packages/cli/src/commands.ts && pnpm -r test
    description: All tests pass.

skills: []
references: []

vars: {}
dependencies:
  - 04b-remove-dead-code
---

# 04c — Remove V1 checkpoint compat

## Locations

| File | Lines |
|---|---|
| `packages/core/src/checkpoint/manager.ts` | 170, 304, 359 |
| `packages/core/src/checkpoint/migration.ts` | 26 |
| `packages/core/src/task/tree/task-tree.ts` | 713, 718, 785 |
| `packages/core/src/task/lifecycle/ancestor-propagation.ts` | 251 |
| `packages/cli/src/commands.ts` | 843, 1009, 1025 |
| `packages/cli/src/next-task.ts` | 478, 1180, 1193 |

## Procedure per location

1. Find the `version === 1` / `version === "1"` condition.
2. Keep the V2 branch, remove the V1 branch.
3. If V2 was the fallback, make it the default.
4. Run tests — must stay green.
5. Remove newly unused imports.

## Done when

All 3 checks pass.
