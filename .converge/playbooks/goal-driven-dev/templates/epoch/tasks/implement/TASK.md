---
id: "{{taskId}}-implement"
title: "Implement — Sprint {{epoch}}"
description: "Execute the sprint plan. Build the feature."
depends_on:
  - "{{planTaskId}}"
inputs:
  - "{{artifactDir}}/plan.md"
vars:
  epoch: "{{epoch}}"
  goalId: "{{goalId}}"
  goalDesc: "{{goalDesc}}"
  artifactDir: "{{artifactDir}}"
outputs:
  - "{{artifactDir}}/diff.txt"
checks:
  - id: diff-exists
    cmd: test -f "{{artifactDir}}/diff.txt"
---

# Sprint Implementation — {{goalDesc}}

## Instructions

1. Read `{{artifactDir}}/plan.md`.
2. Build exactly what the plan specifies. Real code, no stubs.
3. Run available checks locally.
4. Save diff: `git diff --name-only > {{artifactDir}}/diff.txt`
