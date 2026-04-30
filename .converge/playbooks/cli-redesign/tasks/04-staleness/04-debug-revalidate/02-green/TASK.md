---
id: 02-green
title: Green — implement debug --revalidate
description: |
  Implement commands-debug.ts. Reuse the recheckEditedCompletedTasks
  function (its automatic call was removed in
  03-execution-verbs/00-remove-auto-revalidate; the function itself
  remained for this slice).

dependencies:
  - 01-red

inputs:
  - "packages/cli/tests/integration/debug-revalidate.test.ts"
  - "packages/cli/src/autonomous-run.ts"

outputs:
  - "packages/cli/src/commands-debug.ts"

checks:
  - id: tests-pass
    cmd: cd packages/cli && pnpm test -- tests/integration/debug-revalidate.test.ts
    description: Test passes.
  - id: dispatcher
    cmd: grep -q 'case "debug"' packages/cli/src/main.ts
    description: dispatcher wired.
  - id: no-test-edits
    cmd: git diff --name-only HEAD -- packages/cli/tests/integration/debug-revalidate.test.ts | wc -l | awk '$1+0 > 0 { exit 1 }'
    description: Test not edited.

tags:
  - tdd
  - green
---

# Green — implement debug

`commands-debug.ts` handles two flags initially:
- `--revalidate` — run checks of selected completed tasks; report
  per-task pass/fail; exit 1 if any fail; do NOT modify checkpoint.
- (later: `--fix` for structural reconciliation, inherited from today's
  `verify --fix`. Out of scope for this slice; cover in phase 06's
  migration table.)

Refactor while green.
