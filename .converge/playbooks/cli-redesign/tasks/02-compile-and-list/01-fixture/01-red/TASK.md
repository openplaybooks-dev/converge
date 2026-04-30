---
id: 01-red
title: Red — fixture smoke test that fails because fixture doesn't exist
description: |
  Write a smoke test that loads the fixture playbook and asserts it
  contains the three expected tasks. Confirm RED — fixture files don't
  exist yet.

dependencies: []

outputs:
  - "packages/cli/tests/integration/_fixture-smoke.test.ts"

checks:
  - id: test-exists
    cmd: test -s packages/cli/tests/integration/_fixture-smoke.test.ts
    description: Test file exists.
  - id: test-fails
    cmd: test -e packages/cli/tests/integration/_fixture-smoke.test.ts && cd packages/cli && ! pnpm test -- tests/integration/_fixture-smoke.test.ts
    description: Test fails (RED) — fixture doesn't exist yet.

tags:
  - tdd
  - red
---

# Red — fixture smoke test

Write `_fixture-smoke.test.ts` (underscore prefix so vitest doesn't
treat it as ordinary). Assert:

- `packages/cli/tests/fixtures/minimal-playbook/.converge/project.yaml` exists.
- The fixture's `playbook.yml` parses and lists three tasks: `trivial-task`,
  `dependent-task`, `unseeded-wbs`.
- `dependent-task`'s `depends_on` includes `trivial-task`.
- `unseeded-wbs/TASK.md` declares `wbs:` in frontmatter.
- `unseeded-wbs/wbs/index.js` exists.

The test should fail because none of these files exist. That is the
expected RED.
