---
id: 01-red
title: "Red — failing integration test for converge {{verb}}"
description: |
  Write the subprocess integration test for `converge {{verb}}`. Run
  it. Confirm RED — the verb is not yet implemented.

dependencies: []

inputs:
  - "docs/design/cli-redesign.md"
  - "packages/cli/tests/fixtures/minimal-playbook/playbook.yml"

outputs:
  - "packages/cli/{{test_file}}"

checks:
  - id: test-exists
    cmd: test -s packages/cli/{{test_file}}
    description: Test file exists and is non-empty.
  - id: test-fails
    cmd: test -e packages/cli && cd packages/cli && ! pnpm test -- {{test_file}}
    description: Test fails (RED).
  - id: tests-have-assertions
    cmd: grep -cE 'expect\(' packages/cli/{{test_file}} | awk '$1+0 < 3 { exit 1 }'
    description: At least 3 expect() assertions.

tags:
  - tdd
  - red
---

# Red — failing test for {{verb}}

Pattern: `execFileSync('node', [CLI, '{{verb}}', ...args], { cwd: fixtureDir })`.

Required assertions:

{{extra_assertions}}

The verb's source file does not exist yet, so the dispatcher errors with
"unknown command" and the test's expectations on filesystem effects fail.
That is the expected RED state.

**Discipline:** if any assertion accidentally passes, the test is
tautological. Tighten it.
