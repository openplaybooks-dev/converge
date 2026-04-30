---
id: 02-green
title: Green — remove the auto-revalidate call
description: |
  Delete the call to recheckEditedCompletedTasks from the --resume path in
  autonomous-run.ts. The function itself stays (used in phase 04). Make
  01-red green.

dependencies:
  - 01-red

inputs:
  - "packages/cli/tests/integration/no-auto-revalidate.test.ts"
  - "packages/cli/src/autonomous-run.ts"

outputs:
  - "packages/cli/src/autonomous-run.ts"

checks:
  - id: tests-pass
    cmd: cd packages/cli && pnpm test -- tests/integration/no-auto-revalidate.test.ts
    description: Test passes (GREEN).
  - id: existing-tests-still-pass
    cmd: cd packages/cli && pnpm test
    description: No CLI test regressed.
  - id: no-test-edits
    cmd: git diff --name-only HEAD -- packages/cli/tests/integration/no-auto-revalidate.test.ts | wc -l | awk '$1+0 > 0 { exit 1 }'
    description: Test was not edited.

tags:
  - tdd
  - green
---

# Green — remove the call

Open `packages/cli/src/autonomous-run.ts`. Find where `recheckEditedCompletedTasks`
is invoked (the audit found it around line 1066-1070 in the stateInit path).
Delete that call and any now-unused imports/setup. Leave the function
definition itself intact.

Run the full CLI test suite to confirm no regression. Refactor while green.
