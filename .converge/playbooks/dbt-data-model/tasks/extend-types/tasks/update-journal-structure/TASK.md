---
id: update-journal-structure
title: Update journal structure paths — add execution-scoped helpers, remove getSessionsDir
description: |
  Add getExecutionsDir(), getExecutionDir(), getExecutionTaskDir(),
  getExecutionManifestPath() to structure.ts. Remove getSessionsDir().
  Update all callers. Clean break — no deprecated aliases.

inputs:
  - packages/core/src/journal/structure.ts

outputs:
  - packages/core/src/journal/structure.ts (modified)

checks:
  - id: executions-dir-helper
    cmd: grep -q 'getExecutionsDir' packages/core/src/journal/structure.ts
    description: getExecutionsDir() exists.
  - id: execution-dir-helper
    cmd: grep -q 'getExecutionDir' packages/core/src/journal/structure.ts
    description: getExecutionDir() exists.
  - id: execution-task-dir-helper
    cmd: grep -q 'getExecutionTaskDir' packages/core/src/journal/structure.ts
    description: getExecutionTaskDir() exists.
  - id: execution-manifest-path-helper
    cmd: grep -q 'getExecutionManifestPath' packages/core/src/journal/structure.ts
    description: getExecutionManifestPath() exists.
  - id: no-get-sessions-dir
    cmd: "! grep -q 'getSessionsDir' packages/core/src/journal/structure.ts"
    description: getSessionsDir() is removed.

skills: []
references:
  - "packages/core/src/journal/structure.ts"

vars: {}
dependencies: []
children:
  - red
  - green
---

# 03 — Update journal structure paths

## Children

### red
Write tests asserting getSessionsDir() exists and execution helpers don't.
Expected RED — execution helpers don't exist yet.

### green
1. Add `getExecutionsDir(projectDir)`: returns `journal/{playbook}/executions/`
2. Add `getExecutionDir(projectDir, executionId)`: returns `journal/{playbook}/executions/{executionId}/`
3. Add `getExecutionTaskDir(projectDir, executionId, taskId)`: returns `journal/{playbook}/executions/{executionId}/tasks/{taskId}/`
4. Add `getExecutionManifestPath(projectDir)`: returns `journal/{playbook}/manifest.json`
5. Remove `getSessionsDir()`
6. Update all callers of `getSessionsDir()` to use `getExecutionsDir()`
7. Update `setPlaybookScope()` to set execution-scoped env vars

## Paths

```
.converge/journal/{playbook}/
  manifest.json              ← getExecutionManifestPath()
  executions/                ← getExecutionsDir()
    {executionId}/           ← getExecutionDir()
      run_results.json
      tasks/
        {taskId}/            ← getExecutionTaskDir()
```

No backward compat — `getSessionsDir()` is deleted.
