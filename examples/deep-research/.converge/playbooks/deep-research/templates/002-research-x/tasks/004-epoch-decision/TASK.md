---
id: "{{taskId}}"
title: "Epoch Decision — Epoch {{epoch}}"
skill: research-epoch-decide
depends_on:
  - 003-cross-topic-aggregate
seed:
  mode: cli
vars:
  epoch:
  question:
  domain:
  maxEpochs:
  confidenceThreshold:
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
**Confidence threshold**: {{confidenceThreshold}}

## Inputs

Read from prior task:
- `{{artifactsDir}}/epoch-{{epoch}}-003-cross-topic-aggregate/epoch-aggregate.json`

Read all prior epoch aggregates for cumulative context:
- `{{artifactsDir}}/epoch-1-003-cross-topic-aggregate/epoch-aggregate.json` (if exists)
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
  "confidenceThreshold": {{confidenceThreshold}},
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

## Seed

After writing the decision JSON, read `.continue` from it and emit exactly one downstream spawn:

```bash
ARTIFACTS_DIR="${CONVERGE_VAR_ARTIFACTSDIR:-.converge/artifacts/${CONVERGE_PLAYBOOK:-deep-research}}"
EPOCH="${CONVERGE_VAR_EPOCH:?epoch is required}"
DECISION="${ARTIFACTS_DIR}/epoch-${EPOCH}-004-epoch-decision/epoch-decision.json"
RESEARCH_X_TPL=".converge/playbooks/deep-research/templates/002-research-x/TASK.md"
REPORT_TPL=".converge/playbooks/deep-research/templates/003-report/TASK.md"

CONTINUE=$(jq -r '.continue // false' "${DECISION}")
PREV_EPOCH_ID="research-x-epoch-${EPOCH}"

if [ "${CONTINUE}" = "true" ]; then
  NEXT=$((EPOCH + 1))
  NEXT_ID="research-x-epoch-${NEXT}"
  converge spawn task \
    --id "${NEXT_ID}" \
    --task-file "${RESEARCH_X_TPL}" \
    --depends-on "${PREV_EPOCH_ID}" \
    --var "taskId=${NEXT_ID}" \
    --var "epoch=${NEXT}" \
    --var "question=${CONVERGE_VAR_QUESTION}" \
    --var "domain=${CONVERGE_VAR_DOMAIN}" \
    --var "maxEpochs=${CONVERGE_VAR_MAXEPOCHS:-3}" \
    --var "confidenceThreshold=${CONVERGE_VAR_CONFIDENCETHRESHOLD:-0.8}"
else
  converge spawn task \
    --id final-report \
    --task-file "${REPORT_TPL}" \
    --depends-on "${PREV_EPOCH_ID}" \
    --var "taskId=final-report" \
    --var "question=${CONVERGE_VAR_QUESTION}" \
    --var "domain=${CONVERGE_VAR_DOMAIN}"
fi
```

## Quality Criteria

- Confidence score is well-reasoned and evidence-based
- Decision considers both confidence threshold and max epochs
- If continuing, next epoch focus is clearly specified
- If terminating, reasoning is clearly documented
- Exactly one downstream spawn is emitted per decision
