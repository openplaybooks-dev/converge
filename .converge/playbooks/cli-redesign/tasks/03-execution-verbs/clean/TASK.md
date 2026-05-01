---
id: clean
title: "converge clean — Delete journal state for selected tasks. Replaces today's --restart and reset."
description: "Delete journal state for selected tasks. Replaces today's --restart and reset.\n\nTwo TDD subtasks: 01-red writes the failing integration test for this\nverb; 02-green implements the verb until the test passes.\n"
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
  - packages/cli/src/commands-clean.ts
  - packages/cli/tests/integration/clean.test.ts
checks:
  - id: typecheck
    description: Typecheck passes.
    cmd: "test -f package.json && pnpm --filter @converge/core --filter @converge/cli typecheck"
  - id: cli-builds
    description: CLI builds with the new command.
    cmd: "test -f packages/cli/package.json && pnpm --filter @converge/cli build"
  - id: integration-test-passes
    description: "The verb's integration test passes."
    cmd: "cd packages/cli && pnpm test -- tests/integration/clean.test.ts"
  - id: dispatcher-routed
    description: main.ts dispatcher routes to the new command.
    cmd: "grep -q 'case \"clean\"' packages/cli/src/main.ts"
vars:
  verb: clean
  verb_description: "Delete journal state for selected tasks. Replaces today's --restart and reset."
  test_file: tests/integration/clean.test.ts
  source_file: src/commands-clean.ts
  extra_assertions: "- clean --select <expr> removes journal subtree for matching tasks\n- clean --orphaned removes tasks not present in current playbook"
---

# converge clean

Delete journal state for selected tasks. Replaces today's --restart and reset.

## TDD subtasks

- **01-red** — write `packages/cli/tests/integration/clean.test.ts` covering the assertions
  below. Confirm RED.
- **02-green** — implement `packages/cli/src/commands-clean.ts` until tests pass.
  Wire into `packages/cli/src/main.ts`. Refactor while green.

## Required assertions in the integration test

- clean --select <expr> removes journal subtree for matching tasks
- clean --orphaned removes tasks not present in current playbook

## References

- Spec: `docs/design/cli-redesign.md` §3 (verb table), §8 (run-mode flags
  vs selection composition), §9 (migration table — what this verb
  replaces from v1).
- Test pattern: `packages/core/tests/integration/no-eager-journal-writes.test.ts`.
