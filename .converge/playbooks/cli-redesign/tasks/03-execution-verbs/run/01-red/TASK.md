---
id: run/01-red
title: Red — failing integration test for converge run
description: "Write the subprocess integration test for `converge run`. Run\nit. Confirm RED — the verb is not yet implemented.\n"
tags:
  - tdd
  - red
inputs:
  - docs/design/cli-redesign.md
  - packages/cli/tests/fixtures/minimal-playbook/playbook.yml
outputs:
  - packages/cli/tests/integration/run-select.test.ts
checks:
  - id: test-exists
    description: Test file exists and is non-empty.
    cmd: test -s packages/cli/tests/integration/run-select.test.ts
  - id: test-fails
    description: Test fails (RED).
    cmd: "test -e packages/cli && cd packages/cli && ! pnpm test -- tests/integration/run-select.test.ts"
  - id: tests-have-assertions
    description: At least 3 expect() assertions.
    cmd: "grep -cE 'expect\\(' packages/cli/tests/integration/run-select.test.ts | awk '$1+0 < 3 { exit 1 }'"
vars:
  verb: run
  verb_description: Execute selected tasks via the convergence loop.
  test_file: tests/integration/run-select.test.ts
  source_file: src/commands-run.ts
  extra_assertions: "- run --select tag:trivial executes only trivial-task\n- run --select <substr> still works (name: default)\n- run --step + --select runs one iteration of the first match"
---

# Red — failing test for run

Pattern: `execFileSync('node', [CLI, 'run', ...args], { cwd: fixtureDir })`.

Required assertions:

- run --select tag:trivial executes only trivial-task
- run --select <substr> still works (name: default)
- run --step + --select runs one iteration of the first match

The verb's source file does not exist yet, so the dispatcher errors with
"unknown command" and the test's expectations on filesystem effects fail.
That is the expected RED state.

**Discipline:** if any assertion accidentally passes, the test is
tautological. Tighten it.
