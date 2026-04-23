---
id: "{{taskId}}"
title: "Deep dive areas — layer {{layer}}"
skill: research-deep-dive
checks:
  - id: deep-dive-written
    cmd: "test -f {{artifactsDir}}/001-deep-dive-areas/deep-dive.json"
    description: "deep-dive.json exists"
---

# Deep Dive Areas — Layer {{layer}}

Investigate each promising area from Layer 1 with deeper source gathering and analysis.

**Research question**: {{question}}

## Inputs

Read prior layer aggregation:
- `{{projectDir}}/.converge/artifacts/deep-research/layers/001/004-aggregation/aggregation.json` → promisingAreas

## Process

1. For each promising area from prior layer:
   - Execute targeted searches to gather deeper sources
   - Analyze sources for specific claims and evidence
   - Extract key claims with source citations
   - Note any contradictions or weak evidence
2. For each area, produce detailed findings

## Output

Write `{{artifactsDir}}/001-deep-dive-areas/deep-dive.json`:
```json
{
  "layer": {{layer}},
  "researchQuestion": "{{question}}",
  "areas": [
    {
      "areaId": "PA-1",
      "areaName": "Name of promising area",
      "findings": [
        {
          "id": "DDF-1",
          "finding": "Specific finding in this area",
          "sources": ["SRC-001", "SRC-002"],
          "evidenceQuality": "strong|moderate|weak",
          "contradictions": ["CLM-X contradicts CLM-Y"],
          "knowledgeGaps": ["What we still don't know"]
        }
      ],
      "overallAssessment": "How well this area is understood now"
    }
  ],
  "sourcesByArea": {
    "PA-1": ["SRC-001", "SRC-002", "SRC-003"],
    "PA-2": ["SRC-004", "SRC-005"]
  }
}
```

## Quality Criteria

- Each promising area has detailed investigation
- Contradictions and weak evidence are flagged
- Knowledge gaps are identified per area