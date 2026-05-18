---
id: build/02-green
title: Green — implement converge build
description: "Implement `packages/cli/src/commands-build.ts`. Wire into main.ts dispatcher.\nMake 01-red green. Refactor while green; do not edit the test.\n"
dependencies:
  - 01-red
tags:
  - tdd
  - green
inputs:
  - packages/cli/tests/integration/build.test.ts
outputs:
  - packages/cli/src/commands-build.ts
checks:
  - id: typecheck
    description: Typecheck passes.
    cmd: "test -f package.json && pnpm --filter @openplaybooks/converge-core --filter @openplaybooks/converge-cli typecheck"
  - id: cli-builds
    description: CLI builds.
    cmd: "test -f packages/cli/package.json && pnpm --filter @openplaybooks/converge-cli build"
  - id: test-passes
    description: "01-red's test now passes (GREEN)."
    cmd: "cd packages/cli && pnpm test -- tests/integration/build.test.ts"
  - id: dispatcher-wired
    description: main.ts routes build to the new command.
    cmd: "grep -q 'case \"build\"' packages/cli/src/main.ts"
  - id: no-other-tests-regressed
    description: No other CLI test regressed.
    cmd: "cd packages/cli && pnpm test -- --exclude='**/compile.test.ts' --exclude='**/list.test.ts'"
vars:
  verb: build
  verb_description: "Run + check + repair, --fail-fast on by default."
  test_file: tests/integration/build.test.ts
  source_file: src/commands-build.ts
  extra_assertions: "- build exits non-zero on first uncorrectable failure\n- build --select tag:trivial succeeds when trivial-task succeeds"
---

# Green — implement build

Implement the verb in `packages/cli/src/commands-build.ts`. Use the parser and
resolver from phase 01 to convert `--select`/`--exclude` into a task ID
set. Use the existing autonomous-run code path (where applicable) for
execution.

Wire into `packages/cli/src/main.ts` by adding `case "build":` next
to the existing dispatcher cases.

Refactor while green. Do not touch the test file. If the test is wrong,
revert your green work, return to 01-red, fix, and come back.

## Verb-specific notes

Run + check + repair, --fail-fast on by default.

Required behavior to satisfy the test assertions:

- build exits non-zero on first uncorrectable failure
- build --select tag:trivial succeeds when trivial-task succeeds
