---
id: test/02-green
title: Green — implement converge test
description: "Implement `packages/cli/src/commands-test.ts`. Wire into main.ts dispatcher.\nMake 01-red green. Refactor while green; do not edit the test.\n"
dependencies:
  - 01-red
tags:
  - tdd
  - green
inputs:
  - packages/cli/tests/integration/test-verb.test.ts
outputs:
  - packages/cli/src/commands-test.ts
checks:
  - id: typecheck
    description: Typecheck passes.
    cmd: "test -f package.json && pnpm --filter @converge/core --filter @converge/cli typecheck"
  - id: cli-builds
    description: CLI builds.
    cmd: "test -f packages/cli/package.json && pnpm --filter @converge/cli build"
  - id: test-passes
    description: "01-red's test now passes (GREEN)."
    cmd: "cd packages/cli && pnpm test -- tests/integration/test-verb.test.ts"
  - id: dispatcher-wired
    description: main.ts routes test to the new command.
    cmd: "grep -q 'case \"test\"' packages/cli/src/main.ts"
  - id: no-other-tests-regressed
    description: No other CLI test regressed.
    cmd: "cd packages/cli && pnpm test"
vars:
  verb: test
  verb_description: "Run only the checks: block of selected tasks."
  test_file: tests/integration/test-verb.test.ts
  source_file: src/commands-test.ts
  extra_assertions: "- test does not invoke task executors (no LLM calls, no mutations)\n- test reports per-task pass/fail per check"
---

# Green — implement test

Implement the verb in `packages/cli/src/commands-test.ts`. Use the parser and
resolver from phase 01 to convert `--select`/`--exclude` into a task ID
set. Use the existing autonomous-run code path (where applicable) for
execution.

Wire into `packages/cli/src/main.ts` by adding `case "test":` next
to the existing dispatcher cases.

Refactor while green. Do not touch the test file. If the test is wrong,
revert your green work, return to 01-red, fix, and come back.

## Verb-specific notes

Run only the checks: block of selected tasks.

Required behavior to satisfy the test assertions:

- test does not invoke task executors (no LLM calls, no mutations)
- test reports per-task pass/fail per check
