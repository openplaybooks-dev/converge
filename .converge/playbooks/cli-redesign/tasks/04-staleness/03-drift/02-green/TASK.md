---
id: 02-green
title: Green — implement drifted predicate
description: |
  Replace the stubbed `drifted` predicate in state-resolver.ts with the
  real implementation: re-hash outputs, compare against run_results
  output_hashes. Make 01-red green.

dependencies:
  - 01-red

inputs:
  - "packages/cli/tests/integration/drift.test.ts"
  - "packages/core/src/manifest/run-results.ts"

outputs:
  - "packages/core/src/select/resolver.ts"

checks:
  - id: drift-test-passes
    cmd: cd packages/cli && pnpm test -- tests/integration/drift.test.ts
    description: Drift test passes.
  - id: ladder-still-works
    cmd: cd packages/cli && pnpm test -- tests/integration/state-modified.test.ts
    description: The other ladder methods still pass.
tags:
  - tdd
  - green
---

# Green — implement drifted

`drifted(currNode, runResults): boolean`. For each declared output in
`currNode.outputs`: re-hash the file on disk, compare to
`runResults.output_hashes[outputPath]`. If any differs, the task is
drifted.

Skip files >50 MB with the same warning behavior as `hashInputs`.

Refactor while green.
