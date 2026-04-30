---
id: 02-green
title: Green — implement deps and init --from-prompt
description: |
  Implement commands-deps.ts and extend the existing init command with
  a --from-prompt branch (delegates to the existing plan logic).
  Make 01-red green.

dependencies:
  - 01-red

inputs:
  - "packages/cli/tests/integration/deps.test.ts"
  - "packages/cli/tests/integration/init-from-prompt.test.ts"

outputs:
  - "packages/cli/src/commands-deps.ts"
  - "packages/cli/src/main.ts"

checks:
  - id: tests-pass
    cmd: cd packages/cli && pnpm test -- tests/integration/deps.test.ts tests/integration/init-from-prompt.test.ts
    description: Tests pass.
  - id: no-test-edits
    cmd: test -d .git && git diff --name-only HEAD -- packages/cli/tests/integration/deps.test.ts packages/cli/tests/integration/init-from-prompt.test.ts | wc -l | awk '$1+0 > 0 { exit 1 }'
    description: Tests not edited.

tags:
  - tdd
  - green
---

# Green — implement deps and init --from-prompt

`commands-deps.ts` re-exports the existing `skillsListCommand` and
`skillsInstallCommand` (from `commands-skills.ts`) under the `deps`
subcommand surface. main.ts gets `case "deps":` that switches on the
next arg.

For `init --from-prompt`: extend `commands.ts`'s `initCommand` (or its
successor) to accept a `--from-prompt` flag. When set, delegate to the
existing `runPlanLayer` logic (today's `converge plan "<goal>"` path)
to scaffold tasks from the prompt.

Refactor while green.
