---
id: 003-cross-topic-aggregate
title: Cross-Topic Aggregate
checks:
  - id: aggregate-written
    description: epoch-aggregate.json exists
    cmd: test -f /Users/minh/Documents/converge/examples/deep-research/.converge/artifacts/deep-research/what-are-the-main-causes-of-climate-change-2026-04-23/epoch-1-003-cross-topic-aggregate/epoch-aggregate.json
vars:
  skill: research-layer-aggregate
  taskId: 003-cross-topic-aggregate
  question: What are the main causes of climate change?
  domain: environmental science
  artifactsDir: /Users/minh/Documents/converge/examples/deep-research/.converge/artifacts/deep-research/what-are-the-main-causes-of-climate-change-2026-04-23
  templatesDir: /Users/minh/Documents/converge/examples/deep-research/.converge/playbooks/deep-research/wbs/templates
  maxEpochs: 10
  researchKey: what-are-the-main-causes-of-climate-change-2026-04-23
  epoch: 1
---

# Cross-Topic Aggregate — Epoch 1

Synthesize findings across all sub-topics researched in this epoch.

**Research question**: What are the main causes of climate change?
**Epoch**: 1
**Artifacts dir**: /Users/minh/Documents/converge/examples/deep-research/.converge/artifacts/deep-research/what-are-the-main-causes-of-climate-change-2026-04-23

## Inputs

Read from prior task:
- `/Users/minh/Documents/converge/examples/deep-research/.converge/artifacts/deep-research/what-are-the-main-causes-of-climate-change-2026-04-23/epoch-1-002-subtopic-research/research-results.json`

Also read prior epoch aggregates (if any) to build cumulative picture:
- `/Users/minh/Documents/converge/examples/deep-research/.converge/artifacts/deep-research/what-are-the-main-causes-of-climate-change-2026-04-23/epoch-1-1/-003-cross-topic-aggregate/epoch-aggregate.json` (if exists)

## Process

1. **Cross-Synthesis**: Find connections and patterns across sub-topics
2. **Cumulative Integration**: Combine with prior epoch findings
3. **Insight Elevation**: Extract higher-order insights that emerge from combination
4. **Coverage Assessment**: Evaluate how much of the overall question is now covered

## Output

Write `/Users/minh/Documents/converge/examples/deep-research/.converge/artifacts/deep-research/what-are-the-main-causes-of-climate-change-2026-04-23/epoch-1-003-cross-topic-aggregate/epoch-aggregate.json`:
```json
{
  "epoch": 1,
  "crossTopicInsights": [
    {
      "insight": "Higher-order insight from combining sub-topics",
      "componentFindings": ["KF-1", "KF-3"],
      "confidence": 0.85
    }
  ],
  "cumulativeInsights": [
    {
      "insight": "Insight from all epochs combined",
      "epochs": [1, 2],
      "confidence": 0.8
    }
  ],
  "coverageAssessment": {
    "totalSubtopicsInvestigated": 12,
    "coveragePercentage": 0.75,
    "coveredAspects": ["aspect 1", "aspect 2"],
    "remainingAspects": ["aspect 3"]
  },
  "thisEpochContribution": "What this epoch added to the overall picture"
}
```

## Quality Criteria

- Cross-topic insights clearly synthesize across sub-topics
- Cumulative insights build on prior epochs
- Coverage assessment provides quantifiable progress
- Clear articulation of what this epoch contributed
