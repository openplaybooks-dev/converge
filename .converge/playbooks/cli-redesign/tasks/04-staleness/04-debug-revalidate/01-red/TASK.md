---
id: 01-red
title: Red — failing test for debug --revalidate
description: |
  Set up: a completed task whose output is then deleted (so checks fail).
  Run `converge debug --revalidate`. Assert: it reports the failure but
  does NOT auto-revert the task. Confirm RED.

dependencies: []

outputs:
  - "packages/cli/tests/integration/debug-revalidate.test.ts"

checks:
  - id: test-exists
    cmd: test -s packages/cli/tests/integration/debug-revalidate.test.ts
    description: Test exists.
  - id: test-fails
    cmd: test -e packages/cli/tests/integration/debug-revalidate.test.ts && cd packages/cli && ! pnpm test -- tests/integration/debug-revalidate.test.ts
    description: Test fails (RED).

tags:
  - tdd
  - red
---

# Red — debug --revalidate test

Test sequence:
1. Run trivial-task to completion.
2. Delete the output file.
3. `converge debug --revalidate` — assert exit code 1 (some check
   failed) and stderr contains "trivial-task" + "fail".
4. After the command, the checkpoint still says "complete" (no
   auto-revert; that's the point of opt-in).

RED.
