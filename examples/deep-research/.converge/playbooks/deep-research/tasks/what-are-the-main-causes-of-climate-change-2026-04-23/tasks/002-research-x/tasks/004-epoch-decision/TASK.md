---
id: 004-epoch-decision
title: Epoch Decision
checks:
  - id: decision-written
    description: epoch-decision.json exists
    cmd: test -f /Users/minh/Documents/converge/examples/deep-research/.converge/artifacts/deep-research/what-are-the-main-causes-of-climate-change-2026-04-23/epoch-1-004-epoch-decision/epoch-decision.json
wbs:
  type: nodejs
  path: /Users/minh/Documents/converge/examples/deep-research/.converge/playbooks/deep-research/wbs/templates/002-research-x/tasks/004-epoch-decision/wbs/wbs.js
vars:
  skill: research-epoch-decide
  artifactsDir: /Users/minh/Documents/converge/examples/deep-research/.converge/artifacts/deep-research/what-are-the-main-causes-of-climate-change-2026-04-23
  templatesDir: /Users/minh/Documents/converge/examples/deep-research/.converge/playbooks/deep-research/wbs/templates
  question: What are the main causes of climate change?
  domain: environmental science
  epoch: 1
  maxEpochs: 10
  taskId: 004-epoch-decision
  researchKey: what-are-the-main-causes-of-climate-change-2026-04-23
---

# Epoch Decision — Epoch 1

AI decides: continue to next research-x epoch, or proceed to final report?

**Research question**: What are the main causes of climate change?
**Epoch**: 1
**Max epochs**: 10
**Artifacts dir**: /Users/minh/Documents/converge/examples/deep-research/.converge/artifacts/deep-research/what-are-the-main-causes-of-climate-change-2026-04-23

## Inputs

Read from prior task:
- `/Users/minh/Documents/converge/examples/deep-research/.converge/artifacts/deep-research/what-are-the-main-causes-of-climate-change-2026-04-23/epoch-1-003-cross-topic-aggregate/epoch-aggregate.json`

Read all prior epoch aggregates for cumulative context:
- `/Users/minh/Documents/converge/examples/deep-research/.converge/artifacts/deep-research/what-are-the-main-causes-of-climate-change-2026-04-23/epoch-1/-003-cross-topic-aggregate/epoch-aggregate.json` (if exists)
- (and so on for all prior epochs)

## Process

1. **Confidence Assessment**: Evaluate overall research confidence
2. **Coverage Check**: How much of the question is covered?
3. **Diminishing Returns**: Are new epochs likely to add significant value?
4. **Stop Decision**: Based on confidence threshold AND max epochs

## Output

Write `/Users/minh/Documents/converge/examples/deep-research/.converge/artifacts/deep-research/what-are-the-main-causes-of-climate-change-2026-04-23/epoch-1-004-epoch-decision/epoch-decision.json`:
```json
{
  "epoch": 1,
  "continue": true,
  "confidence": 0.75,
  "confidenceThreshold": 0.85,
  "aboveThreshold": false,
  "reasoning": "AI explanation for decision",
  "nextEpochFocus": [
    "Specific focus areas for epoch 1 + 1"
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
