---
id: "{{taskId}}"
title: "Critical investigation — layer {{layer}}"
skill: research-critical-investigation
checks:
  - id: critical-written
    cmd: "test -f {{artifactsDir}}/001-critical-investigation/critical-investigation.json"
    description: "critical-investigation.json exists"
---

# Critical Investigation — Layer {{layer}}

Deep investigation of the most critical areas identified in Layer 2.

**Research question**: {{question}}

## Inputs

Read Layer 2 aggregation:
- `{{projectDir}}/.converge/artifacts/deep-research/layers/002/004-aggregation/aggregation.json` → criticalAreas

## Process

1. For each critical area identified in Layer 2:
   - Execute targeted deep searches to strengthen evidence base
   - Find additional sources that corroborate or contradict
   - Trace each claim back to its source
   - Identify the strongest evidence for the central conclusions
2. Focus on resolving any contradiction triggers from prior layer
3. Build comprehensive evidence map for each critical area

## Output

Write `{{artifactsDir}}/001-critical-investigation/critical-investigation.json`:
```json
{
  "layer": {{layer}},
  "researchQuestion": "{{question}}",
  "criticalAreas": [
    {
      "areaId": "CA-1",
      "areaName": "Name of critical area",
      "centralQuestion": "What is the key question this area addresses?",
      "evidenceMap": {
        "strongestEvidence": [
          { "claim": "...", "sources": ["SRC-001"], "strength": "high" }
        ],
        "moderateEvidence": [
          { "claim": "...", "sources": ["SRC-002"], "strength": "moderate" }
        ],
        "weakEvidence": [
          { "claim": "...", "sources": ["SRC-003"], "strength": "weak" }
        ]
      },
      "contradictionResolutions": [
        {
          "contradiction": "Description",
          "resolution": "How it was resolved or characterized as genuinely contested",
          "confidenceLevel": "high|medium|low"
        }
      ],
      "conclusion": "What we can conclude about this area given the evidence"
    }
  ]
}
```

## Quality Criteria

- Each critical area has comprehensive evidence map
- Contradiction triggers from prior layer are addressed
- Conclusions are grounded in specific sources