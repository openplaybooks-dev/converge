---
id: "{{taskId}}"
title: "Hypothesize — epoch {{epoch}}"
skill: research-hypothesize
dependencies:
  - 001-literature
checks:
  - id: hypotheses-written
    cmd: "test -f {{artifactsDir}}/hypothesize/hypotheses.json"
    description: "hypotheses.json exists"
  - id: hypotheses-valid
    cmd: "node -e \"const h=JSON.parse(require('fs').readFileSync('{{artifactsDir}}/hypothesize/hypotheses.json','utf-8')); if(!h.hypotheses||h.hypotheses.length===0)throw new Error('no hypotheses'); h.hypotheses.forEach((x,i)=>{if(!x.id||!x.statement||!x.testPlan||!x.priorProbability)throw new Error('hypothesis '+(i+1)+' missing fields')})\""
    description: "hypotheses.json has valid hypotheses with priors"
---

# Hypothesis Formulation — Epoch {{epoch}}

Formulate or update testable hypotheses with Bayesian prior probabilities.

**Research question**: {{question}}

## Cross-Epoch Context

For epoch 1, formulate initial hypotheses from the literature review.
For subsequent epochs:
- Read prior epoch `hypotheses.json` to carry forward existing hypotheses
- Update priors based on accumulated evidence from `evidence-grades.json`
- Add new hypotheses if gaps were identified
- Retire hypotheses that have converged (posterior SD < 0.05)

## Bayesian Prior Updating

For each hypothesis carried from a prior epoch, update using:

```
posterior_mean = (prior_mean / prior_sd² + evidence_mean / evidence_sd²) / (1/prior_sd² + 1/evidence_sd²)
posterior_sd = sqrt(1 / (1/prior_sd² + 1/evidence_sd²))
```

Where:
- `prior_mean`, `prior_sd` = previous epoch's posterior (or initial prior for epoch 1)
- `evidence_mean` = proportion of supporting evidence (0-1)
- `evidence_sd` = uncertainty based on evidence quality (A=0.1, B=0.15, C=0.25, D=0.4)

For new hypotheses in epoch 1, assign priors based on literature support:
- Strong literature support: mean=0.7, sd=0.15
- Moderate support: mean=0.5, sd=0.20
- Speculative: mean=0.3, sd=0.25

## Inputs

- `{{artifactsDir}}/literature/sources.json`
- `{{artifactsDir}}/literature/prior-state.json`
- Prior epoch artifacts (if epoch > 1)

## Output

Write `{{artifactsDir}}/hypothesize/hypotheses.json`:
```json
{
  "question": "{{question}}",
  "epoch": {{epoch}},
  "hypotheses": [
    {
      "id": "H1",
      "statement": "...",
      "testable": true,
      "falsificationCriteria": "What evidence would refute this",
      "testPlan": "How to test this hypothesis",
      "complexity": "simple|complex",
      "rationale": "Why this is worth testing",
      "priorProbability": { "mean": 0.7, "sd": 0.15 },
      "priorSource": "literature|prior-epoch|speculative",
      "testedInEpochs": [],
      "status": "active|converged|retired"
    }
  ]
}
```
