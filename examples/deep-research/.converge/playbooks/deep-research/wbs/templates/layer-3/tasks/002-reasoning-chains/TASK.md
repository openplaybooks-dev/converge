---
id: "{{taskId}}"
title: "Reasoning chains — layer {{layer}}"
skill: research-reasoning-chains
checks:
  - id: chains-written
    cmd: "test -f {{artifactsDir}}/002-reasoning-chains/chains.json"
    description: "chains.json exists"
---

# Reasoning Chains — Layer {{layer}}

Trace how conclusions were derived, verify evidence quality, and document the reasoning path.

**Research question**: {{question}}

## Inputs

Read `{{artifactsDir}}/001-critical-investigation/critical-investigation.json`

## Process

1. For each major conclusion in critical areas:
   - Identify the evidence supporting the conclusion
   - Trace the reasoning path: evidence → inference → conclusion
   - Identify any assumptions in the reasoning chain
   - Assess how strong the chain is (high/medium/low confidence)
2. For any breaks or weak links:
   - Document where evidence is insufficient
   - Note what would strengthen the chain
3. Verify each chain is traceable back to sources

## Output

Write `{{artifactsDir}}/002-reasoning-chains/chains.json`:
```json
{
  "layer": {{layer}},
  "researchQuestion": "{{question}}",
  "reasoningChains": [
    {
      "id": "RC-1",
      "conclusion": "The final conclusion",
      "chain": [
        {
          "step": 1,
          "evidence": "Source claim or data point",
          "sourceId": "SRC-001",
          "inference": "What we infer from this evidence",
          "confidence": "high|medium|low"
        },
        {
          "step": 2,
          "evidence": "Combined inference from step 1 + new evidence",
          "inference": "Next step in reasoning",
          "confidence": "medium"
        }
      ],
      "assumptions": ["Assumption 1", "Assumption 2"],
      "overallStrength": "strong|moderate|weak",
      "weakestLink": "Where the chain is most vulnerable",
      "strengtheningNeeded": "What would make this chain stronger"
    }
  ],
  "unverifiableClaims": [
    {
      "claim": "Claim that cannot be fully traced",
      "reason": "Why it cannot be fully verified"
    }
  ]
}
```

## Quality Criteria

- All major conclusions have traceable reasoning chains
- Assumptions are explicitly documented
- Weak links in chains are identified
- Unverifiable claims are honestly reported