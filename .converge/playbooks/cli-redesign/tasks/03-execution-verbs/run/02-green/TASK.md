---
id: run/02-green
title: Green — implement converge run
description: "Implement `packages/cli/src/commands-run.ts`. Wire into main.ts dispatcher.\nMake 01-red green. Refactor while green; do not edit the test.\n"
dependencies:
  - 01-red
tags:
  - tdd
  - green
inputs:
  - packages/cli/tests/integration/run-select.test.ts
outputs:
  - packages/cli/src/commands-run.ts
checks:
  - id: typecheck
    description: Typecheck passes.
    cmd: "test -f package.json && pnpm --filter @openplaybooks/converge-core --filter @openplaybooks/converge-cli typecheck"
  - id: cli-builds
    description: CLI builds.
    cmd: "test -f packages/cli/package.json && pnpm --filter @openplaybooks/converge-cli build"
  - id: test-passes
    description: "01-red's test now passes (GREEN)."
    cmd: "cd packages/cli && pnpm test -- tests/integration/run-select.test.ts"
  - id: dispatcher-wired
    description: main.ts routes run to the new command.
    cmd: "grep -q 'case \"run\"' packages/cli/src/main.ts"
  - id: no-other-tests-regressed
    description: No other CLI test regressed.
    cmd: "cd packages/cli && pnpm test"
vars:
  verb: run
  verb_description: Execute selected tasks via the convergence loop.
  test_file: tests/integration/run-select.test.ts
  source_file: src/commands-run.ts
  extra_assertions: "- run --select tag:trivial executes only trivial-task\n- run --select <substr> still works (name: default)\n- run --step + --select runs one iteration of the first match"
---

# Green — implement run

Implement the verb in `packages/cli/src/commands-run.ts`. Use the parser and
resolver from phase 01 to convert `--select`/`--exclude` into a task ID
set. Use the existing autonomous-run code path (where applicable) for
execution.

Wire into `packages/cli/src/main.ts` by adding `case "run":` next
to the existing dispatcher cases.

Refactor while green. Do not touch the test file. If the test is wrong,
revert your green work, return to 01-red, fix, and come back.

## Verb-specific notes

Execute selected tasks via the convergence loop.

Required behavior to satisfy the test assertions:

- run --select tag:trivial executes only trivial-task
- run --select <substr> still works (name: default)
- run --step + --select runs one iteration of the first match
