---
id: extend-run-results-types-red
title: Red — failing tests for extended RunResults types
description: |
  Write unit tests that capture the extended type contract. Confirm RED —
  the types don't have the new fields yet.

inputs:
  - packages/core/src/manifest/types.ts

outputs:
  - packages/core/tests/manifest/run-results-types.test.ts

checks:
  - id: test-file-exists
    cmd: test -s packages/core/tests/manifest/run-results-types.test.ts
    description: Test file exists and is non-empty.
  - id: tests-fail
    cmd: "! pnpm --filter @converge/core test -- run-results-types 2>/dev/null"
    description: Tests fail (RED) — types not extended yet.
  - id: tests-have-assertions
    cmd: grep -cE 'expect\(|assert' packages/core/tests/manifest/run-results-types.test.ts | awk '$1+0 < 5 { exit 1 }'
    description: At least 5 assertions.

tags:
  - tdd
  - red
---

# Red — failing tests for extended RunResults types

Write `packages/core/tests/manifest/run-results-types.test.ts`. Cover:

1. **RunResult.status accepts pending**: a RunResult with `status: "pending"` typechecks
2. **RunResult.status accepts running**: `status: "running"` typechecks
3. **RunResult.status accepts skipped**: `status: "skipped"` typechecks
4. **RunResult has started_at**: optional ISO timestamp string
5. **RunResult has error_message**: optional error string
6. **RunResults.metadata has execution_id**: required string, not session_id
7. **RunResults.metadata has playbook**: required string
8. **RunResults.metadata has manifest_hash**: required string
9. **RunResults.metadata has status**: execution-level status
10. **No session_id on metadata**: compile error if accessed

Use `vitest` with `expectTypeOf` from `vitest` or structural assignment tests.

Run `pnpm --filter @converge/core test -- run-results-types`. Expected RED —
the current types don't have these fields.
