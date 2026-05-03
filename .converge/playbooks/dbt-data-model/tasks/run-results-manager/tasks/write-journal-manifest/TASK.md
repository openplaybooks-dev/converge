---
id: write-journal-manifest
title: Write manifest.json at journal root at execution start
description: |
  Add writeJournalManifest() function that persists the DAG's toManifest()
  output to journal/{playbook}/manifest.json. Called at execution start.
  The manifest.json is the canonical DAG snapshot for that execution.

inputs:
  - packages/core/src/dag/task-dag.ts
  - packages/core/src/manifest/types.ts
  - packages/core/src/journal/structure.ts

outputs:
  - packages/core/src/manifest/run-results-manager.ts (modified — add writeJournalManifest)

checks:
  - id: write-manifest-function-exists
    cmd: grep -q 'writeJournalManifest' packages/core/src/manifest/run-results-manager.ts
    description: writeJournalManifest() function exists.

skills: []
references:
  - "packages/core/src/dag/task-dag.ts"

vars: {}
dependencies: []
children:
  - red
  - green
---

# 02 — writeJournalManifest

## Children

### red
Write test asserting writeJournalManifest() doesn't exist yet.
Expected RED.

### green
Implement writeJournalManifest(). Uses TaskDag.toManifest() to serialize
the DAG, then writes to journal/{playbook}/manifest.json via atomic write.
Updates RunResultsManager.init() to call it and record the manifest_hash.

## Implementation

```ts
export async function writeJournalManifest(
  projectDir: string,
  dag: TaskDag,
): Promise<string> {
  const manifest = dag.toManifest();
  const manifestPath = getExecutionManifestPath(projectDir);
  const json = JSON.stringify(manifest, null, 2);
  await atomicWriteFile(manifestPath, json);
  // Return a hash of the manifest for run_results metadata
  return computeHash(json);
}
```
