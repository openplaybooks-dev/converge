---
id: epoch-1-002-subtopic-ST-E1-1
title: "Research: "
checks:
  - id: subtopic-research-written
    description: Subtopic research output exists
    cmd: test -f /Users/minh/Documents/converge/examples/deep-research/.converge/artifacts/deep-research/what-are-the-main-causes-of-climate-change-2026-04-23/2-research/ST-E1-1.md
seeds:
  - type: nodejs
    path: /Users/minh/Documents/converge/examples/deep-research/.converge/playbooks/deep-research/seed/templates/002-research-x/tasks/002-subtopic-research/templates/subtopic-task/wb./seed.js
vars:
  subtopicId: ST-E1-1
  subtopicName: null
  subtopicDescription: 
  epoch: 1
  question: What are the main causes of climate change?
  domain: environmental science
  artifactsDir: /Users/minh/Documents/converge/examples/deep-research/.converge/artifacts/deep-research/what-are-the-main-causes-of-climate-change-2026-04-23
  templatesDir: /Users/minh/Documents/converge/examples/deep-research/.converge/playbooks/deep-research/seed/templates
  maxEpochs: 10
  taskId: epoch-1-002-subtopic-ST-E1-1
---

# Research:  — Epoch 1

Research sub-topic: ****

**Description**: 

**Research question**: What are the main causes of climate change?
**Epoch**: 1
**Sub-topic ID**: ST-E1-1

## Process

1. **Deep Research**: Conduct thorough research on this sub-topic
2. **Source Collection**: Gather credible sources and citations
3. **Insight Extraction**: Identify key findings and insights
4. **Gap Analysis**: Note remaining unknowns or areas needing more research

## Output

Write `/Users/minh/Documents/converge/examples/deep-research/.converge/artifacts/deep-research/what-are-the-main-causes-of-climate-change-2026-04-23/epoch-1-002-subtopic-research/ST-E1-1/research.json`:
```json
{
  "subtopicId": "ST-E1-1",
  "subtopicName": "",
  "epoch": 1,
  "findings": [
    {
      "finding": "Specific finding about this sub-topic",
      "sources": ["source 1", "source 2"],
      "confidence": 0.85
    }
  ],
  "keyInsights": ["insight 1", "insight 2"],
  "remainingGaps": ["gap 1", "gap 2"],
  "researchDepth": "medium"
}
```

## Quality Criteria

- At least 3 distinct findings with source citations
- Key insights clearly articulated
- Remaining gaps documented for potential follow-up
