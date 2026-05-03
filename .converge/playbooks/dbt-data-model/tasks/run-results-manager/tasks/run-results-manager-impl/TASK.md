---
id: run-results-manager-impl
title: RunResultsManager class — single-file state with mutations and queries
description: |
  Implement RunResultsManager. Constructor initializes run_results.json from
  manifest (all nodes pending). Single JSON file, atomic writes. O(1) reads.
  No filesystem scanning.

inputs:
  - packages/core/src/manifest/types.ts
  - packages/core/src/checkpoint/atomic-write.ts

outputs:
  - packages/core/src/manifest/run-results-manager.ts (new)
  - packages/core/tests/manifest/run-results-manager.test.ts (new)

checks:
  - id: module-exists
    cmd: test -s packages/core/src/manifest/run-results-manager.ts
    description: RunResultsManager module exists.
  - id: tests-pass
    cmd: pnpm --filter @converge/core test -- run-results-manager
    description: RunResultsManager tests pass.

skills: []
references:
  - "packages/core/src/manifest/types.ts"

vars: {}
dependencies: []
children:
  - red
  - green
---

# 01 — RunResultsManager implementation

## Children

### red
Write comprehensive unit tests for RunResultsManager. Cover full lifecycle:
pending→running→complete, pending→running→failed, skip propagation, attempt
incrementing, multiple nodes with isolation, atomic write behavior, and
initialization from manifest. Expected RED — module doesn't exist yet.

### green
Implement RunResultsManager. Run tests — all pass. Typecheck green.

## Implementation notes

- Constructor creates the execution directory and writes initial run_results.json
- All writes use atomicWriteFile from atomic-write.ts
- All reads parse the single JSON file
- Node IDs are simple strings (from manifest), no path parsing needed
- The `load()` method reads the JSON; `save()` writes atomically
- `markRunning` increments attempts and returns the new attempt number
- `markSkipped` is for downstream nodes of a failed node
- `getResultsSnapshot()` returns the full RunResults for serialization
