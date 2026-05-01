---
id: retry/01-red
title: Red — failing integration test for converge retry
description: "Write the subprocess integration test for `converge retry`. Run\nit. Confirm RED — the verb is not yet implemented.\n"
tags:
  - tdd
  - red
inputs:
  - docs/design/cli-redesign.md
  - packages/cli/tests/fixtures/minimal-playbook/playbook.yml
outputs:
  - packages/cli/tests/integration/retry.test.ts
checks:
  - id: test-exists
    description: Test file exists and is non-empty.
    cmd: test -s packages/cli/tests/integration/retry.test.ts
  - id: test-fails
    description: Test fails (RED).
    cmd: "test -e packages/cli && cd packages/cli && ! pnpm test -- tests/integration/retry.test.ts"
  - id: tests-have-assertions
    description: At least 3 expect() assertions.
    cmd: "grep -cE 'expect\\(' packages/cli/tests/integration/retry.test.ts | awk '$1+0 < 3 { exit 1 }'"
vars:
  verb: retry
  verb_description: "Re-run anything with status: 'error' in target/run_results.json."
  test_file: tests/integration/retry.test.ts
  source_file: src/commands-retry.ts
  extra_assertions: "- retry without prior run_results.json exits non-zero with 'no prior run' message\n- retry equals run --select result:error+ when run_results exists"
---

# Red — failing test for retry

Pattern: `execFileSync('node', [CLI, 'retry', ...args], { cwd: fixtureDir })`.

Required assertions:

- retry without prior run_results.json exits non-zero with 'no prior run' message
- retry equals run --select result:error+ when run_results exists

The verb's source file does not exist yet, so the dispatcher errors with
"unknown command" and the test's expectations on filesystem effects fail.
That is the expected RED state.

**Discipline:** if any assertion accidentally passes, the test is
tautological. Tighten it.
