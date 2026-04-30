---
id: 02-green
title: Green — implement compile --seed
description: |
  Extend commands-compile.ts to handle --seed. Invoke WbsExecutor for each
  selected unseeded parent. Make 01-red green.

dependencies:
  - 01-red

inputs:
  - "packages/cli/tests/integration/compile-seed.test.ts"

outputs:
  - "packages/cli/src/commands-compile.ts"

checks:
  - id: tests-pass
    cmd: cd packages/cli && pnpm test -- tests/integration/compile-seed.test.ts
    description: Test passes.
  - id: existing-compile-still-passes
    cmd: cd packages/cli && pnpm test -- tests/integration/compile.test.ts
    description: 02-compile's existing test did not regress.
  - id: no-test-edits
    cmd: test -d .git && git diff --name-only HEAD -- packages/cli/tests/integration/compile-seed.test.ts | wc -l | awk '$1+0 > 0 { exit 1 }'
    description: Test not edited.

tags:
  - tdd
  - green
---

# Green — implement --seed

When `--seed` is set:
1. Resolve the selection to a set of WBS-parent task IDs.
2. For each: instantiate WbsExecutor, run.
3. After all seeding, fall through to the normal compile path so the
   manifest reflects the now-materialized children.

If a parent's WBS errors, fail the whole compile with a clear message
naming the failing parent. Don't write a partial manifest.

Refactor while green.
