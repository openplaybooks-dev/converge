---
id: "{{taskId}}"
title: "Sprint {{epoch}} — {{goalDesc}}"
description: "One sprint toward goal {{goalId}}. Pipeline: plan → implement → verify."
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
  - id: backlog-updated
    cmd: "grep -q done {{backlogPath}}"
---

# Sprint {{epoch}}: {{goalDesc}}

**Backlog:** {{summary}}
**Built so far:** {{fileList}}

## Pipeline

1. **Plan** — read idea.md, backlog, and codebase. Write a concrete sprint plan.
2. **Implement** — execute the plan. Write real code.
3. **Verify** — run checks, update backlog, discover new tasks if needed.

After all phases complete, the seed reads the updated backlog and spawns
the next sprint. Goals auto-advance when all their tasks are done.
