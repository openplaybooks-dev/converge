---
id: 04-debug-revalidate
title: converge debug --revalidate (opt-in re-check of completed tasks)
description: |
  Restore the *behavior* of today's automatic re-validation but as an
  opt-in verb: `converge debug --revalidate [--select <expr>]` re-runs
  the checks: of selected completed tasks and reports pass/fail.
  Reuses the recheckEditedCompletedTasks function (preserved from
  03-execution-verbs/00-remove-auto-revalidate).

dependencies:
  - 03-drift

inputs:
  - "packages/cli/src/autonomous-run.ts"
  - "docs/design/cli-redesign.md"

outputs:
  - "packages/cli/src/commands-debug.ts"
  - "packages/cli/tests/integration/debug-revalidate.test.ts"

checks:
  - id: tests-green
    cmd: cd packages/cli && pnpm test -- tests/integration/debug-revalidate.test.ts
    description: Integration test passes.
  - id: dispatcher-routes-debug
    cmd: grep -q 'case "debug"' packages/cli/src/main.ts
    description: dispatcher routes debug.

tags:
  - cli
  - debug
children:
  - 01-red
  - 02-green
---

# debug --revalidate

Two TDD subtasks. The verb is `debug` with subcommand-style flags;
`--revalidate` is the most-used one in this phase. Other `debug`
subcommands (`--fix`, structural checks) inherit from today's
`verify` command.

References: spec §7.6.
