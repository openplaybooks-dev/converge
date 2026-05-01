---
id: clean/01-red
title: Red — failing integration test for converge clean
description: "Write the subprocess integration test for `converge clean`. Run\nit. Confirm RED — the verb is not yet implemented.\n"
tags:
  - tdd
  - red
inputs:
  - docs/design/cli-redesign.md
  - packages/cli/tests/fixtures/minimal-playbook/playbook.yml
outputs:
  - packages/cli/tests/integration/clean.test.ts
checks:
  - id: test-exists
    description: Test file exists and is non-empty.
    cmd: test -s packages/cli/tests/integration/clean.test.ts
  - id: test-fails
    description: Test fails (RED).
    cmd: "test -e packages/cli && cd packages/cli && ! pnpm test -- tests/integration/clean.test.ts"
  - id: tests-have-assertions
    description: At least 3 expect() assertions.
    cmd: "grep -cE 'expect\\(' packages/cli/tests/integration/clean.test.ts | awk '$1+0 < 3 { exit 1 }'"
vars:
  verb: clean
  verb_description: "Delete journal state for selected tasks. Replaces today's --restart and reset."
  test_file: tests/integration/clean.test.ts
  source_file: src/commands-clean.ts
  extra_assertions: "- clean --select <expr> removes journal subtree for matching tasks\n- clean --orphaned removes tasks not present in current playbook"
---

# Red — failing test for clean

Pattern: `execFileSync('node', [CLI, 'clean', ...args], { cwd: fixtureDir })`.

Required assertions:

- clean --select <expr> removes journal subtree for matching tasks
- clean --orphaned removes tasks not present in current playbook

The verb's source file does not exist yet, so the dispatcher errors with
"unknown command" and the test's expectations on filesystem effects fail.
That is the expected RED state.

**Discipline:** if any assertion accidentally passes, the test is
tautological. Tighten it.
