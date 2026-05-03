---
id: "{{taskId}}"
title: "Spawn Sub-subtopics: {{subtopicName}}"
seeds:
  - type: nodejs
    path: {{templatesDir}}/002-research-x/tasks/002-subtopic-research/templates/subtopic-task/tasks/sub-subtopics/wb./seed.js
checks:
  - id: sub-subtopics-spawned
    cmd: "test -f {{artifactsDir}}/2-research/{{subtopicId}}-spawned.json"
    description: "Sub-subtopics spawned marker exists"
---

# Spawn Sub-subtopics for: {{subtopicName}}

This task reads the decomposition decision and spawns sub-subtopics if needed.

**Subtopic**: {{subtopicName}}
**Subtopic ID**: {{subtopicId}}
**Epoch**: {{epoch}}

The Seed will:
1. Read `{{artifactsDir}}/2-research/{{subtopicId}}-decompose.json`
2. If `shouldDecompose: true`, spawn each sub-subtopic using the SAME template (recursive)
3. If `shouldDecompose: false`, create a marker file and exit
