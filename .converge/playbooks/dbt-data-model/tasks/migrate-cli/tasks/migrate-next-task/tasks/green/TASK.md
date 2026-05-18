---
id: migrate-next-task-green
title: Green — migrate next-task to RunResultsManager
description: |
  Replace FilesystemTaskStatus with RunResultsManager. O(1) reads.
  Tests pass. Typecheck green.

inputs:
  - packages/cli/src/next-task.ts

outputs:
  - packages/cli/src/next-task.ts (modified)

checks:
  - id: no-filesystem-status
    cmd: "! grep -q 'FilesystemTaskStatus' packages/cli/src/next-task.ts"
    description: No FilesystemTaskStatus import.
  - id: typecheck-green
    cmd: pnpm --filter @openplaybooks/converge-cli typecheck
    description: CLI typechecks.

tags:
  - tdd
  - green
---

# Green — migrate next-task.ts

```ts
// Before (O(n) scan):
const fsStatus = new FilesystemTaskStatus(projectDir);
const statusMap = fsStatus.getStatusMap();

// After (O(1) read):
const results = await runResults.getResultsSnapshot();
const statusMap = new Map(
  results.results.map(r => [r.id, r.status])
);
```

Also update any `getCompletedTasks()` / `getFailedTasks()` calls to use
RunResultsManager queries.
