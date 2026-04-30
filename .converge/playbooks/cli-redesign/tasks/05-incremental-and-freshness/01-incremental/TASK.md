---
id: 01-incremental
title: materialization:incremental + is_incremental + this_state
description: |
  Tasks declared `materialization: incremental` honor the
  is_incremental and this_state template variables. On second run with
  unchanged inputs, an incremental task is a no-op — its skill body
  reads prior outputs and produces only what's new.

dependencies: []

inputs:
  - "docs/design/cli-redesign.md"
  - "packages/core/src/manifest/run-results.ts"

outputs:
  - "packages/core/src/task/incremental.ts"
  - "packages/core/tests/unit/task/incremental.test.ts"
  - "packages/cli/tests/integration/incremental.test.ts"

checks:
  - id: typecheck
    cmd: cd packages/core && pnpm typecheck
    description: Typechecks.
  - id: unit-tests-green
    cmd: cd packages/core && pnpm test -- tests/unit/task/incremental.test.ts
    description: Unit tests for is_incremental computation pass.
  - id: integration-noop
    cmd: cd packages/cli && pnpm test -- tests/integration/incremental.test.ts
    description: An incremental task run twice with unchanged inputs is a no-op the second time.

tags:
  - incremental
---

# Incremental tasks

Two TDD subtasks. Red: tests for the `is_incremental` bit and
`this_state` pointer (unit) plus a real two-run no-op test (integration).
Green: implement the template-var injection.

References: spec §7.8.
