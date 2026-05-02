---
id: converge-runner-red
title: Red — baseline test for converge-runner
outputs: packages/core/tests/converge-runner.test.ts
checks:
  - id: test-file-exists
    cmd: test -s packages/core/tests/converge-runner.test.ts
  - id: baseline-passes
    cmd: pnpm --filter @converge core test -- converge-runner
tags: [tdd, red]
---

# Red — converge-runner baseline

Write test capturing that the converge runner loads a playbook,
executes tasks, and returns results. This captures the current
wave-loop behavior.
