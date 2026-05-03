---
id: 02-full-refresh
title: --full-refresh forces non-incremental execution
description: |
  Implement the `--full-refresh` global flag. When set, is_incremental is
  forced to false even for tasks with materialization: incremental.
  Replaces today's overloaded --restart for the incremental case.

dependencies:
  - 01-incremental

inputs:
  - "packages/core/src/task/incremental.ts"

outputs:
  - "packages/cli/tests/integration/full-refresh.test.ts"

checks:
  - id: tests-green
    cmd: cd packages/cli && pnpm test -- tests/integration/full-refresh.test.ts
    description: Full-refresh integration test passes.

tags:
  - incremental
  - full-refresh
children:
  - 01-red
  - 02-green
---

# --full-refresh

Two TDD subtasks. The flag mostly exists already — `01-incremental`
made `computeIncrementalContext` honor a `fullRefresh` parameter. This
slice wires the CLI flag through to that parameter and adds the
behavior test.
