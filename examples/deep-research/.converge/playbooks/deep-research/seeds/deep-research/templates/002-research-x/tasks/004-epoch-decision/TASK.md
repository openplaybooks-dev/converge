---
id: "{{taskId}}"
title: "Epoch Decision"
skill: research-epoch-decide
seeds:
  - type: nodejs
    path: {{templatesDir}}/002-research-x/tasks/004-epoch-decision/wbs/wbs.js
    after: true
vars:
  artifactsDir: "{{artifactsDir}}"
  templatesDir: "{{templatesDir}}"
  question: "{{question}}"
  domain: "{{domain}}"
  epoch: "{{epoch}}"
  maxEpochs: "{{maxEpochs}}"
checks:
  - id: decision-written
    cmd: "test -f {{artifactsDir}}/epoch-{{epoch}}-004-epoch-decision/epoch-decision.json"
    description: "epoch-decision.json exists"
---

# Epoch Decision — Epoch {{epoch}}

AI decides: continue to next research-x epoch, or proceed to final report?

**Research question**: {{question}}
**Epoch**: {{epoch}}
**Max epochs**: {{maxEpochs}}
**Artifacts dir**: {{artifactsDir}}

## Inputs

Read from prior task:
- `{{artifactsDir}}/epoch-{{epoch}}-003-cross-topic-aggregate/epoch-aggregate.json`

Read all prior epoch aggregates for cumulative context:
- `{{artifactsDir}}/epoch-1/-003-cross-topic-aggregate/epoch-aggregate.json` (if exists)
- (and so on for all prior epochs)

## Process

1. **Confidence Assessment**: Evaluate overall research confidence
2. **Coverage Check**: How much of the question is covered?
3. **Diminishing Returns**: Are new epochs likely to add significant value?
4. **Stop Decision**: Based on confidence threshold AND max epochs

## Output

Write `{{artifactsDir}}/epoch-{{epoch}}-004-epoch-decision/epoch-decision.json`:
```json
{
  "epoch": {{epoch}},
  "continue": true,
  "confidence": 0.75,
  "confidenceThreshold": 0.85,
  "aboveThreshold": false,
  "reasoning": "AI explanation for decision",
  "nextEpochFocus": [
    "Specific focus areas for epoch {{epoch}} + 1"
  ],
  "insightsGained": [
    "Summary of insights from this epoch"
  ],
  "remainingGaps": [
    "What still needs investigation"
  ],
  "maxEpochsReached": false
}
```

**Decision Logic:**
- `continue: true` if `confidence < threshold` AND `epoch < maxEpochs`
- `continue: false` if `confidence >= threshold` OR `epoch >= maxEpochs`

## Quality Criteria

- Confidence score is well-reasoned and evidence-based
- Decision considers both confidence threshold and max epochs
- If continuing, next epoch focus is clearly specified
- If terminating, reasoning is clearly documented