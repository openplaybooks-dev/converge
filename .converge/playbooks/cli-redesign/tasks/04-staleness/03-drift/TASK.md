---
id: 03-drift
title: state:modified.drifted — detect hand-edited outputs
description: |
  Wire state:modified.drifted: re-hash declared outputs, compare against
  prior run_results.json output_hashes, surface tasks whose outputs have
  drifted on disk since the last run.

dependencies:
  - 02-run-results-hashes

inputs:
  - "packages/core/src/select/state-resolver.ts"
  - "packages/core/src/manifest/run-results.ts"

outputs:
  - "packages/core/src/select/state-resolver.ts"
  - "packages/cli/tests/integration/drift.test.ts"

checks:
  - id: drift-detected
    cmd: cd packages/cli && pnpm test -- tests/integration/drift.test.ts
    description: Drift detection integration test passes.

tags:
  - staleness
  - drift
---

# state:modified.drifted

Two TDD subtasks. The drifted predicate from `01-modified-ladder` was a
stub; this slice implements it for real and adds the integration test.

Drift detection cost: re-hashing every output on every list/run. Per
spec §13.11, this is an open question. Default in this slice:
default-on, with the same 50 MB skip-with-warning behavior as
`hashInputs`.
