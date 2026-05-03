---
id: update-journal-structure-green
title: Green — add execution-scoped helpers, remove getSessionsDir
description: |
  Implement the new path helpers in structure.ts. Remove getSessionsDir().
  Update all callers. Clean break.

inputs:
  - packages/core/src/journal/structure.ts

outputs:
  - packages/core/src/journal/structure.ts (modified)

checks:
  - id: executions-dir-exists
    cmd: grep -q 'getExecutionsDir' packages/core/src/journal/structure.ts
    description: getExecutionsDir() exists.
  - id: execution-task-dir-exists
    cmd: grep -q 'getExecutionTaskDir' packages/core/src/journal/structure.ts
    description: getExecutionTaskDir() exists.
  - id: manifest-path-exists
    cmd: grep -q 'getExecutionManifestPath' packages/core/src/journal/structure.ts
    description: getExecutionManifestPath() exists.
  - id: no-sessions-dir
    cmd: "! grep -q 'getSessionsDir' packages/core/src/journal/structure.ts"
    description: getSessionsDir() is removed.
  - id: typecheck-green
    cmd: pnpm -r typecheck
    description: All packages typecheck.

tags:
  - tdd
  - green
---

# Green — implement execution-scoped paths

## Step 1: Add new helpers

```ts
export function getExecutionsDir(projectDir: string): string {
  // Uses getPlaybookContext() to resolve playbook name
  const playbook = getPlaybookContext();
  const root = getJournalRoot(projectDir, playbook);
  return path.join(root, "executions");
}

export function getExecutionDir(projectDir: string, executionId: string): string {
  return path.join(getExecutionsDir(projectDir), executionId);
}

export function getExecutionTaskDir(
  projectDir: string,
  executionId: string,
  taskId: string,
): string {
  return path.join(getExecutionDir(projectDir, executionId), "tasks", taskId);
}

export function getExecutionManifestPath(projectDir: string): string {
  const playbook = getPlaybookContext();
  const root = getJournalRoot(projectDir, playbook);
  return path.join(root, "manifest.json");
}
```

## Step 2: Remove getSessionsDir()

Delete the function entirely. No deprecated wrapper.

## Step 3: Update all callers

Find every file calling `getSessionsDir()` and update to `getExecutionsDir()`.

Find every file importing from `session-logger.ts` (if any remain after the
previous rename task) and update to `execution-logger.ts`.

## Step 4: Verify

- `pnpm -r typecheck` passes
- `grep -r "getSessionsDir" packages/` returns nothing
