---
id: 01-red
title: Red — failing integration test for compile --seed
description: |
  Test that `compile --seed` runs the unseeded-wbs's WBS script,
  materializes children, then the next `compile` shows them as concrete.
  Confirm RED.

dependencies: []

outputs:
  - "packages/cli/tests/integration/compile-seed.test.ts"

checks:
  - id: test-exists
    cmd: test -s packages/cli/tests/integration/compile-seed.test.ts
    description: Test exists.
  - id: test-fails
    cmd: test -e packages/cli/tests/integration/compile-seed.test.ts && cd packages/cli && ! pnpm test -- tests/integration/compile-seed.test.ts
    description: Test fails (RED).

tags:
  - tdd
  - red
---

# Red — compile --seed test

Steps:
1. `compile` — manifest has unseeded-wbs as `frontier`.
2. `compile --seed --select 'unseeded-wbs'` — runs WBS, child task TASK.md
   appears on disk.
3. `compile` — manifest now has the child as `concrete`; frontier_count
   is 0.

The test will fail because `--seed` isn't yet handled. RED.
