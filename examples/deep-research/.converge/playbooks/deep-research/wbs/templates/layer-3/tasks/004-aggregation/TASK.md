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

Produce definitive findings and final insight summary for the research.

**Research question**: {{question}}

## Inputs

Read all Layer 3 phase outputs:
- `{{artifactsDir}}/001-critical-investigation/critical-investigation.json`
- `{{artifactsDir}}/002-reasoning-chains/chains.json`
- `{{artifactsDir}}/003-comprehensive-synthesis/synthesis.json`

## Process

1. **Key Findings**: Extract the definitive findings from synthesis
2. **Reasoning Quality**: Summarize the overall strength of reasoning chains
3. **Confidence Assessment**: Provide overall confidence in the research conclusions
4. **Final Triggers**: Document any remaining issues for the final report
5. **Recommendation**: This is the final layer — recommend max_layers_reached

## Output

Write `{{artifactsDir}}/004-aggregation/aggregation.json`:
```json
{
  "layer": {{layer}},
  "definitiveFindings": [
    {
      "finding": "The definitive finding",
      "evidenceStrength": "strong|moderate|weak",
      "reasoningChainId": "RC-1",
      "confidence": "high|medium|low"
    }
  ],
  "reasoningQualitySummary": {
    "overallStrength": "strong|moderate|weak",
    "strongestChains": ["RC-1", "RC-3"],
    "weakestChains": ["RC-2"]
  },
  "overallConfidence": "high|medium|low",
  "insightTriggers": [
    {
      "type": "limitation",
      "description": "Remaining limitation to document in final report"
    }
  ],
  "recommendation": "max_layers_reached",
  "finalSynthesis": {
    "narrative": "The comprehensive answer to the research question",
    "keyInsights": ["Insight 1", "Insight 2"],
    "limitations": ["Limitation 1"]
  }
}
```

## Quality Criteria

- Definitive findings are clearly documented
- Reasoning quality is honestly assessed
- Overall confidence reflects actual strength of evidence
- Final synthesis provides comprehensive answer to research question