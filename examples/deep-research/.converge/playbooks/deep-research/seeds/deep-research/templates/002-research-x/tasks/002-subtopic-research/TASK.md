---
id: "{{taskId}}"
title: "Sub-topic Research"
seeds:
  - type: nodejs
    path: {{templatesDir}}/002-research-x/tasks/002-subtopic-research/wbs/wbs.js
vars:
  artifactsDir: "{{artifactsDir}}"
  templatesDir: "{{templatesDir}}"
  question: "{{question}}"
  domain: "{{domain}}"
  epoch: "{{epoch}}"
  maxEpochs: "{{maxEpochs}}"
checks:
  - id: research-written
    cmd: "test -f {{artifactsDir}}/1-initial/subtopics.json"
    description: "subtopics.json exists"
---

# Sub-topic Research — Epoch {{epoch}}

Research all sub-topics for this epoch in parallel.

**Research question**: {{question}}
**Epoch**: {{epoch}}
**Artifacts dir**: {{artifactsDir}}

## Inputs

Read from prior task:
- `{{artifactsDir}}/1-initial/subtopics.json`

## Process

1. **Read Sub-topics**: Get the list of sub-topics to research
2. **Parallel Research**: For each sub-topic, conduct thorough research
3. **Result Compilation**: Aggregate all sub-topic findings

The WBS script will spawn individual research tasks for each subtopic.