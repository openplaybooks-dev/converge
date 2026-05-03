---
id: migrate-next-task
title: Migrate next-task.ts — O(1) run_results read instead of O(n) filesystem scan
description: |
  Replace FilesystemTaskStatus scanning in next-task.ts with
  RunResultsManager queries. State maps built from run_results.json
  instead of recursive directory walk.

inputs:
  - packages/cli/src/next-task.ts

outputs:
  - packages/cli/src/next-task.ts (modified)

checks:
  - id: no-filesystem-status
    cmd: "! grep -q 'FilesystemTaskStatus' packages/cli/src/next-task.ts"
    description: No FilesystemTaskStatus import.
  - id: uses-run-results
    cmd: grep -q 'RunResultsManager' packages/cli/src/next-task.ts
    description: Uses RunResultsManager.

skills: []
references:
  - "packages/cli/src/next-task.ts"

vars: {}
dependencies: []
children:
  - red
  - green
---

# 03 — Migrate next-task.ts

The key optimization of this entire playbook: replacing O(n) recursive
filesystem scanning with O(1) single-file read.

## Current (slow):
```ts
const fsStatus = new FilesystemTaskStatus(projectDir);
const statusMap = fsStatus.getStatusMap(); // walks every journal directory
```

## Target (fast):
```ts
const runResults = new RunResultsManager(executionDir, manifest);
const results = await runResults.getResultsSnapshot();
const statusMap = new Map(results.results.map(r => [r.id, r.status]));
```
