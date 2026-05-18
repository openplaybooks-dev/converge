---
id: run-results-manager
title: "Create RunResultsManager — single-file state replacing all checkpoint infra"
description: |
  Create RunResultsManager class under packages/core/src/manifest/.
  Single JSON file for all execution state. Constructor takes executionDir +
  manifest, initializes run_results.json with all nodes pending. Provides
  mutations (markRunning, markComplete, markFailed, markSkipped) and queries
  (isComplete, isFailed, isLocked, getAttemptCount). Atomic writes via
  existing atomic-write.ts. No filesystem scanning — O(1) reads.
  Also add writeJournalManifest() to persist manifest.json at journal root.

inputs:
  - packages/core/src/manifest/types.ts
  - packages/core/src/checkpoint/atomic-write.ts
  - packages/core/src/dag/task-dag.ts

outputs:
  - packages/core/src/manifest/run-results-manager.ts (new)
  - packages/core/src/manifest/index.ts (modified)

checks:
  - id: run-results-manager-exists
    cmd: test -s packages/core/src/manifest/run-results-manager.ts
    description: RunResultsManager module exists.
  - id: run-results-manager-tests-pass
    cmd: pnpm --filter @openplaybooks/converge-core test -- run-results-manager
    description: RunResultsManager unit tests pass.
  - id: typecheck-green
    cmd: pnpm --filter @openplaybooks/converge-core typecheck
    description: Core typechecks.

skills: []
references:
  - "packages/core/src/manifest/types.ts"
  - "packages/core/src/checkpoint/atomic-write.ts"

vars: {}
dependencies: []
children:
  - run-results-manager-impl
  - write-journal-manifest
---

# 02 — RunResultsManager

This phase creates the single-file state system that replaces ALL checkpoint
infrastructure (CheckpointManager, FilesystemTaskStatus, UnitCheckpointManager,
TaskCheckpointManager).

## Children

### run-results-manager-impl
Red-green: Create RunResultsManager class with mutations and queries.
Initialize run_results.json from manifest. All nodes start pending.

### write-journal-manifest
Red-green: Add writeJournalManifest() function that persists the DAG's
toManifest() output to journal/{playbook}/manifest.json at execution start.

## API

```ts
class RunResultsManager {
  constructor(executionDir: string, manifest: Manifest);

  // Mutations
  markRunning(nodeId: string): Promise<number>;     // returns attempt #
  markComplete(nodeId: string, durationMs: number): Promise<void>;
  markFailed(nodeId: string, error: string, durationMs: number): Promise<void>;
  markSkipped(nodeId: string): Promise<void>;
  incrementAttempt(nodeId: string): Promise<number>;

  // Queries
  getNodeStatus(nodeId: string): Promise<RunResult | undefined>;
  isComplete(nodeId: string): Promise<boolean>;
  isFailed(nodeId: string): Promise<boolean>;
  isLocked(nodeId: string): Promise<boolean>;       // complete | failed | skipped
  getAttemptCount(nodeId: string): Promise<number>;
  getCompletedCount(): Promise<number>;
  getFailedCount(): Promise<number>;
  getResultsSnapshot(): Promise<RunResults>;
}
```
