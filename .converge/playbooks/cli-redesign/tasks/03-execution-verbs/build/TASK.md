---
id: build
title: "converge build — Run + check + repair, --fail-fast on by default."
description: "Run + check + repair, --fail-fast on by default.\n\nTwo TDD subtasks: 01-red writes the failing integration test for this\nverb; 02-green implements the verb until the test passes.\n"
dependencies:
  - 00-remove-auto-revalidate
tags:
  - cli
  - execution
  - verb
inputs:
  - packages/core/src/select/index.ts
  - packages/core/src/manifest/index.ts
  - packages/cli/src/commands-list.ts
outputs:
  - packages/cli/src/commands-build.ts
  - packages/cli/tests/integration/build.test.ts
checks:
  - id: typecheck
    description: Typecheck passes.
    cmd: "test -f package.json && pnpm --filter @openplaybooks/converge-core --filter @openplaybooks/converge typecheck"
  - id: cli-builds
    description: CLI builds with the new command.
    cmd: "test -f packages/cli/package.json && pnpm --filter @openplaybooks/converge build"
  - id: integration-test-passes
    description: "The verb's integration test passes."
    cmd: "cd packages/cli && pnpm test -- tests/integration/build.test.ts"
  - id: dispatcher-routed
    description: main.ts dispatcher routes to the new command.
    cmd: "grep -q 'case \"build\"' packages/cli/src/main.ts"
vars:
  verb: build
  verb_description: "Run + check + repair, --fail-fast on by default."
  test_file: tests/integration/build.test.ts
  source_file: src/commands-build.ts
  extra_assertions: "- build exits non-zero on first uncorrectable failure\n- build --select tag:trivial succeeds when trivial-task succeeds"
children:
  - 01-red
  - 02-green
---

# converge build

Run + check + repair, --fail-fast on by default.

## TDD subtasks

- **01-red** — write `packages/cli/tests/integration/build.test.ts` covering the assertions
  below. Confirm RED.
- **02-green** — implement `packages/cli/src/commands-build.ts` until tests pass.
  Wire into `packages/cli/src/main.ts`. Refactor while green.

## Required assertions in the integration test

- build exits non-zero on first uncorrectable failure
- build --select tag:trivial succeeds when trivial-task succeeds

## References

- Spec: `docs/design/cli-redesign.md` §3 (verb table), §8 (run-mode flags
  vs selection composition), §9 (migration table — what this verb
  replaces from v1).
- Test pattern: `packages/core/tests/integration/no-eager-journal-writes.test.ts`.
