---
id: "{{taskId}}"
title: "Comprehensive synthesis — layer {{layer}}"
skill: research-comprehensive-synthesis
checks:
  - id: synthesis-written
    cmd: "test -f {{artifactsDir}}/003-comprehensive-synthesis/synthesis.json"
    description: "synthesis.json exists"
---

# Comprehensive Synthesis — Layer {{layer}}

Build a complete, integrated understanding of the research question based on all prior investigation.

**Research question**: {{question}}

## Inputs

Read all prior Layer 3 outputs:
- `{{artifactsDir}}/001-critical-investigation/critical-investigation.json`
- `{{artifactsDir}}/002-reasoning-chains/chains.json`

Also read all prior layer aggregations to integrate findings.

## Process

1. Integrate findings from all critical areas into a coherent picture
2. Resolve any remaining contradictions or document them as genuinely contested
3. Identify the overarching narrative — what is the complete answer to the research question?
4. Assess overall confidence in the synthesis
5. Identify any remaining gaps or limitations

## Output

Write `{{artifactsDir}}/003-comprehensive-synthesis/synthesis.json`:
```json
{
  "layer": {{layer}},
  "researchQuestion": "{{question}}",
  "comprehensiveSynthesis": {
    "narrative": "Complete narrative answering the research question",
    "confidenceLevel": "high|medium|low",
    "keyInsights": [
      {
        "insight": "The most important finding",
        "reasoningChainId": "RC-1",
        "supportingSources": ["SRC-001", "SRC-002"]
      }
    ],
    "contradictionsResolved": [
      "How contradiction X was resolved"
    ],
    "genuinelyContested": [
      "What remains genuinely contested despite investigation"
    ],
    "limitations": [
      "What this synthesis cannot fully answer"
    ]
  },
  "finalAssessment": {
    "coverage": "How thoroughly the research question was addressed",
    "evidenceQuality": "Overall quality of evidence supporting conclusions",
    "reasoningStrength": "Overall strength of reasoning chains"
  }
}
```

## Quality Criteria

- Comprehensive narrative integrates all critical areas
- Contradictions are resolved or marked as genuinely contested
- Overall confidence level is honestly assessed
- Limitations are documented