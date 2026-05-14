---
id: "{{taskId}}-plan"
title: "Plan — Sprint {{epoch}}"
description: "Plan what to build this sprint toward goal {{goalId}}."
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
  - "{{artifactDir}}/plan.md"
checks:
  - id: plan-written
    cmd: test -s "{{artifactDir}}/plan.md"
---

# Sprint Plan — Epoch {{epoch}}

**Goal:** {{goalId}} — {{goalDesc}}
**Task:** {{taskDesc}}
**Backlog:** {{summary}}
**Built so far:** {{fileList}}

## Instructions

1. Read `{{ideaPath}}` for the full project vision.
2. Read `{{backlogPath}}` for goals and task status.
3. Scan the current codebase — what exists, what's missing.
4. Read prior epoch results in `.converge/artifacts/app-builder/epochs/` for context.

Write a concrete sprint plan to `{{artifactDir}}/plan.md`:

```markdown
# Sprint {{epoch}} Plan

## Goal
{{goalDesc}}

## Current state
- Files: (list what exists)
- Last built: (what the previous epoch accomplished)

## This sprint
- **Objective**: (one sentence — what will exist when done)
- **Files to create**: (specific paths)
- **Files to modify**: (specific paths)
- **Dependencies to add**: (npm packages)

## Verification
- (how to confirm this sprint is done — specific commands)
```

Keep the plan focused. ONE concrete deliverable per sprint.
