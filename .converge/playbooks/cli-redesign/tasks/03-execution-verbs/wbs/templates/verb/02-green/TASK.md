---
id: 02-green
title: "Green — implement converge {{verb}}"
description: |
  Implement `packages/cli/{{source_file}}`. Wire into main.ts dispatcher.
  Make 01-red green. Refactor while green; do not edit the test.

dependencies:
  - 01-red

inputs:
  - "packages/cli/{{test_file}}"

outputs:
  - "packages/cli/{{source_file}}"

checks:
  - id: typecheck
    cmd: test -f package.json && pnpm --filter @converge/core --filter @converge/cli typecheck
    description: Typecheck passes.
  - id: cli-builds
    cmd: test -f packages/cli/package.json && pnpm --filter @converge/cli build
    description: CLI builds.
  - id: test-passes
    cmd: cd packages/cli && pnpm test -- {{test_file}}
    description: 01-red's test now passes (GREEN).
  - id: dispatcher-wired
    cmd: grep -q 'case "{{verb}}"' packages/cli/src/main.ts
    description: main.ts routes {{verb}} to the new command.
  - id: no-test-edits
    cmd: test -d .git && git diff --name-only HEAD -- packages/cli/{{test_file}} | wc -l | awk '$1+0 > 0 { exit 1 }'
    description: Test was not edited during green.
  - id: no-other-tests-regressed
    cmd: cd packages/cli && pnpm test
    description: No other CLI test regressed.

tags:
  - tdd
  - green
---

# Green — implement {{verb}}

Implement the verb in `packages/cli/{{source_file}}`. Use the parser and
resolver from phase 01 to convert `--select`/`--exclude` into a task ID
set. Use the existing autonomous-run code path (where applicable) for
execution.

Wire into `packages/cli/src/main.ts` by adding `case "{{verb}}":` next
to the existing dispatcher cases.

Refactor while green. Do not touch the test file. If the test is wrong,
revert your green work, return to 01-red, fix, and come back.

## Verb-specific notes

{{verb_description}}

Required behavior to satisfy the test assertions:

{{extra_assertions}}
