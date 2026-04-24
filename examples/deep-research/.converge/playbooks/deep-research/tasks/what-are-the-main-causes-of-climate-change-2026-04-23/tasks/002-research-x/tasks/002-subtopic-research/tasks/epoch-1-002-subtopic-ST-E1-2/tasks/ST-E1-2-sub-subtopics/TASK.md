---
id: ST-E1-2-sub-subtopics
title: "Spawn Sub-subtopics: "
checks:
  - id: sub-subtopics-spawned
    description: Sub-subtopics spawned marker exists
    cmd: test -f /Users/minh/Documents/converge/examples/deep-research/.converge/artifacts/deep-research/2-research/ST-E1-2-spawned.json
wbs:
  type: nodejs
  path: /Users/minh/Documents/converge/examples/deep-research/.converge/playbooks/deep-research/wbs/templates/002-research-x/tasks/002-subtopic-research/templates/subtopic-task/tasks/sub-subtopics/wbs/wbs.js
vars:
  taskId: ST-E1-2-sub-subtopics
  epoch: 1
  subtopicId: ST-E1-2
  subtopicName: null
  subtopicDescription: null
  question: What are the main causes of climate change?
  domain: environmental science
  artifactsDir: /Users/minh/Documents/converge/examples/deep-research/.converge/artifacts/deep-research
  templatesDir: /Users/minh/Documents/converge/examples/deep-research/.converge/playbooks/deep-research/wbs/templates
  maxEpochs: 10
---

# Spawn Sub-subtopics for: 

This task reads the decomposition decision and spawns sub-subtopics if needed.

**Subtopic**: 
**Subtopic ID**: ST-E1-2
**Epoch**: 1

The WBS will:
1. Read `/Users/minh/Documents/converge/examples/deep-research/.converge/artifacts/deep-research/2-research/ST-E1-2-decompose.json`
2. If `shouldDecompose: true`, spawn each sub-subtopic using the SAME template (recursive)
3. If `shouldDecompose: false`, create a marker file and exit
