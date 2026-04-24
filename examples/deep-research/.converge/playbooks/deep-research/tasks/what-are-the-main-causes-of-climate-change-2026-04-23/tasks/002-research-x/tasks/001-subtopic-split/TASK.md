---
id: 001-subtopic-split
title: Sub-topic Split
checks:
  - id: subtopics-written
    description: subtopics.json exists
    cmd: test -f /Users/minh/Documents/converge/examples/deep-research/.converge/artifacts/deep-research/what-are-the-main-causes-of-climate-change-2026-04-23/1-initial/subtopics.json
vars:
  skill: research-subtopic-split
  taskId: 001-subtopic-split
  question: What are the main causes of climate change?
  domain: environmental science
  artifactsDir: /Users/minh/Documents/converge/examples/deep-research/.converge/artifacts/deep-research/what-are-the-main-causes-of-climate-change-2026-04-23
  templatesDir: /Users/minh/Documents/converge/examples/deep-research/.converge/playbooks/deep-research/wbs/templates
  maxEpochs: 10
  researchKey: what-are-the-main-causes-of-climate-change-2026-04-23
  epoch: 1
---

# Sub-topic Split — Epoch 1

AI decides which sub-topics to research in this epoch.

**Research question**: What are the main causes of climate change?
**Epoch**: 1
**Max epochs**: 10
**Artifacts dir**: /Users/minh/Documents/converge/examples/deep-research/.converge/artifacts/deep-research/what-are-the-main-causes-of-climate-change-2026-04-23

## Process

1. **Read Prior Context**: Check any existing epoch findings for context
2. **AI Analysis**: Given the research question and prior findings, decide sub-topics
3. **Sub-topic Definition**: For each sub-topic, define scope, approach, and expected insight

## Output

Write `/Users/minh/Documents/converge/examples/deep-research/.converge/artifacts/deep-research/what-are-the-main-causes-of-climate-change-2026-04-23/1-initial/subtopics.json`:
```json
{
  "epoch": 1,
  "subtopics": [
    {
      "id": "ST-E1-1",
      "subtopic": "Specific sub-topic to research",
      "scope": "What this covers in this epoch",
      "approach": "How to research this sub-topic",
      "expectedInsight": "What we expect to find",
      "priority": 1
    }
  ],
  "totalSubtopics": 3,
  "aiRationale": "Why these sub-topics, given prior findings..."
}
```

## Quality Criteria

- Sub-topics are distinct and collectively cover important ground
- Each sub-topic has clear scope and approach
- AI rationale documents the decision given prior epochs
