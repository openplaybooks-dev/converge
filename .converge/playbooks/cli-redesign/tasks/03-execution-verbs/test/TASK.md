---
id: test
title: "converge test — Run only the checks: block of selected tasks."
description: "Run only the checks: block of selected tasks.\n\nTwo TDD subtasks: 01-red writes the failing integration test for this\nverb; 02-green implements the verb until the test passes.\n"
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
  - packages/cli/src/commands-test.ts
  - packages/cli/tests/integration/test-verb.test.ts
checks:
  - id: typecheck
    description: Typecheck passes.
    cmd: "test -f package.json && pnpm --filter @converge/core --filter @converge/cli typecheck"
  - id: cli-builds
    description: CLI builds with the new command.
    cmd: "test -f packages/cli/package.json && pnpm --filter @converge/cli build"
  - id: integration-test-passes
    description: "The verb's integration test passes."
    cmd: "cd packages/cli && pnpm test -- tests/integration/test-verb.test.ts"
  - id: dispatcher-routed
    description: main.ts dispatcher routes to the new command.
    cmd: "grep -q 'case \"test\"' packages/cli/src/main.ts"
vars:
  verb: test
  verb_description: "Run only the checks: block of selected tasks."
  test_file: tests/integration/test-verb.test.ts
  source_file: src/commands-test.ts
  extra_assertions: "- test does not invoke task executors (no LLM calls, no mutations)\n- test reports per-task pass/fail per check"
children:
  - 01-red
  - 02-green
---

# converge test

Run only the checks: block of selected tasks.

## TDD subtasks

- **01-red** — write `packages/cli/tests/integration/test-verb.test.ts` covering the assertions
  below. Confirm RED.
- **02-green** — implement `packages/cli/src/commands-test.ts` until tests pass.
  Wire into `packages/cli/src/main.ts`. Refactor while green.

## Required assertions in the integration test

- test does not invoke task executors (no LLM calls, no mutations)
- test reports per-task pass/fail per check

## References

- Spec: `docs/design/cli-redesign.md` §3 (verb table), §8 (run-mode flags
  vs selection composition), §9 (migration table — what this verb
  replaces from v1).
- Test pattern: `packages/core/tests/integration/no-eager-journal-writes.test.ts`.
