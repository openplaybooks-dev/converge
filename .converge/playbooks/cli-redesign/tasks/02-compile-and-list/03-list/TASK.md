---
id: 03-list
title: converge list — print tasks matching a selection
description: |
  Implement `converge list [--select <expr>] [--exclude <expr>]` (alias
  `ls`). Loads the manifest, resolves the selection via the resolver from
  phase 01, prints one task per line. Frontier-warning rendering lives
  here.

dependencies:
  - 02-compile

inputs:
  - "packages/core/src/select/index.ts"
  - "packages/core/src/manifest/index.ts"
  - "packages/cli/src/commands-compile.ts"

outputs:
  - "packages/cli/src/commands-list.ts"
  - "packages/cli/tests/integration/list.test.ts"

checks:
  - id: tests-green
    cmd: cd packages/cli && pnpm test -- tests/integration/list.test.ts
    description: list integration test passes.
  - id: alias-ls-works
    cmd: |
      cd packages/cli/tests/fixtures/minimal-playbook && ../../../dist/index.js compile
      ../../../dist/index.js ls --select 'tag:trivial' | grep -q trivial-task
    description: "ls is an alias for list."
  - id: frontier-warning
    cmd: |
      cd packages/cli/tests/fixtures/minimal-playbook
      ../../../dist/index.js list --select 'unseeded-wbs+' 2>&1 | grep -q 'crosses a frontier'
    description: Selection across an unseeded WBS prints the documented warning.

tags:
  - cli
  - list
children:
  - 01-red
  - 02-green
---

# converge list

Two TDD subtasks. Red writes the integration test; green implements.

Output format (per spec §11 worked example):
```
03-tokens/002-craft
03-tokens/002-craft/<token-id>   [expected]
… 48 more
```

State suffixes: bare for concrete, `[expected]`, `[frontier]`.
Frontier warning to stderr (spec §4.2 worked example block).
