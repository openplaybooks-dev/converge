---
id: update-journal-structure-red
title: Red — execution helpers don't exist yet, getSessionsDir still present
description: |
  Write checks asserting current state: getSessionsDir() exists,
  getExecutionsDir() doesn't. Expected RED — execution helpers
  don't exist yet.

inputs: []

outputs: []

checks:
  - id: sessions-dir-exists
    cmd: grep -q 'getSessionsDir' packages/core/src/journal/structure.ts
    description: getSessionsDir() still exists (pre-rename).
  - id: executions-dir-missing
    cmd: "! grep -q 'getExecutionsDir' packages/core/src/journal/structure.ts"
    description: getExecutionsDir() doesn't exist yet (RED).
  - id: execution-task-dir-missing
    cmd: "! grep -q 'getExecutionTaskDir' packages/core/src/journal/structure.ts"
    description: getExecutionTaskDir() doesn't exist yet (RED).

tags:
  - tdd
  - red
---

# Red — pre-update state check

Verify current state:
- `getSessionsDir()` exists in structure.ts
- `getExecutionsDir()` does NOT exist
- `getExecutionTaskDir()` does NOT exist
- `getExecutionManifestPath()` does NOT exist

These should all pass — confirming the RED baseline before changes.
