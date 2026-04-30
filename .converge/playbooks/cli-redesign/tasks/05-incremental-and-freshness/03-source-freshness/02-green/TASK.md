---
id: 02-green
title: Green — implement source freshness
description: |
  Implement packages/core/src/freshness/ and packages/cli/src/commands-source.ts.
  Extend the fixture with fresh-source and stale-source tasks. Make
  01-red green.

dependencies:
  - 01-red

inputs:
  - "packages/core/tests/unit/freshness/freshness.test.ts"
  - "packages/cli/tests/integration/source-freshness.test.ts"

outputs:
  - "packages/core/src/freshness/types.ts"
  - "packages/core/src/freshness/index.ts"
  - "packages/cli/src/commands-source.ts"
  - "packages/cli/tests/fixtures/minimal-playbook/fresh-source/TASK.md"
  - "packages/cli/tests/fixtures/minimal-playbook/stale-source/TASK.md"

checks:
  - id: tests-pass
    cmd: |
      cd packages/core && pnpm test -- tests/unit/freshness
      cd packages/cli && pnpm test -- tests/integration/source-freshness.test.ts
    description: Both tests pass.
  - id: dispatcher
    cmd: grep -q 'case "source"' packages/cli/src/main.ts
    description: source command routed.
  - id: no-test-edits
    cmd: |
      test -d .git && git diff --name-only HEAD -- packages/core/tests/unit/freshness/ packages/cli/tests/integration/source-freshness.test.ts | wc -l | awk '$1+0 > 0 { exit 1 }'
    description: Tests not edited.

tags:
  - tdd
  - green
---

# Green — implement freshness

`freshness/types.ts` — `FreshnessSpec`, `FreshnessResult` types.
`freshness/index.ts` — `evaluateFreshness(spec, now)`,
`evaluateAllSources(playbook, projectDir, now)`.

`commands-source.ts` — handles `source freshness` subcommand. Iterates
selected tasks with `freshness:` declarations, calls evaluateFreshness,
prints `<task_id>   <status>   <delta>` per row, exits non-zero on any
error.

Wire into main.ts's dispatcher: `case "source":` peeks at the next arg
to decide subcommand (currently only `freshness`; future `freshness
--check` etc. expand here).

Refactor while green.
