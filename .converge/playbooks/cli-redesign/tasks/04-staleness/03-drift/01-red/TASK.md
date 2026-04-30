---
id: 01-red
title: Red — failing test for state:modified.drifted
description: |
  Test: run a task to completion (run_results captures output_hashes).
  Hand-edit one output. Run `list --select state:modified.drifted`.
  Assert the task is reported. Confirm RED.

dependencies: []

outputs:
  - "packages/cli/tests/integration/drift.test.ts"

checks:
  - id: test-exists
    cmd: test -s packages/cli/tests/integration/drift.test.ts
    description: Test exists.
  - id: test-fails
    cmd: test -e packages/cli/tests/integration/drift.test.ts && cd packages/cli && ! pnpm test -- tests/integration/drift.test.ts
    description: Test fails (RED) — drift predicate is still stubbed.

tags:
  - tdd
  - red
---

# Red — drift test

Sequence:
1. Run trivial-task on the fixture; run_results captures its output's hash.
2. Append a byte to the output file (drift).
3. `list --select 'state:modified.drifted'` should print trivial-task.
4. Without drift, the same selection should print nothing.

RED.
