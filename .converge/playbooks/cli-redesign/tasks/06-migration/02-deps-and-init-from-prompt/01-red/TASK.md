---
id: 01-red
title: Red — failing tests for deps and init --from-prompt
description: |
  Two integration tests. Confirm RED — neither verb is yet wired.

dependencies: []

outputs:
  - "packages/cli/tests/integration/deps.test.ts"
  - "packages/cli/tests/integration/init-from-prompt.test.ts"

checks:
  - id: tests-exist
    cmd: |
      test -s packages/cli/tests/integration/deps.test.ts
      test -s packages/cli/tests/integration/init-from-prompt.test.ts
    description: Both tests exist.
  - id: tests-fail
    cmd: test -e packages/cli/tests/integration/deps.test.ts && cd packages/cli && ! pnpm test -- tests/integration/deps.test.ts tests/integration/init-from-prompt.test.ts
    description: Tests fail (RED).

tags:
  - tdd
  - red
---

# Red — deps and init tests

**deps.test.ts:**
- `converge deps list` exits 0 and prints at least one skill name (the
  fixture declares one).
- `converge deps install <skill-name>` succeeds (or, if the skill is
  already present, exits 0 with an idempotent message).

**init-from-prompt.test.ts:**
- In an empty tmp dir, `converge init --from-prompt "build a todo app"`
  scaffolds `.converge/` with a project.yaml and a default playbook
  containing tasks derived from the prompt.
- Exit 0; the subprocess produces a tree the smoke test from
  02-compile-and-list/01-fixture/01-red would consider valid.

RED.
