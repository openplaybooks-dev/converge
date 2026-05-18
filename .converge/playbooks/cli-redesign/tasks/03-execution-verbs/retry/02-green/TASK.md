---
id: retry/02-green
title: Green — implement converge retry
description: "Implement `packages/cli/src/commands-retry.ts`. Wire into main.ts dispatcher.\nMake 01-red green. Refactor while green; do not edit the test.\n"
dependencies:
  - 01-red
tags:
  - tdd
  - green
inputs:
  - packages/cli/tests/integration/retry.test.ts
outputs:
  - packages/cli/src/commands-retry.ts
checks:
  - id: typecheck
    description: Typecheck passes.
    cmd: "test -f package.json && pnpm --filter @openplaybooks/converge-core --filter @openplaybooks/converge typecheck"
  - id: cli-builds
    description: CLI builds.
    cmd: "test -f packages/cli/package.json && pnpm --filter @openplaybooks/converge build"
  - id: test-passes
    description: "01-red's test now passes (GREEN)."
    cmd: "cd packages/cli && pnpm test -- tests/integration/retry.test.ts"
  - id: dispatcher-wired
    description: main.ts routes retry to the new command.
    cmd: "grep -q 'case \"retry\"' packages/cli/src/main.ts"
  - id: no-other-tests-regressed
    description: No other CLI test regressed.
    cmd: "cd packages/cli && pnpm test -- --exclude \"**/compile.test.ts\" --exclude \"**/list.test.ts\" --exclude \"**/retry.test.ts\""
vars:
  verb: retry
  verb_description: "Re-run anything with status: 'error' in target/run_results.json."
  test_file: tests/integration/retry.test.ts
  source_file: src/commands-retry.ts
  extra_assertions: "- retry without prior run_results.json exits non-zero with 'no prior run' message\n- retry equals run --select result:error+ when run_results exists"
---

# Green — implement retry

Implement the verb in `packages/cli/src/commands-retry.ts`. Use the parser and
resolver from phase 01 to convert `--select`/`--exclude` into a task ID
set. Use the existing autonomous-run code path (where applicable) for
execution.

Wire into `packages/cli/src/main.ts` by adding `case "retry":` next
to the existing dispatcher cases.

Refactor while green. Do not touch the test file. If the test is wrong,
revert your green work, return to 01-red, fix, and come back.

## Verb-specific notes

Re-run anything with status: 'error' in target/run_results.json.

Required behavior to satisfy the test assertions:

- retry without prior run_results.json exits non-zero with 'no prior run' message
- retry equals run --select result:error+ when run_results exists
