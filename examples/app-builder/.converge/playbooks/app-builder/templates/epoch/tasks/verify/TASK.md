---
id: "{{taskId}}-verify"
title: "Verify — Sprint {{epoch}}"
description: "Verify the sprint deliverable and update the backlog."
depends_on:
  - "{{taskId}}-implement"
inputs:
  - "{{artifactDir}}/diff.txt"
  - "{{artifactDir}}/plan.md"
  - "{{backlogPath}}"
vars:
  taskId: "{{taskId}}"
  epoch: "{{epoch}}"
  goalId: "{{goalId}}"
  goalDesc: "{{goalDesc}}"
  taskDesc: "{{taskDesc}}"
  taskIdRef: "{{taskIdRef}}"
  backlogPath: "{{backlogPath}}"
  ideaPath: "{{ideaPath}}"
  fileList: "{{fileList}}"
  summary: "{{summary}}"
  artifactDir: "{{artifactDir}}"
outputs:
  - "{{artifactDir}}/result.json"
  - "{{backlogPath}}"
checks:
  - id: result-written
    cmd: test -s "{{artifactDir}}/result.json"
  - id: backlog-updated
    cmd: "grep -q done {{backlogPath}}"
---

# Sprint Verification — Epoch {{epoch}}

**Goal:** {{goalId}} — {{goalDesc}}

## Instructions

### 1. Verify the build
Run any available checks:
- `pnpm build` if build script exists
- `pnpm test` if test script exists
- `pnpm typecheck` if typecheck script exists

### 2. Write result
Write `{{artifactDir}}/result.json`:
```json
{
  "epoch": "{{epoch}}",
  "goalId": "{{goalId}}",
  "taskId": "{{taskIdRef}}",
  "built": "<what was built this sprint>",
  "verified": true,
  "timestamp": "<ISO date>"
}
```

### 3. Update the backlog
Read `{{backlogPath}}`. Each line is one JSON record.

Find the current task (`"id":"{{taskIdRef}}"`) and update its status to `"done"`, add `"completedAt"`.

Check if ALL tasks for goal `"{{goalId}}"` are done:
- If yes: mark the goal `"done"`, activate the next goal (first `"pending"` goal → `"active"`)
- If no: keep goal `"active"`, create the next pending task for this goal if needed

### 4. Discover new tasks (reactive!)
Read `{{ideaPath}}` and the current codebase. Did this sprint reveal missing work?
- New sub-tasks for this goal? Append them with `"type":"task"`, `"goalId":"{{goalId}}"`, `"status":"pending"`.
- Entirely new goal needed? Append it with `"type":"goal"`, `"status":"pending"`.
- If nothing new, don't add anything.

**Backlog format** (one JSON per line, append new entries):
```jsonl
{"type":"goal","id":"g1","desc":"...","status":"active","createdAt":"..."}
{"type":"task","id":"g1-t1","goalId":"g1","desc":"...","status":"done","completedAt":"..."}
```
