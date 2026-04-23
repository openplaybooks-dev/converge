---
id: "{{taskId}}"
title: "Aggregation — layer {{layer}}"
skill: research-layer-aggregate
checks:
  - id: aggregation-written
    cmd: "test -f {{artifactsDir}}/004-aggregation/aggregation.json"
    description: "aggregation.json exists"
---

# Aggregation — Layer {{layer}}

Synthesize cross-area findings and produce actionable outputs for the next layer.

**Research question**: {{question}}

## Inputs

Read all prior phase outputs:
- `{{artifactsDir}}/001-deep-dive-areas/deep-dive.json`
- `{{artifactsDir}}/002-cross-analysis/cross-analysis.json`
- `{{artifactsDir}}/003-compare-findings/comparison.json`

Also read prior layer aggregation:
- `{{projectDir}}/.converge/artifacts/deep-research/layers/001/004-aggregation/aggregation.json`

## Process

1. **Cross-Area Insights**: From comparison.json, identify key insights across areas
2. **Quality Gate Check**: Did we produce cross-area insights (connection, contradiction, or complementary)?
3. **Critical Areas**: Which areas have the most significant findings?
4. **Contradiction Triggers**: Which contradictions must be resolved in Layer 3?
5. **Insight Triggers for Next Layer**: Forward any unresolved issues
6. **Recommendation**: Based on quality gate — proceed_to_layer_3 or skip_layer_3

## Output

Write `{{artifactsDir}}/004-aggregation/aggregation.json`:
```json
{
  "layer": {{layer}},
  "crossAreaInsights": [
    {
      "id": "CAI-1",
      "type": "connection|contradiction|complementary",
      "description": "...",
      "significance": "..."
    }
  ],
  "criticalAreas": [
    {
      "areaId": "PA-1",
      "rationale": "Why this area is critical for final investigation",
      "keyFindings": ["Finding 1", "Finding 2"]
    }
  ],
  "insightTriggers": [
    {
      "type": "contradiction|weakEvidence|scopeExpansion|confirmation",
      "description": "Description",
      "requiresInvestigation": true,
      "targetLayer": 3
    }
  ],
  "recommendation": "proceed_to_layer_3|skip_layer_3",
  "qualityGate": {
    "crossAreaInsightsCount": 3,
    "passed": true,
    "reason": "Found connections and contradictions between areas"
  }
}
```

## Quality Criteria

- Cross-area insights are documented with significance
- Quality gate check explicitly evaluates whether to proceed
- At least 1 insight trigger for next layer
- Recommendation is valid (proceed_to_layer_3 or skip_layer_3)