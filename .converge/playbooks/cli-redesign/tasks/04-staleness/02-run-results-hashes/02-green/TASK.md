---
id: 02-green
title: Green — implement run-results writer
description: |
  Implement packages/core/src/manifest/run-results.ts. Wire into the
  task-completion hot path of commands-run.ts (and downstream:
  build, retry consume the same writer). Make 01-red green.

dependencies:
  - 01-red

inputs:
  - "packages/core/tests/unit/manifest/run-results.test.ts"

outputs:
  - "packages/core/src/manifest/run-results.ts"

checks:
  - id: typecheck
    cmd: test -f package.json && pnpm --filter @openplaybooks/converge-core --filter @openplaybooks/converge typecheck
    description: Typechecks.
  - id: unit-passes
    cmd: cd packages/core && pnpm test -- tests/unit/manifest/run-results.test.ts
    description: Unit test passes.
  - id: run-passes
    cmd: cd packages/cli && pnpm test -- tests/integration/compile.test.ts
    description: Existing compile integration test still passes (no regression).
tags:
  - tdd
  - green
---

# Green — implement and wire

`run-results.ts` exports `writeRunResults`, `readRunResults`, and a
`hashOutputs(projectDir, outputPaths)` helper. Atomic write (same
temp+rename pattern as writeManifest).

Wire into the task-completion path: when a task transitions to complete
in commands-run.ts, append a result entry with computed output_hashes.

Refactor while green.
