---
id: 01-modified-ladder
title: state:modified.* sub-method ladder
description: |
  Implement the seven sub-methods of state:modified — body, frontmatter,
  checks, inputs, upstream, playbook, drifted — as resolvers that diff
  the current manifest against a --state manifest. (Drifted is mostly
  in 03-drift but the ladder structure lands here.)

dependencies: []

inputs:
  - "docs/design/cli-redesign.md"
  - "packages/core/src/manifest/index.ts"
  - "packages/core/src/hash/index.ts"
  - "packages/core/src/select/index.ts"

outputs:
  - "packages/core/src/select/resolver.ts"
  - "packages/core/tests/unit/select/state-resolver.test.ts"
  - "packages/cli/tests/integration/state-modified.test.ts"

checks:
  - id: typecheck
    cmd: cd packages/core && pnpm typecheck
    description: Module typechecks.
  - id: unit-tests-green
    cmd: cd packages/core && pnpm test -- tests/unit/select/state-resolver.test.ts
    description: Unit tests for the ladder pass.
  - id: integration-tests-green
    cmd: cd packages/cli && pnpm test -- tests/integration/state-modified.test.ts
    description: Integration test exercising all seven sub-methods passes.

tags:
  - staleness
children:
  - 01-red
  - 02-green
---

# state:modified ladder

Two TDD subtasks. Red writes one parameterized test that exercises all
seven sub-methods using two-snapshot fixtures (the "before" manifest and
the "after" with controlled deltas). Green implements the resolvers.

The seven methods mirror dbt sub-method names so muscle memory transfers.
Implementation: each sub-method is a small predicate `(curr: Node, prior:
Node) => boolean` that the bare `state:modified` ORs together.

References: spec §7.4 (the ladder table), §7.5 (recipe).
