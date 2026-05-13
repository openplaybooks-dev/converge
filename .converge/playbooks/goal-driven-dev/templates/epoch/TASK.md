---
id: "{{taskId}}"
title: "Sprint {{epoch}} — {{goalDesc}}"
description: "Container task. Seed spawns plan+implement+verify children, then converges their results."
seeds:
  - type: seed
    name: sprint
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
checks:
  - id: result-exists
    cmd: test -s "{{artifactDir}}/result.json"
---

# Sprint {{epoch}}: {{goalDesc}}

**Backlog:** {{summary}} | **Built:** {{fileList}}

## Convergence

After plan, implement, and verify children complete:

1. Read `{{artifactDir}}/plan.md` for the sprint plan
2. Read `{{artifactDir}}/diff.txt` for what was changed
3. Read `{{artifactDir}}/result.json` for verification results
4. Update `{{backlogPath}}`: mark completed tasks done, activate next, discover new tasks
5. Write final sprint summary to `{{artifactDir}}/result.json`
