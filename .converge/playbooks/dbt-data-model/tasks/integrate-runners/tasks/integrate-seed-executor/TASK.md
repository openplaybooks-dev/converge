---
id: integrate-seed-executor
title: Update seed-executor.ts — execution-scoped paths, no checkpoint writes
description: |
  Update seed-executor.ts to use execution-scoped paths for spawned task
  directories. Remove all checkpoint.json writes from the spawn flow.
  Dynamic nodes added to run_results via RunResultsManager.

inputs:
  - packages/core/src/executor/seed-executor.ts
  - packages/core/src/manifest/run-results-manager.ts

outputs:
  - packages/core/src/executor/seed-executor.ts (modified)

checks:
  - id: no-checkpoint-imports
    cmd: "! grep -q 'CheckpointManager\\|UnitCheckpointManager' packages/core/src/executor/seed-executor.ts"
    description: No checkpoint imports in seed-executor.ts.
  - id: uses-execution-paths
    cmd: grep -q 'getExecutionTaskDir' packages/core/src/executor/seed-executor.ts
    description: seed-executor.ts uses execution-scoped paths.

skills: []
references:
  - "packages/core/src/executor/seed-executor.ts"

vars: {}
dependencies: []
children:
  - red
  - green
---

# 04 — Integrate seed-executor

## Children

### red
Verify seed-executor currently writes checkpoint.json and uses persistent
journal paths. Expected RED — not yet migrated.

### green
Update seed-executor.ts:
1. Spawn paths: `getExecutionTaskDir(projectDir, executionId, childId)`
2. No checkpoint.json writes — spawned nodes are tracked in run_results
3. `ctx.spawn()` takes `executionId` parameter
4. Dynamic nodes added to run_results via `runResults.markRunning()` or
   just exist in the initialized pending state from manifest

Remove all imports of CheckpointManager, UnitCheckpointManager.
