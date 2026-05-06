---
id: "{{taskId}}"
title: "Evidence synthesis — epoch {{epoch}}"
skill: research-grade
depends_on:
  - 004-statistical-analysis
checks:
  - id: grades-written
    cmd: "test -f {{artifactsDir}}/evidence-synthesis/evidence-grades.json"
    description: "evidence-grades.json exists"
  - id: grades-valid
    cmd: "node -e \"const g=JSON.parse(require('fs').readFileSync('{{artifactsDir}}/evidence-synthesis/evidence-grades.json','utf-8')); if(!g.claims||!Array.isArray(g.claims)||g.claims.length===0)throw new Error('no claims'); g.claims.forEach((c,i)=>{if(!c.grade||!['A','B','C','D'].includes(c.grade))throw new Error('claim '+(i+1)+' missing valid grade')})\""
    description: "evidence-grades.json has claims with valid GRADE ratings"
---

# Evidence Synthesis — Epoch {{epoch}}

Apply GRADE methodology to rate evidence quality for each research claim.

**Research question**: {{question}}

## Inputs

- `{{artifactsDir}}/statistical-analysis/statistics.json`
- `{{artifactsDir}}/statistical-analysis/meta-analysis.json`
- `{{artifactsDir}}/hypothesize/hypotheses.json`
- `{{artifactsDir}}/literature/sources.json`

## GRADE Methodology

Rate each claim on a 4-level scale:

### Grade A — High Quality
- Consistent findings from multiple high-quality sources
- Large effect sizes with narrow confidence intervals
- Direct applicability to the research question
- No major limitations in methodology

### Grade B — Moderate Quality
- Consistent findings from adequate sources
- Meaningful effect sizes with reasonable confidence intervals
- Mostly applicable to the research question
- Minor methodological limitations

### Grade C — Low Quality
- Inconsistent findings or limited sources
- Small or uncertain effect sizes
- Indirect applicability or significant extrapolation needed
- Notable methodological limitations

### Grade D — Very Low Quality
- Single source or expert opinion only
- No quantifiable effect size
- Largely indirect or speculative
- Major methodological concerns

### Upgrading/Downgrading Factors

Upgrade one level for:
- Large magnitude of effect (d > 0.8)
- Dose-response gradient observed
- All plausible confounders would reduce the effect

Downgrade one level for:
- Risk of bias in study design
- Inconsistency across sources (I² > 50%)
- Indirectness of evidence
- Imprecision (wide confidence intervals crossing null)

## Bayesian Posterior Update

For each hypothesis, compute the posterior probability using evidence from this epoch:
```
evidence_mean = proportion of claims supporting hypothesis (weighted by grade)
evidence_sd = grade-based uncertainty (A=0.1, B=0.15, C=0.25, D=0.4)
```

Apply the Bayesian update formula from the hypothesize phase.

## Output

Write `{{artifactsDir}}/evidence-synthesis/evidence-grades.json`:
```json
{
  "epoch": {{epoch}},
  "question": "{{question}}",
  "claims": [
    {
      "id": "C1",
      "statement": "...",
      "grade": "B",
      "gradeRationale": "Explanation of rating and any upgrade/downgrade factors",
      "effectSize": { "type": "cohens_d", "value": 0.85, "magnitude": "large" },
      "confidenceInterval": { "lower": 0.42, "upper": 1.28, "level": 0.95 },
      "supportingEvidence": [
        { "sourceId": "S1", "finding": "...", "weight": 0.8 }
      ],
      "contradictingEvidence": [
        { "sourceId": "S3", "finding": "...", "weight": 0.3 }
      ],
      "relatedHypotheses": ["H1"],
      "bayesianPosterior": 0.87
    }
  ],
  "hypothesisPosteriors": [
    {
      "id": "H1",
      "priorProbability": { "mean": 0.7, "sd": 0.15 },
      "posteriorProbability": { "mean": 0.87, "sd": 0.08 },
      "evidenceStrength": "strong|moderate|weak",
      "testedInEpochs": [1]
    }
  ],
  "overallGradeDistribution": { "A": 0, "B": 2, "C": 1, "D": 0 }
}
```
