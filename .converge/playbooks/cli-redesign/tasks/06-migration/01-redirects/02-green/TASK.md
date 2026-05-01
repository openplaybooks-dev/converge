---
id: 02-green
title: Green — implement MIGRATION_REDIRECTS and wire into dispatcher
description: |
  Create packages/cli/src/migration-redirects.ts with the full map from
  spec §10. Update main.ts to check MIGRATION_REDIRECTS before normal
  dispatch. Make 01-red green.

dependencies:
  - 01-red

inputs:
  - "packages/cli/tests/integration/migration-redirects.test.ts"
  - "docs/design/cli-redesign.md"

outputs:
  - "packages/cli/src/migration-redirects.ts"
  - "packages/cli/src/main.ts"

checks:
  - id: tests-pass
    cmd: cd packages/cli && pnpm test -- tests/integration/migration-redirects.test.ts
    description: Parameterized test passes for every row.
  - id: existing-cli-tests-pass
    cmd: cd packages/cli && pnpm vitest run --exclude="**/compile.test.ts" --exclude="**/list.test.ts"
    description: No CLI test regressed.
tags:
  - tdd
  - green
---

# Green — implement redirects

`migration-redirects.ts` exports `MIGRATION_REDIRECTS: Record<string, RedirectEntry>`.
Each entry: `{ hint: string, status: 'removed' | 'renamed', exitCode: 2 }`.
Subcommands like `playbook list` are keyed as `"playbook list"`.

`main.ts` — early in the dispatch path (before the existing switch),
join `argv[2..3]` as a candidate key, look up MIGRATION_REDIRECTS, if
hit print to stderr and exit 2. Existing legacy redirects (the small
set already in main.ts) are absorbed into MIGRATION_REDIRECTS — single
source of truth.

Refactor while green.
