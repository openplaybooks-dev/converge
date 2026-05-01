---
id: 01-redirects
title: Migration redirects for every removed v1 command
description: |
  A single map of {oldCommand: {hint, status}} drives a parameterized
  test that asserts each removed v1 command exits non-zero with a v2
  redirect message on stderr. Implements every row of the migration
  table from spec §10.

dependencies: []

inputs:
  - "docs/design/cli-redesign.md"
  - "packages/cli/src/main.ts"

outputs:
  - "packages/cli/src/migration-redirects.ts"
  - "packages/cli/tests/integration/migration-redirects.test.ts"

checks:
  - id: typecheck
    cmd: test -f package.json && pnpm --filter @converge/core --filter @converge/cli typecheck
    description: Typechecks.
  - id: tests-green
    cmd: cd packages/cli && pnpm test -- tests/integration/migration-redirects.test.ts
    description: Parameterized test covers every migration row and passes.
  - id: dispatcher-checks-redirects-first
    cmd: |
      grep -q "MIGRATION_REDIRECTS" packages/cli/src/main.ts
    description: main.ts consults the redirect map before normal dispatch.

tags:
  - migration
  - redirects
---

# Migration redirects

Two TDD subtasks. Red writes the parameterized test (`describe.each(MIGRATION_ROWS)`)
covering every row of spec §10. Green creates the redirect map and wires
it into the dispatcher.

References: spec §10 (migration table — source of truth).
