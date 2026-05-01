---
id: test/01-red
title: Red — failing integration test for converge test
description: "Write the subprocess integration test for `converge test`. Run\nit. Confirm RED — the verb is not yet implemented.\n"
tags:
  - tdd
  - red
inputs:
  - docs/design/cli-redesign.md
  - packages/cli/tests/fixtures/minimal-playbook/playbook.yml
outputs:
  - packages/cli/tests/integration/test-verb.test.ts
checks:
  - id: test-exists
    description: Test file exists and is non-empty.
    cmd: test -s packages/cli/tests/integration/test-verb.test.ts
  - id: test-fails
    description: Test fails (RED).
    cmd: "test -e packages/cli && cd packages/cli && ! pnpm test -- tests/integration/test-verb.test.ts"
  - id: tests-have-assertions
    description: At least 3 expect() assertions.
    cmd: "grep -cE 'expect\\(' packages/cli/tests/integration/test-verb.test.ts | awk '$1+0 < 3 { exit 1 }'"
vars:
  verb: test
  verb_description: "Run only the checks: block of selected tasks."
  test_file: tests/integration/test-verb.test.ts
  source_file: src/commands-test.ts
  extra_assertions: "- test does not invoke task executors (no LLM calls, no mutations)\n- test reports per-task pass/fail per check"
---

# Red — failing test for test

Pattern: `execFileSync('node', [CLI, 'test', ...args], { cwd: fixtureDir })`.

Required assertions:

- test does not invoke task executors (no LLM calls, no mutations)
- test reports per-task pass/fail per check

The verb's source file does not exist yet, so the dispatcher errors with
"unknown command" and the test's expectations on filesystem effects fail.
That is the expected RED state.

**Discipline:** if any assertion accidentally passes, the test is
tautological. Tighten it.
