---
id: "{{taskId}}"
title: "Gradient step — epoch {{epoch}}"
skill: frontier-gradient-step
dependencies:
  - 005-selection-merge
checks:
  - id: gradient-step-written
    cmd: "test -f {{artifactsDir}}/gradient-step.json"
    description: "gradient-step.json exists"
  - id: gradient-step-valid
    cmd: "node -e \"const g=JSON.parse(require('fs').readFileSync('{{artifactsDir}}/gradient-step.json','utf-8')); if(!g.decision)throw new Error('missing decision'); if(typeof g.insightDelta!=='number')throw new Error('missing insightDelta')\""
    description: "gradient-step.json has decision and insightDelta"
  - id: research-state-written
    cmd: "test -f {{projectDir}}/.converge/artifacts/frontier-research/research-state.json"
    description: "research-state.json exists"
---

# Gradient Step — Epoch {{epoch}}

Update the accumulated knowledge model and decide whether to continue or converge.

**Research question**: {{question}}
**Convergence threshold**: {{convergenceThreshold}}

## Inputs

- `{{artifactsDir}}/selection.json` — merged insights and insight delta
- `{{projectDir}}/.converge/artifacts/frontier-research/research-state.json` — accumulated knowledge (if exists)
- `{{projectDir}}/.converge/artifacts/frontier-research/research-ledger.jsonl` — prior epoch metrics (if exists)

## Process

1. Read the selection results and prior research state
2. Update `research-state.json` with new claims, connections, and dead ends
3. Compute convergence metrics:
   - Current insight delta from selection phase
   - Prior epoch delta from ledger (if available)
   - Consecutive low-delta count
4. Apply convergence rule:
   - **CONVERGED** if insight delta < {{convergenceThreshold}} for **2 consecutive epochs**
   - **CONTINUE** otherwise
5. Append epoch metrics to ledger
6. If CONVERGED, write a final summary of accumulated knowledge

## Convergence Decision

```
if (currentDelta < threshold && priorDelta < threshold):
    decision = "CONVERGED"
else:
    decision = "CONTINUE"
```

## Outputs

Write `{{artifactsDir}}/gradient-step.json`:
```json
{
  "epoch": {{epoch}},
  "insightDelta": 0.42,
  "priorInsightDelta": null,
  "consecutiveLowDelta": 0,
  "convergenceThreshold": {{convergenceThreshold}},
  "decision": "CONTINUE|CONVERGED",
  "decisionRationale": "Why this decision was made",
  "knowledgeSummary": {
    "totalClaims": 12,
    "totalConnections": 8,
    "totalDeadEnds": 3,
    "topInsights": ["The most important findings so far"]
  },
  "nextEpochGuidance": "What to focus on in the next epoch (null if CONVERGED)"
}
```

Update `{{projectDir}}/.converge/artifacts/frontier-research/research-state.json`:
```json
{
  "question": "{{question}}",
  "lastEpoch": {{epoch}},
  "claims": [
    { "id": "C1", "claim": "...", "evidence": "...", "confidence": 0.8, "sourceEpoch": 1, "sourceBeam": "B1" }
  ],
  "connections": [
    { "from": "C1", "to": "C2", "type": "supports|contradicts|extends", "strength": 0.7 }
  ],
  "deadEnds": [
    { "id": "DE1", "direction": "...", "reason": "...", "epoch": 1, "beam": "B3" }
  ],
  "convergenceHistory": [
    { "epoch": 1, "insightDelta": 0.42, "decision": "CONTINUE" }
  ]
}
```

Append to `{{projectDir}}/.converge/artifacts/frontier-research/research-ledger.jsonl`:
```json
{"epoch":{{epoch}},"ts":"<ISO>","insightDelta":0.42,"decision":"CONTINUE","totalClaims":12,"totalConnections":8,"totalDeadEnds":3,"beamsExplored":5,"beamsSelected":2}
```
