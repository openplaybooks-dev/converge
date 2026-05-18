---
id: retry
title: "converge retry — Re-run anything with status: 'error' in target/run_results.json."
description: "Re-run anything with status: 'error' in target/run_results.json.\n\nTwo TDD subtasks: 01-red writes the failing integration test for this\nverb; 02-green implements the verb until the test passes.\n"
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
  - packages/cli/src/commands-retry.ts
  - packages/cli/tests/integration/retry.test.ts
checks:
  - id: typecheck
    description: Typecheck passes.
    cmd: "test -f package.json && pnpm --filter @openplaybooks/converge-core --filter @openplaybooks/converge typecheck"
  - id: cli-builds
    description: CLI builds with the new command.
    cmd: "test -f packages/cli/package.json && pnpm --filter @openplaybooks/converge build"
  - id: integration-test-passes
    description: "The verb's integration test passes."
    cmd: "cd packages/cli && pnpm test -- tests/integration/retry.test.ts"
  - id: dispatcher-routed
    description: main.ts dispatcher routes to the new command.
    cmd: "grep -q 'case \"retry\"' packages/cli/src/main.ts"
vars:
  verb: retry
  verb_description: "Re-run anything with status: 'error' in target/run_results.json."
  test_file: tests/integration/retry.test.ts
  source_file: src/commands-retry.ts
  extra_assertions: "- retry without prior run_results.json exits non-zero with 'no prior run' message\n- retry equals run --select result:error+ when run_results exists"
children:
  - 01-red
  - 02-green
---

# converge retry

Re-run anything with status: 'error' in target/run_results.json.

## TDD subtasks

- **01-red** — write `packages/cli/tests/integration/retry.test.ts` covering the assertions
  below. Confirm RED.
- **02-green** — implement `packages/cli/src/commands-retry.ts` until tests pass.
  Wire into `packages/cli/src/main.ts`. Refactor while green.

## Required assertions in the integration test

- retry without prior run_results.json exits non-zero with 'no prior run' message
- retry equals run --select result:error+ when run_results exists

## References

- Spec: `docs/design/cli-redesign.md` §3 (verb table), §8 (run-mode flags
  vs selection composition), §9 (migration table — what this verb
  replaces from v1).
- Test pattern: `packages/core/tests/integration/no-eager-journal-writes.test.ts`.
