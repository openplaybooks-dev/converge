---
id: 02-green
title: Green — implement incremental computation and template vars
description: |
  Implement packages/core/src/task/incremental.ts. Inject is_incremental
  and this_state into the skill prompt template. Extend the fixture
  with an incremental task. Make 01-red green.

dependencies:
  - 01-red

inputs:
  - "packages/core/tests/unit/task/incremental.test.ts"
  - "packages/cli/tests/integration/incremental.test.ts"

outputs:
  - "packages/core/src/task/incremental.ts"
  - "packages/cli/tests/fixtures/minimal-playbook/incremental-task/TASK.md"

checks:
  - id: typecheck
    cmd: test -f package.json && pnpm -r typecheck
    description: Typechecks.
  - id: tests-pass
    cmd: |
      cd packages/core && pnpm test -- tests/unit/task/incremental.test.ts
      cd packages/cli && pnpm test -- tests/integration/incremental.test.ts
    description: Both unit and integration tests pass.
  - id: no-test-edits
    cmd: |
      test -d .git && git diff --name-only HEAD -- packages/core/tests/unit/task/incremental.test.ts | wc -l | awk '$1+0 > 0 { exit 1 }'
      test -d .git && git diff --name-only HEAD -- packages/cli/tests/integration/incremental.test.ts | wc -l | awk '$1+0 > 0 { exit 1 }'
    description: Tests not edited.

tags:
  - tdd
  - green
---

# Green — implement incremental

`incremental.ts` exports `computeIncrementalContext({ task, priorRunResults, fullRefresh })`.

Wire into the skill prompt-template substitution path: when a task has
`materialization: incremental`, auto-inject `is_incremental` and
`this_state` into the vars passed to the prompt template.

`this_state` points at the prior outputs. Per the open question in the
phase TASK.md, default to a `target/last/` symlink updated after every
successful run.

Refactor while green.
