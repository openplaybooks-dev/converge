---
id: "{{taskId}}"
title: "Aggregation — layer {{layer}}"
skill: research-layer-aggregate
checks:
  - id: aggregation-written
    cmd: "test -f {{artifactsDir}}/004-aggregation/aggregation.json"
    description: "aggregation.json exists"
  - id: recommendation-valid
    cmd: "node -e \"const f=JSON.parse(require('fs').readFileSync('{{artifactsDir}}/004-aggregation/aggregation.json','utf-8')); if(!['proceed_to_layer_2','terminate'].includes(f.recommendation))throw new Error('invalid recommendation')\""
    description: "Recommendation is valid (proceed_to_layer_2 or terminate)"
---

# Aggregation — Layer {{layer}}

Synthesize findings from Layer {{layer}} phases and produce actionable outputs for the next layer.

**Research question**: {{question}}
**Min promising areas threshold**: {{minPromisingAreas}}

## Inputs

Read all prior phase outputs:
- `{{artifactsDir}}/001-rapid-search/rapid-search.json`
- `{{artifactsDir}}/002-surface-gather/sources.json`
- `{{artifactsDir}}/003-area-identification/areas.json`

## Process

1. **Key Findings**: Extract 3-5 most important findings from all sources
2. **Promising Areas**: From areas.json, select top areas for next layer
3. **Quality Gate Check**: Verify promising areas >= minPromisingAreas threshold
4. **Dropped Areas**: Document any areas that were deprioritized with rationale
5. **Insight Triggers**: Identify what the next layer must investigate:
   - Contradictions found between sources
   - Weak evidence for important claims
   - Areas more complex than expected
   - Confirmations of expected findings
6. **Recommendation**: Based on quality gate — proceed_to_layer_2 or terminate

## Output

Write `{{artifactsDir}}/004-aggregation/aggregation.json`:
```json
{
  "layer": {{layer}},
  "keyFindings": [
    {
      "id": "KF-1",
      "finding": "Specific finding discovered",
      "supportingSources": ["SRC-001", "SRC-003"],
      "confidence": 0.85
    }
  ],
  "promisingAreas": [
    {
      "id": "PA-1",
      "area": "Area name",
      "rationale": "Why this area warrants deeper investigation",
      "evidenceStrength": 0.8,
      "expectedInsightYield": "high|medium|low"
    }
  ],
  "droppedAreas": [
    {
      "area": "Area name",
      "rationale": "Why this area was not pursued"
    }
  ],
  "insightTriggers": [
    {
      "type": "contradiction|weakEvidence|scopeExpansion|confirmation",
      "description": "Description of the trigger",
      "requiresInvestigation": true,
      "targetLayer": 2
    }
  ],
  "recommendation": "proceed_to_layer_2|terminate",
  "qualityGate": {
    "promisingAreasCount": 4,
    "threshold": {{minPromisingAreas}},
    "passed": true
  }
}
```

## Quality Criteria

- All key findings have source citations
- Promising areas have explicit evidence strength scoring
- At least 1 insight trigger generated
- Quality gate check is explicit and documented
- Recommendation is valid (proceed_to_layer_2 or terminate)