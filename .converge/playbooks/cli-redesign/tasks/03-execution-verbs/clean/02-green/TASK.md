---
id: clean/02-green
title: Green — implement converge clean
description: "Implement `packages/cli/src/commands-clean.ts`. Wire into main.ts dispatcher.\nMake 01-red green. Refactor while green; do not edit the test.\n"
dependencies:
  - 01-red
tags:
  - tdd
  - green
inputs:
  - packages/cli/tests/integration/clean.test.ts
outputs:
  - packages/cli/src/commands-clean.ts
checks:
  - id: typecheck
    description: Typecheck passes.
    cmd: "test -f package.json && pnpm --filter @converge/core --filter @converge/cli typecheck"
  - id: cli-builds
    description: CLI builds.
    cmd: "test -f packages/cli/package.json && pnpm --filter @converge/cli build"
  - id: test-passes
    description: "01-red's test now passes (GREEN)."
    cmd: "cd packages/cli && pnpm test -- tests/integration/clean.test.ts"
  - id: dispatcher-wired
    description: main.ts routes clean to the new command.
    cmd: "grep -q 'case \"clean\"' packages/cli/src/main.ts"
  - id: no-other-tests-regressed
    description: No other CLI test regressed.
    cmd: "cd packages/cli && pnpm vitest run tests/ '!tests/integration/clean.test.ts' 2>&1 | awk '/Tests  [0-9]+ failed/{f=$2+0} END{exit f<=2?0:1}'"
vars:
  verb: clean
  verb_description: "Delete journal state for selected tasks. Replaces today's --restart and reset."
  test_file: tests/integration/clean.test.ts
  source_file: src/commands-clean.ts
  extra_assertions: "- clean --select <expr> removes journal subtree for matching tasks\n- clean --orphaned removes tasks not present in current playbook"
---

# Green — implement clean

Implement the verb in `packages/cli/src/commands-clean.ts`. Use the parser and
resolver from phase 01 to convert `--select`/`--exclude` into a task ID
set. Use the existing autonomous-run code path (where applicable) for
execution.

Wire into `packages/cli/src/main.ts` by adding `case "clean":` next
to the existing dispatcher cases.

Refactor while green. Do not touch the test file. If the test is wrong,
revert your green work, return to 01-red, fix, and come back.

## Verb-specific notes

Delete journal state for selected tasks. Replaces today's --restart and reset.

Required behavior to satisfy the test assertions:

- clean --select <expr> removes journal subtree for matching tasks
- clean --orphaned removes tasks not present in current playbook
