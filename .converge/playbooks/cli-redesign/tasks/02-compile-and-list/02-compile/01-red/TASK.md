---
id: 01-red
title: Red — failing integration test for converge compile
description: |
  Write the subprocess integration test that runs `converge compile`
  against the fixture and asserts manifest.json contents. Confirm RED.

dependencies: []

outputs:
  - "packages/cli/tests/integration/compile.test.ts"

checks:
  - id: test-exists
    cmd: test -s packages/cli/tests/integration/compile.test.ts
    description: Test file exists.
  - id: test-fails
    cmd: cd packages/cli && pnpm test -- tests/integration/compile.test.ts 2>&1; test $? -ne 0
    description: Test fails (RED) — compile command not yet implemented.
  - id: tests-have-assertions
    cmd: grep -cE 'expect\(' packages/cli/tests/integration/compile.test.ts | awk '$1+0 < 4 { exit 1 }'
    description: At least 4 assertions.

tags:
  - tdd
  - red
---

# Red — failing test

Pattern: `execFileSync('node', [CLI, 'compile'], { cwd: fixtureDir })`
just like `packages/core/tests/integration/no-eager-journal-writes.test.ts`.

Assertions:
- target/manifest.json exists after compile runs.
- Contains `concrete` state for `trivial-task` and `dependent-task`.
- Contains `frontier` state for `unseeded-wbs`.
- `dependent-task`'s `depends_on` array includes `trivial-task`.
- `metadata.frontier_count` equals 1.
- No journal subdirs other than `target/` exist (read-only discipline).

Confirm RED — the command doesn't exist yet, so subprocess errors out
and the file isn't written.
