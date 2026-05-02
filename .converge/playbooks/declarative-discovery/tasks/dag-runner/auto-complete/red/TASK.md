---
id: auto-complete-red
title: Red — tests confirming navigator-graph auto-completion (outputs + checks)
description: |
  Write tests that call `converge()` against fixture tasks to confirm
  the existing auto-completion behavior: a task whose outputs exist AND
  checks pass is skipped. Run them — should pass (logic already exists).
  If they fail, the integration point is wrong.

outputs:
  - packages/core/tests/dag/auto-complete.test.ts

checks:
  - id: test-file-exists
    cmd: test -s packages/core/tests/dag/auto-complete.test.ts
    description: Test file exists.
  - id: at-least-6-assertions
    cmd: grep -cE 'expect\(|assert' packages/core/tests/dag/auto-complete.test.ts | awk '$1+0 < 6 { exit 1 }'
    description: At least 6 assertions.

tags: [tdd, red]
---

# Red — confirm navigator-graph auto-completion

Write `packages/core/tests/dag/auto-complete.test.ts`.

## Existing logic to test

The navigator-graph's `converge()` already calls `check-outputs-exist`
which runs `findGaps()`. This checks outputs AND checks.

## Test scenarios

1. **Outputs present + checks pass → skipped**: Create a fixture task
   with pre-existing output files and passing checks. Call `converge()`.
   Assert it returns `{ success: true }` WITHOUT running the executor.
   The task body is never invoked.

2. **Missing output → runs**: Remove one output file. Call `converge()`.
   Assert the task executor IS invoked (output needs to be generated).

3. **Failing check → runs**: Outputs exist but a check exits non-zero.
   Call `converge()`. Assert the task executor IS invoked.

4. **Both outputs AND checks must hold**: Outputs present but checks
   fail → runs. Checks pass but output missing → runs. Both hold →
   skipped. Confirm this AND relationship.

5. **Corrupted output → runs**: Output file exists but is invalid
   (e.g., empty PNG). `findGaps()` detects corruption gap. Task runs.

6. **No outputs, no checks → runs**: Nothing to auto-complete.
   `check-outputs-exist` skips (returns continue). Task runs normally.

Run `pnpm --filter @converge core test -- auto-complete`.
