---
id: run-results-manager-impl-red
title: Red — failing tests for RunResultsManager
description: |
  Write comprehensive unit tests for RunResultsManager. Cover full lifecycle.
  Expected RED — module doesn't exist yet.

inputs:
  - packages/core/src/manifest/types.ts

outputs:
  - packages/core/tests/manifest/run-results-manager.test.ts

checks:
  - id: test-file-exists
    cmd: test -s packages/core/tests/manifest/run-results-manager.test.ts
    description: Test file exists and is non-empty.
  - id: tests-fail
    cmd: "! pnpm --filter @converge/core test -- run-results-manager 2>/dev/null"
    description: Tests fail (RED) — module doesn't exist yet.
  - id: tests-have-assertions
    cmd: grep -cE 'expect\(|assert' packages/core/tests/manifest/run-results-manager.test.ts | awk '$1+0 < 8 { exit 1 }'
    description: At least 8 assertions.

tags:
  - tdd
  - red
---

# Red — failing tests for RunResultsManager

Write `packages/core/tests/manifest/run-results-manager.test.ts`. Cover:

1. **Initialization**: constructor creates run_results.json with all manifest nodes `pending`
2. **markRunning**: sets status to `running`, increments attempts, returns attempt number
3. **markComplete**: sets status to `pass`, records duration
4. **markFailed**: sets status to `error`, records error message and duration
5. **markSkipped**: sets status to `skipped`
6. **Full lifecycle**: pending → running → complete
7. **Failed lifecycle**: pending → running → failed
8. **isComplete**: returns true only for `pass` status
9. **isFailed**: returns true only for `error` status
10. **isLocked**: returns true for complete, failed, or skipped
11. **Attempt counting**: incrementAttempt returns correct sequential numbers
12. **Node isolation**: mutations on one node don't affect another
13. **Atomic write**: partial writes don't corrupt existing data
14. **getResultsSnapshot**: returns full RunResults object

Use vitest. Create a temp directory for each test (use `fs.mkdtemp` or vitest's
`tmpdir`). Create a minimal Manifest for test initialization.

Run `pnpm --filter @converge/core test -- run-results-manager`. Expected RED —
the module doesn't exist yet.
