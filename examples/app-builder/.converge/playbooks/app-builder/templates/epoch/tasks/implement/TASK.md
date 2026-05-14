---
id: "{{taskId}}-implement"
title: "Implement — Sprint {{epoch}}"
description: "Build what the plan specifies for goal {{goalId}}."
depends_on:
  - "{{taskId}}-plan"
inputs:
  - "{{artifactDir}}/plan.md"
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
  - "{{artifactDir}}/diff.txt"
checks:
  - id: diff-written
    cmd: test -f "{{artifactDir}}/diff.txt"
---

# Sprint Implementation — Epoch {{epoch}}

**Goal:** {{goalId}} — {{goalDesc}}
**Task:** {{taskDesc}}

## Instructions

1. Read the plan at `{{artifactDir}}/plan.md`.
2. Implement exactly what the plan specifies:
   - Create files, install packages, write code
   - Keep changes minimal — this sprint's deliverable only
3. Run available verification (build, test, lint) locally.
4. Save the diff:
   ```bash
   git diff --name-only > {{artifactDir}}/diff.txt
   ```
5. If anything was built or changed, confirm it works.
