---
id: 03-source-freshness
title: converge source freshness — report pass/warn/error per source
description: |
  New verb: `converge source freshness [--select <expr>]`. Reads `freshness:`
  declarations in TASK.md frontmatter, mtimes the loaded_at file, compares
  against warn_after / error_after thresholds, prints status per source,
  exits non-zero if any source is in error.

dependencies:
  - 02-full-refresh

inputs:
  - "docs/design/cli-redesign.md"

outputs:
  - "packages/core/src/freshness/types.ts"
  - "packages/core/src/freshness/index.ts"
  - "packages/core/tests/unit/freshness/freshness.test.ts"
  - "packages/cli/src/commands-source.ts"
  - "packages/cli/tests/integration/source-freshness.test.ts"

checks:
  - id: typecheck
    cmd: test -f package.json && pnpm --filter @converge/core --filter @converge/cli typecheck
    description: Typechecks.
  - id: unit-tests-green
    cmd: cd packages/core && pnpm test -- tests/unit/freshness
    description: Unit tests pass.
  - id: integration-tests-green
    cmd: cd packages/cli && pnpm test -- tests/integration/source-freshness.test.ts
    description: Integration test passes.
  - id: dispatcher
    cmd: grep -q 'case "source"' packages/cli/src/main.ts
    description: Dispatcher routes source.

tags:
  - freshness
children:
  - 01-red
  - 02-green
---

# converge source freshness

Two TDD subtasks. The unit tests cover threshold math (12 hours warn /
24 hours error). The integration test fakes mtimes via fs.utimes() for
deterministic threshold crossing.

References: spec §7.7.
