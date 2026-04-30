---
id: 01-red
title: Red — failing test for --full-refresh
description: |
  Run an incremental task to completion. Run again with --full-refresh.
  Assert: the skill IS invoked the second time (sentinel file grows).
  Confirm RED.

dependencies: []

outputs:
  - "packages/cli/tests/integration/full-refresh.test.ts"

checks:
  - id: test-exists
    cmd: test -s packages/cli/tests/integration/full-refresh.test.ts
    description: Test exists.
  - id: test-fails
    cmd: cd packages/cli && pnpm test -- tests/integration/full-refresh.test.ts 2>&1; test $? -ne 0
    description: Test fails (RED).

tags:
  - tdd
  - red
---

# Red — full-refresh test

Inverse of `01-incremental`'s no-op test. After two runs the sentinel
should show two invocations when --full-refresh is passed on the second
run. RED.
