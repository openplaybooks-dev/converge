---
id: 02-green
title: Green — wire --full-refresh through the dispatcher
description: |
  Plumb --full-refresh from main.ts down to computeIncrementalContext.
  Make 01-red green.

dependencies:
  - 01-red

inputs:
  - "packages/cli/tests/integration/full-refresh.test.ts"
  - "packages/core/src/task/incremental.ts"

outputs:
  - "packages/cli/src/main.ts"

checks:
  - id: tests-pass
    cmd: cd packages/cli && pnpm test -- tests/integration/full-refresh.test.ts
    description: Test passes.
tags:
  - tdd
  - green
---

# Green — wire the flag

main.ts's option-parser already handles --full-refresh as a parsed
boolean (it's a global flag). This slice ensures the boolean reaches
the incremental-context computation in run/build/retry.

Refactor while green.
