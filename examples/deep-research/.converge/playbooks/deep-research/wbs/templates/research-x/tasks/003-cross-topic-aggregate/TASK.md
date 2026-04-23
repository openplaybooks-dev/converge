---
id: "{{taskId}}"
title: "Cross-Topic Aggregate"
skill: research-layer-aggregate
checks:
  - id: aggregate-written
    cmd: "test -f {{artifactsDir}}/epoch-{{epoch}}-003-cross-topic-aggregate/epoch-aggregate.json"
    description: "epoch-aggregate.json exists"
---

# Cross-Topic Aggregate — Epoch {{epoch}}

Synthesize findings across all sub-topics researched in this epoch.

**Research question**: {{question}}
**Epoch**: {{epoch}}
**Artifacts dir**: {{artifactsDir}}

## Inputs

Read from prior task:
- `{{artifactsDir}}/epoch-{{epoch}}-002-subtopic-research/research-results.json`

Also read prior epoch aggregates (if any) to build cumulative picture:
- `{{artifactsDir}}/epoch-{{epoch}}-1/-003-cross-topic-aggregate/epoch-aggregate.json` (if exists)

## Process

1. **Cross-Synthesis**: Find connections and patterns across sub-topics
2. **Cumulative Integration**: Combine with prior epoch findings
3. **Insight Elevation**: Extract higher-order insights that emerge from combination
4. **Coverage Assessment**: Evaluate how much of the overall question is now covered

## Output

Write `{{artifactsDir}}/epoch-{{epoch}}-003-cross-topic-aggregate/epoch-aggregate.json`:
```json
{
  "epoch": {{epoch}},
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