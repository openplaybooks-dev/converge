---
id: "{{taskId}}"
title: "Cross analysis — layer {{layer}}"
skill: research-cross-analysis
checks:
  - id: cross-analysis-written
    cmd: "test -f {{artifactsDir}}/002-cross-analysis/cross-analysis.json"
    description: "cross-analysis.json exists"
---

# Cross Analysis — Layer {{layer}}

Analyze cross-source patterns within each promising area.

**Research question**: {{question}}

## Inputs

Read `{{artifactsDir}}/001-deep-dive-areas/deep-dive.json`

## Process

1. For each promising area:
   - Identify patterns across sources (converging evidence, diverging claims)
   - Analyze how sources corroborate or contradict each other
   - Trace claim provenance: which sources support which claims
   - Identify where sources disagree and why
2. For each area, document:
   - Converging claims (multiple sources agree)
   - Diverging claims (sources disagree)
   - Reasoning patterns (how conclusions are derived)

## Output

Write `{{artifactsDir}}/002-cross-analysis/cross-analysis.json`:
```json
{
  "layer": {{layer}},
  "researchQuestion": "{{question}}",
  "areas": [
    {
      "areaId": "PA-1",
      "convergingClaims": [
        {
          "claim": "Description of claim with multiple source support",
          "supportingSources": ["SRC-001", "SRC-002"],
          "confidenceLevel": "high|medium|low"
        }
      ],
      "divergingClaims": [
        {
          "claim": "Description of claim with disagreement",
          "supportingSources": ["SRC-001"],
          "contradictingSources": ["SRC-003"],
          "natureOfDisagreement": "Statistical discrepancy|Interpretation difference|Quality difference"
        }
      ],
      "reasoningPatterns": [
        "How conclusion X is derived from sources Y and Z"
      ]
    }
  ]
}
```

## Quality Criteria

- All areas have cross-source analysis
- Converging and diverging claims are documented
- Reasoning patterns trace evidence to conclusions