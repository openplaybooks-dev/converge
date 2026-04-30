---
id: 01-red
title: Red — failing tests for incremental tasks
description: |
  Unit: is_incremental returns false on first run, true thereafter
  (unless --full-refresh). Integration: a task with materialization:
  incremental runs once, then a second run is a no-op. Confirm RED.

dependencies: []

outputs:
  - "packages/core/tests/unit/task/incremental.test.ts"
  - "packages/cli/tests/integration/incremental.test.ts"

checks:
  - id: tests-exist
    cmd: |
      test -s packages/core/tests/unit/task/incremental.test.ts
      test -s packages/cli/tests/integration/incremental.test.ts
    description: Both test files exist.
  - id: tests-fail
    cmd: |
      cd packages/core && pnpm test -- tests/unit/task/incremental.test.ts 2>&1; test $? -ne 0
    description: Tests fail (RED).

tags:
  - tdd
  - red
---

# Red — incremental tests

Unit:
- `computeIncrementalContext({ materialization: 'incremental', priorRunResults: null })` →
  `{ is_incremental: false, this_state: null }`.
- With prior run results: `is_incremental: true`, `this_state` points
  at the prior outputs.
- With `--full-refresh`: `is_incremental: false` regardless.

Integration:
- Add an incremental task to the fixture (or extend
  `unseeded-wbs` — actually, add a new top-level task
  `incremental-task` to the fixture in this slice's green phase).
- Run once; assert outputs exist.
- Snapshot timestamps. Run again. Assert: outputs unchanged AND the
  task's skill was not invoked (e.g. via a sentinel file the skill
  appends to on each invocation; the test asserts the file's line
  count didn't grow).

RED.
