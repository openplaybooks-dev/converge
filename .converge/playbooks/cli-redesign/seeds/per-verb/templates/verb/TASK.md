---
id: "{{verb}}"
title: "converge {{verb}} — {{verb_description}}"
description: |
  {{verb_description}}

  Two TDD subtasks: 01-red writes the failing integration test for this
  verb; 02-green implements the verb until the test passes.

dependencies:
  - 00-remove-auto-revalidate

inputs:
  - "packages/core/src/select/index.ts"
  - "packages/core/src/manifest/index.ts"
  - "packages/cli/src/commands-list.ts"

outputs:
  - "packages/cli/{{source_file}}"
  - "packages/cli/{{test_file}}"

checks:
  - id: typecheck
    cmd: test -f package.json && pnpm --filter @converge/core --filter @converge/cli typecheck
    description: Typecheck passes.
  - id: cli-builds
    cmd: test -f packages/cli/package.json && pnpm --filter @converge/cli build
    description: CLI builds with the new command.
  - id: integration-test-passes
    cmd: cd packages/cli && pnpm test -- {{test_file}}
    description: The verb's integration test passes.
  - id: dispatcher-routed
    cmd: grep -q 'case "{{verb}}"' packages/cli/src/main.ts
    description: main.ts dispatcher routes to the new command.

tags:
  - cli
  - execution
  - verb
---

# converge {{verb}}

{{verb_description}}

## TDD subtasks

- **01-red** — write `packages/cli/{{test_file}}` covering the assertions
  below. Confirm RED.
- **02-green** — implement `packages/cli/{{source_file}}` until tests pass.
  Wire into `packages/cli/src/main.ts`. Refactor while green.

## Required assertions in the integration test

{{extra_assertions}}

## References

- Spec: `docs/design/cli-redesign.md` §3 (verb table), §8 (run-mode flags
  vs selection composition), §9 (migration table — what this verb
  replaces from v1).
- Test pattern: `packages/core/tests/integration/no-eager-journal-writes.test.ts`.
