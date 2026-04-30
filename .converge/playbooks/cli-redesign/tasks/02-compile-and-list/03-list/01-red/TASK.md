---
id: 01-red
title: Red — failing integration test for converge list
description: |
  Subprocess test asserting list output for several selectors against the
  fixture. Confirm RED.

dependencies: []

outputs:
  - "packages/cli/tests/integration/list.test.ts"

checks:
  - id: test-exists
    cmd: test -s packages/cli/tests/integration/list.test.ts
    description: Test exists.
  - id: test-fails
    cmd: cd packages/cli && pnpm test -- tests/integration/list.test.ts 2>&1; test $? -ne 0
    description: Test fails (RED).
  - id: tests-have-assertions
    cmd: grep -cE 'expect\(' packages/cli/tests/integration/list.test.ts | awk '$1+0 < 5 { exit 1 }'
    description: At least 5 assertions covering distinct selector forms.

tags:
  - tdd
  - red
---

# Red — failing list test

Cases:
- `list` (no select) prints all three fixture tasks.
- `list --select 'tag:trivial'` prints only `trivial-task`.
- `list --select 'trivial-task+'` includes `dependent-task` (downstream).
- `list --select 'unseeded-wbs+'` writes the frontier warning to stderr
  AND lists the parent (the warning doesn't suppress output, just
  annotates it).
- `ls` works as an alias.

Confirm RED — the command doesn't exist.
