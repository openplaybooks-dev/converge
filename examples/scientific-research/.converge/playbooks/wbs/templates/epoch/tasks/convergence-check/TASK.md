---
id: "{{taskId}}"
title: "Convergence check — epoch {{epoch}}"
skill: research-convergence
dependencies:
  - 007-paper-draft
checks:
  - id: convergence-written
    cmd: "test -f {{artifactsDir}}/convergence/convergence.json"
    description: "convergence.json exists"
  - id: convergence-valid
    cmd: "node -e \"const c=JSON.parse(require('fs').readFileSync('{{artifactsDir}}/convergence/convergence.json','utf-8')); if(typeof c.qualityScore!=='number')throw new Error('missing qualityScore'); if(!c.decision)throw new Error('missing decision')\""
    description: "convergence.json has qualityScore and decision"
  - id: gap-analysis-written
    cmd: "test -f {{artifactsDir}}/convergence/gap-analysis.md"
    description: "gap-analysis.md exists"
---

# Convergence Check — Epoch {{epoch}}

Evaluate research quality and decide whether to continue or stop.

**Research question**: {{question}}
**Target score**: {{targetScore}}

## Inputs

Read ALL epoch artifacts:
- `{{artifactsDir}}/literature/sources.json`
- `{{artifactsDir}}/hypothesize/hypotheses.json`
- `{{artifactsDir}}/evidence-synthesis/evidence-grades.json`
- `{{artifactsDir}}/contradiction-resolution/contradictions.json`
- `{{artifactsDir}}/statistical-analysis/statistics.json`
- `{{artifactsDir}}/statistical-analysis/meta-analysis.json`
- `{{artifactsDir}}/paper-draft/paper-draft.md`
- `{{projectDir}}/.converge/artifacts/scientific-research/research-ledger.jsonl` (prior scores)

## Quality Score Computation

Compute a weighted quality score (0-100):

| Criterion | Weight | Scoring |
|-----------|--------|---------|
| Evidence Coverage | 25% | % of hypotheses with evidence grade B or above |
| GRADE Quality | 30% | Weighted avg of grades (A=100, B=75, C=50, D=25) |
| Contradiction Resolution | 15% | % of contradictions resolved |
| Statistical Rigor | 15% | % of claims with effect sizes and CIs |
| Paper Completeness | 15% | % of paper sections meeting minimum word counts |

```
qualityScore = 0.25 * evidenceCoverage + 0.30 * gradeQuality + 0.15 * contradictionResolution + 0.15 * statisticalRigor + 0.15 * paperCompleteness
```

## Convergence Decision

**CONVERGED** if:
1. `qualityScore >= targetScore` AND
2. Improvement from prior epoch < 3 points (plateau detected) AND
3. No unresolved contradictions with grade B+ evidence on both sides

**CONTINUE** otherwise, with specific gap analysis for next epoch.

## Outputs

Write `{{artifactsDir}}/convergence/convergence.json`:
```json
{
  "epoch": {{epoch}},
  "qualityScore": 72,
  "subscores": {
    "evidenceCoverage": { "score": 80, "weight": 0.25, "details": "..." },
    "gradeQuality": { "score": 65, "weight": 0.30, "details": "..." },
    "contradictionResolution": { "score": 100, "weight": 0.15, "details": "..." },
    "statisticalRigor": { "score": 60, "weight": 0.15, "details": "..." },
    "paperCompleteness": { "score": 55, "weight": 0.15, "details": "..." }
  },
  "priorEpochScore": null,
  "improvement": null,
  "decision": "CONTINUE|CONVERGED",
  "decisionRationale": "...",
  "criticalGaps": ["..."]
}
```

Append to `{{projectDir}}/.converge/artifacts/scientific-research/research-ledger.jsonl`:
```json
{"epoch":{{epoch}},"ts":"<ISO>","qualityScore":72,"subscores":{...},"decision":"CONTINUE","hypothesesCount":3,"claimsCount":5,"gradesDistribution":{"A":0,"B":2,"C":2,"D":1}}
```

Write `{{artifactsDir}}/convergence/gap-analysis.md`:
```markdown
# Gap Analysis — Epoch {{epoch}}

## Quality Score: NN/100

## Weakest Areas
1. **<criterion>** (score: NN) — what's missing
2. ...

## Recommended Actions for Next Epoch
- [ ] Specific action to improve weakest area
- [ ] ...

## Unresolved Questions
- Question that needs investigation
```
