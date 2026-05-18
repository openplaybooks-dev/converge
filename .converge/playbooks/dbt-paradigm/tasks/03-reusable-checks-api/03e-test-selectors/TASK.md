---
title: Add test:<name> selector method
description: |
  Add test:<name> to the resolver. Selects tasks whose _testRefs contains
  the given name. Same pattern as seed:<name> from phase 02.

inputs:
  - packages/core/src/select/resolver.ts
  - packages/core/src/manifest/types.ts

outputs:
  - packages/core/src/select/resolver.ts
  - packages/core/src/manifest/types.ts
  - packages/core/tests/select/test-selector.test.ts

checks:
  - id: test-selector-tests-green
    cmd: test -f packages/core/src/config/test-expander.ts && pnpm --filter @openplaybooks/converge-core test -- test-selector
    description: test:<name> selector works.
  - id: existing-selectors-still-work
    cmd: test -f packages/core/src/config/test-expander.ts && pnpm --filter @openplaybooks/converge-core test -- select
    description: Existing selectors still pass.
  - id: typecheck-green
    cmd: test -f packages/core/src/config/test-expander.ts && pnpm --filter @openplaybooks/converge-core typecheck
    description: Core typechecks.

skills: []
references:
  - "packages/core/src/select/resolver.ts"

vars: {}
dependencies:
  - 03d-discovery-and-scripts
---

# 03e — test:<name> selector

## Red phase

Tests: test:freshness selects task with _testRefs containing "freshness",
test:* with glob matches multiple, +test:<name> ancestors work,
test:<name>+ descendants work, @test:<name> subgraph works.

## Green phase

1. Add `testRefs?: string[]` to `ManifestNode` in manifest/types.ts.
   Populate from task's `_testRefs` in writer.ts.
2. Add `case "test":` to `matchAtom()` in resolver.ts.
3. `matchByTestName(value, manifest)` — match by name or glob against
   `node.testRefs`.

Share the match-by-name-or-glob pattern with `seed:` (extract helper).

## Done when

All 3 checks pass.
