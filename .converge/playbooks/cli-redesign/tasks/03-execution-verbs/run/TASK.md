---
id: run
title: converge run — Execute selected tasks via the convergence loop.
description: "Execute selected tasks via the convergence loop.\n\nTwo TDD subtasks: 01-red writes the failing integration test for this\nverb; 02-green implements the verb until the test passes.\n"
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
  - packages/cli/src/commands-run.ts
  - packages/cli/tests/integration/run-select.test.ts
checks:
  - id: typecheck
    description: Typecheck passes.
    cmd: "test -f package.json && pnpm --filter @openplaybooks/converge-core --filter @openplaybooks/converge-cli typecheck"
  - id: cli-builds
    description: CLI builds with the new command.
    cmd: "test -f packages/cli/package.json && pnpm --filter @openplaybooks/converge-cli build"
  - id: integration-test-passes
    description: "The verb's integration test passes."
    cmd: "cd packages/cli && pnpm test -- tests/integration/run-select.test.ts"
  - id: dispatcher-routed
    description: main.ts dispatcher routes to the new command.
    cmd: "grep -q 'case \"run\"' packages/cli/src/main.ts"
vars:
  verb: run
  verb_description: Execute selected tasks via the convergence loop.
  test_file: tests/integration/run-select.test.ts
  source_file: src/commands-run.ts
  extra_assertions: "- run --select tag:trivial executes only trivial-task\n- run --select <substr> still works (name: default)\n- run --step + --select runs one iteration of the first match"
children:
  - 01-red
  - 02-green
---

# converge run

Execute selected tasks via the convergence loop.

## TDD subtasks

- **01-red** — write `packages/cli/tests/integration/run-select.test.ts` covering the assertions
  below. Confirm RED.
- **02-green** — implement `packages/cli/src/commands-run.ts` until tests pass.
  Wire into `packages/cli/src/main.ts`. Refactor while green.

## Required assertions in the integration test

- run --select tag:trivial executes only trivial-task
- run --select <substr> still works (name: default)
- run --step + --select runs one iteration of the first match

## References

- Spec: `docs/design/cli-redesign.md` §3 (verb table), §8 (run-mode flags
  vs selection composition), §9 (migration table — what this verb
  replaces from v1).
- Test pattern: `packages/core/tests/integration/no-eager-journal-writes.test.ts`.
