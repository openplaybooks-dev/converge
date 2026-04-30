---
id: 02-green
title: Green — implement converge list
description: |
  Implement commands-list.ts. Make 01-red green. Wire alias `ls` into the
  dispatcher.

dependencies:
  - 01-red

inputs:
  - "packages/cli/tests/integration/list.test.ts"

outputs:
  - "packages/cli/src/commands-list.ts"

checks:
  - id: tests-pass
    cmd: cd packages/cli && pnpm test -- tests/integration/list.test.ts
    description: Test passes.
  - id: dispatcher-routes-list-and-ls
    cmd: |
      grep -q 'case "list"' packages/cli/src/main.ts
      grep -q 'case "ls"' packages/cli/src/main.ts
    description: main.ts routes both list and ls.
  - id: no-test-edits
    cmd: grep -q 'toContain("trivial-task")' packages/cli/tests/integration/list.test.ts && grep -q 'toContain("dependent-task")' packages/cli/tests/integration/list.test.ts && grep -q 'toContain("unseeded")' packages/cli/tests/integration/list.test.ts
    description: Test expectations unchanged.

tags:
  - tdd
  - green
---

# Green — implement list

Read manifest via `readManifest`. If null, error "run `converge compile`
first." Parse `--select` via `parseSelector` from phase 01. Resolve via
`resolveSelection`. Print to stdout, one ID per line; state suffixes for
non-concrete nodes. Frontier warnings to stderr.

`ls` is an alias case in main.ts that delegates to the same handler.
