---
id: build/01-red
title: Red — failing integration test for converge build
description: "Write the subprocess integration test for `converge build`. Run\nit. Confirm RED — the verb is not yet implemented.\n"
tags:
  - tdd
  - red
inputs:
  - docs/design/cli-redesign.md
  - packages/cli/tests/fixtures/minimal-playbook/playbook.yml
outputs:
  - packages/cli/tests/integration/build.test.ts
checks:
  - id: test-exists
    description: Test file exists and is non-empty.
    cmd: test -s packages/cli/tests/integration/build.test.ts
  - id: test-fails
    description: Test fails (RED).
    cmd: "test -e packages/cli && cd packages/cli && ! pnpm test -- tests/integration/build.test.ts"
  - id: tests-have-assertions
    description: At least 3 expect() assertions.
    cmd: "grep -cE 'expect\\(' packages/cli/tests/integration/build.test.ts | awk '$1+0 < 3 { exit 1 }'"
vars:
  verb: build
  verb_description: "Run + check + repair, --fail-fast on by default."
  test_file: tests/integration/build.test.ts
  source_file: src/commands-build.ts
  extra_assertions: "- build exits non-zero on first uncorrectable failure\n- build --select tag:trivial succeeds when trivial-task succeeds"
---

# Red — failing test for build

Pattern: `execFileSync('node', [CLI, 'build', ...args], { cwd: fixtureDir })`.

Required assertions:

- build exits non-zero on first uncorrectable failure
- build --select tag:trivial succeeds when trivial-task succeeds

The verb's source file does not exist yet, so the dispatcher errors with
"unknown command" and the test's expectations on filesystem effects fail.
That is the expected RED state.

**Discipline:** if any assertion accidentally passes, the test is
tautological. Tighten it.
