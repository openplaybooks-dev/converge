---
id: 02-green
title: Green — implement the state:modified ladder
description: |
  Implement state-resolver.ts with seven predicate functions. Wire into
  the resolver from phase 01 (which until now treated state:modified.*
  as parsed-but-unresolved). Make 01-red green.

dependencies:
  - 01-red

inputs:
  - "packages/core/tests/unit/select/state-resolver.test.ts"
  - "packages/cli/tests/integration/state-modified.test.ts"

outputs:
  - "packages/core/src/select/state-resolver.ts"

checks:
  - id: typecheck
    cmd: cd packages/core && pnpm typecheck
    description: Typechecks.
  - id: unit-passes
    cmd: cd packages/core && pnpm test -- tests/unit/select/state-resolver.test.ts
    description: Unit test passes.
  - id: integration-passes
    cmd: cd packages/cli && pnpm test -- tests/integration/state-modified.test.ts
    description: Integration test passes.
  - id: no-test-edits
    cmd: |
      test -d .git && git diff --name-only HEAD -- packages/core/tests/unit/select/state-resolver.test.ts | wc -l | awk '$1+0 > 0 { exit 1 }'
      test -d .git && git diff --name-only HEAD -- packages/cli/tests/integration/state-modified.test.ts | wc -l | awk '$1+0 > 0 { exit 1 }'
    description: Tests not edited.

tags:
  - tdd
  - green
---

# Green — implement the ladder

Each sub-method is a small predicate. Compose them as a map:

```
const SUB_METHODS = {
  body:        (a, b) => a.body_hash !== b.body_hash,
  frontmatter: (a, b) => a.frontmatter_hash !== b.frontmatter_hash && a.checks_hash === b.checks_hash,
  checks:      (a, b) => a.checks_hash !== b.checks_hash,
  inputs:      (a, b) => a.inputs_hash !== b.inputs_hash,
  upstream:    (a, b) => a.upstream_hash !== b.upstream_hash,
  playbook:    (a, b) => a.playbook_hash !== b.playbook_hash,
  drifted:     (a, b) => /* lands in 03-drift slice — stub here */ false,
};
```

Bare `state:modified` is the OR of all (excluding drifted, which has its
own data source — run_results — and is wired in 03-drift).

Refactor while green.
