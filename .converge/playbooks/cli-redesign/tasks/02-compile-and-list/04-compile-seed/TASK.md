---
id: 04-compile-seed
title: converge compile --seed — materialize WBS children
description: |
  `converge compile --seed [--select <expr>]` runs the WBS scripts of the
  selected unseeded parents (or all unseeded parents), materializes their
  children to disk, then re-emits the manifest. Frontier nodes collapse
  to concrete (or expected, when preview manifests land later).

dependencies:
  - 03-list

inputs:
  - "packages/cli/src/commands-compile.ts"
  - "packages/core/src/executor/wbs-executor.ts"

outputs:
  - "packages/cli/tests/integration/compile-seed.test.ts"

checks:
  - id: tests-green
    cmd: cd packages/cli && pnpm test -- tests/integration/compile-seed.test.ts
    description: compile --seed integration test passes.

tags:
  - cli
  - compile
  - wbs
---

# compile --seed

Two TDD subtasks. Red writes the test; green extends `commands-compile.ts`
to handle the `--seed` flag.

Reuses `WbsExecutor` from `packages/core/src/executor/wbs-executor.ts` —
that's the same code path the runner uses; standalone invocation here is
the new bit.

References: spec §2 (frontiers), §3 (compile verb table), §11 (worked
example).
