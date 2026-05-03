---
id: 002-subtopic-research
title: Sub-topic Research
checks:
  - id: research-written
    description: subtopics.json exists
    cmd: test -f /Users/minh/Documents/converge/examples/deep-research/.converge/artifacts/deep-research/what-are-the-main-causes-of-climate-change-2026-04-23/1-initial/subtopics.json
seeds:
  - type: nodejs
    path: /Users/minh/Documents/converge/examples/deep-research/.converge/playbooks/deep-research/seed/templates/002-research-x/tasks/002-subtopic-research/wb./seed.js
vars:
  artifactsDir: /Users/minh/Documents/converge/examples/deep-research/.converge/artifacts/deep-research/what-are-the-main-causes-of-climate-change-2026-04-23
  templatesDir: /Users/minh/Documents/converge/examples/deep-research/.converge/playbooks/deep-research/seed/templates
  question: What are the main causes of climate change?
  domain: environmental science
  epoch: 1
  maxEpochs: 10
  taskId: 002-subtopic-research
  researchKey: what-are-the-main-causes-of-climate-change-2026-04-23
---

# Sub-topic Research — Epoch 1

Research all sub-topics for this epoch in parallel.

**Research question**: What are the main causes of climate change?
**Epoch**: 1
**Artifacts dir**: /Users/minh/Documents/converge/examples/deep-research/.converge/artifacts/deep-research/what-are-the-main-causes-of-climate-change-2026-04-23

## Inputs

Read from prior task:
- `/Users/minh/Documents/converge/examples/deep-research/.converge/artifacts/deep-research/what-are-the-main-causes-of-climate-change-2026-04-23/1-initial/subtopics.json`

## Process

1. **Read Sub-topics**: Get the list of sub-topics to research
2. **Parallel Research**: For each sub-topic, conduct thorough research
3. **Result Compilation**: Aggregate all sub-topic findings

The Seed script will spawn individual research tasks for each subtopic.
