---
id: research-hypothesize
title: Bayesian Hypothesis Formulation
---

# Bayesian Hypothesis Formulation

Formulate testable hypotheses with Bayesian prior probabilities and falsification criteria.

## Process

1. Read literature review outputs
2. For new hypotheses: assign priors based on literature strength
3. For existing hypotheses: update priors using Bayesian formula
4. Define falsification criteria for each hypothesis
5. Assess complexity (simple = direct test, complex = needs decomposition)
6. Retire hypotheses whose posteriors have converged (SD < 0.05)

## Bayesian Update Formula

```
posterior_mean = (prior_mean / prior_sd^2 + evidence_mean / evidence_sd^2) / (1/prior_sd^2 + 1/evidence_sd^2)
posterior_sd = sqrt(1 / (1/prior_sd^2 + 1/evidence_sd^2))
```

### Prior Assignment (Epoch 1)
- Strong literature support: mean=0.7, sd=0.15
- Moderate support: mean=0.5, sd=0.20
- Speculative: mean=0.3, sd=0.25

### Evidence Uncertainty by GRADE
- Grade A: sd=0.10
- Grade B: sd=0.15
- Grade C: sd=0.25
- Grade D: sd=0.40

## Quality Criteria

- Every hypothesis has a falsification criterion
- Every hypothesis has a concrete test plan
- Priors are justified (not arbitrary)
- Carried-forward hypotheses have updated posteriors
