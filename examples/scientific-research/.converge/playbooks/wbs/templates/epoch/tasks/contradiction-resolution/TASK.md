---
id: "{{taskId}}"
title: "Contradiction resolution — epoch {{epoch}}"
skill: research-contradictions
dependencies:
  - 005-evidence-synthesis
checks:
  - id: contradictions-written
    cmd: "test -f {{artifactsDir}}/contradiction-resolution/contradictions.json"
    description: "contradictions.json exists"
  - id: contradictions-valid
    cmd: "node -e \"const c=JSON.parse(require('fs').readFileSync('{{artifactsDir}}/contradiction-resolution/contradictions.json','utf-8')); if(!Array.isArray(c.contradictions))throw new Error('missing contradictions array')\""
    description: "contradictions.json has contradictions array"
---

# Contradiction Resolution — Epoch {{epoch}}

Systematically identify and resolve conflicting evidence.

**Research question**: {{question}}

## Inputs

- `{{artifactsDir}}/evidence-synthesis/evidence-grades.json`
- `{{artifactsDir}}/statistical-analysis/statistics.json`
- `{{artifactsDir}}/literature/sources.json`

## Process

1. Scan all claims for pairs that contradict each other
2. For each contradiction, apply resolution strategies in order:
   - **Weight of evidence**: If one side has substantially stronger evidence (higher grade, larger effect), adopt it
   - **Scope refinement**: The claims may both be true under different conditions — refine the scope
   - **Methodological reconciliation**: Differences in methodology may explain the conflict
   - **Flag as unresolved**: If no resolution is possible, flag for investigation in next epoch

3. For each resolved contradiction, document:
   - The resolution strategy used
   - Confidence in the resolution
   - Any implications for hypothesis posteriors

## Resolution Strategies

### Weight of Evidence
Compare GRADE ratings and effect sizes. If claim A has grade A/B with large effect and claim B has grade C/D with small effect, adopt claim A. Document the evidence asymmetry.

### Scope Refinement
Both claims may be valid in different contexts. Restate claims with narrower scope conditions. Example: "X causes Y" vs "X doesn't cause Y" → "X causes Y under condition Z but not under condition W".

### Methodological Reconciliation
Different methodologies may produce different results. Document the methodological differences and which methodology is more appropriate for the research question.

### Unresolved
Flag the contradiction with specific questions that need investigation in the next epoch. These feed back into the literature search and hypothesis phases.

## Output

Write `{{artifactsDir}}/contradiction-resolution/contradictions.json`:
```json
{
  "epoch": {{epoch}},
  "contradictions": [
    {
      "id": "CONTR-1",
      "claimA": { "id": "C1", "statement": "...", "grade": "B" },
      "claimB": { "id": "C3", "statement": "...", "grade": "C" },
      "nature": "direct-opposition|scope-conflict|magnitude-disagreement",
      "resolved": true,
      "resolutionStrategy": "weight-of-evidence|scope-refinement|methodological-reconciliation|unresolved",
      "resolution": "Explanation of how the contradiction was resolved",
      "confidence": "high|medium|low",
      "implications": ["Any downstream effects on hypotheses or claims"],
      "questionsForNextEpoch": []
    }
  ],
  "summary": {
    "total": 1,
    "resolved": 1,
    "unresolved": 0,
    "resolutionStrategies": { "weight-of-evidence": 1 }
  }
}
```
