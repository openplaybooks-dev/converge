---
id: 01-red
title: Red — test asserting --resume does NOT auto-revalidate
description: |
  Set up a fixture where: a task is complete in checkpoint, its TASK.md
  is then mtime-touched. Run `converge run --resume`. Assert: the task
  remains complete, its checks were not re-run.

dependencies: []

outputs:
  - "packages/cli/tests/integration/no-auto-revalidate.test.ts"

checks:
  - id: test-exists
    cmd: test -s packages/cli/tests/integration/no-auto-revalidate.test.ts
    description: Test exists.
  - id: test-fails
    cmd: test -e packages/cli/tests/integration/no-auto-revalidate.test.ts && cd packages/cli && ! pnpm test -- tests/integration/no-auto-revalidate.test.ts
    description: Test fails (RED) — current behavior auto-revalidates, so the assertion fails.

tags:
  - tdd
  - red
---

# Red — assert no auto-revalidate

Fixture setup:
1. Run `converge run` once on the minimal-playbook fixture; complete
   `trivial-task`.
2. Touch `tasks/trivial-task/TASK.md` (update mtime).
3. Spy on or capture stdout/stderr.
4. Run `converge run --resume`.

Assertion: the output does not mention re-validation; the task stays in
its complete state without re-running checks. Today's behavior would
re-run the check (you can detect this by deleting the output file before
step 3 — current code re-validates, finds it missing, marks the task
pending; the test asserts the task remains complete).

Confirm RED.
