---
id: "{{taskId}}"
title: "Research: {{subtopicName}}"
vars:
  subtopicId:
  subtopicName:
  subtopicDescription:
  epoch:
  question:
  domain:
  maxEpochs:
  confidenceThreshold:
checks:
  - id: subtopic-research-written
    cmd: "test -f {{artifactsDir}}/2-research/{{subtopicId}}.md"
    description: "Subtopic research output exists"
---

# Research: {{subtopicName}} — Epoch {{epoch}}

Research sub-topic: **{{subtopicName}}**

**Description**: {{subtopicDescription}}

**Research question**: {{question}}
**Epoch**: {{epoch}}
**Sub-topic ID**: {{subtopicId}}

## Subtopic pipeline

Three sequential subtasks live under `tasks/` and are auto-discovered by the framework:

1. **001-research** — conducts deep research on this subtopic and writes `{{artifactsDir}}/2-research/{{subtopicId}}.md`
2. **002-decompose** — decides whether to break this subtopic into sub-subtopics; writes `{{subtopicId}}-decompose.json`
3. **003-sub-subtopics** — if the decompose step said yes, dynamically spawns one child per sub-subtopic (recursive — same `subtopic-task` template) via CLI

The recursion stops naturally when the AI's decomposition decision flips to `shouldDecompose: false`.
