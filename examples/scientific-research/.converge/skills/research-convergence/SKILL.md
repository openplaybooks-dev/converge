---
id: research-convergence
title: Research Quality Convergence
---

# Research Quality Convergence

Evaluate overall research quality and decide whether to continue iterating or stop.

## Quality Score Rubric

Compute a weighted score (0-100):

| Criterion | Weight | Scoring Method |
|-----------|--------|---------------|
| Evidence Coverage | 25% | % of active hypotheses with evidence grade B or above |
| GRADE Quality | 30% | Weighted average: A=100, B=75, C=50, D=25 |
| Contradiction Resolution | 15% | % of contradictions resolved |
| Statistical Rigor | 15% | % of claims with computed effect sizes and CIs |
| Paper Completeness | 15% | % of 8 paper sections meeting minimum word counts |

```
qualityScore = 0.25*evidenceCoverage + 0.30*gradeQuality + 0.15*contradictionResolution + 0.15*statisticalRigor + 0.15*paperCompleteness
```

## Convergence Decision

**CONVERGED** when ALL of:
1. qualityScore >= targetScore
2. Improvement from prior epoch < 3 points (plateau)
3. No unresolved contradictions where both sides have grade B+ evidence

**CONTINUE** otherwise.

## Gap Analysis

When continuing, identify:
- Which subscore is weakest
- Specific actions for the next epoch to improve it
- Unresolved questions to investigate

## Ledger Entry

Append one JSON line to `research-ledger.jsonl` per epoch with:
- Epoch number, timestamp
- Quality score and all subscores
- Decision (CONVERGED/CONTINUE)
- Counts: hypotheses, claims, grade distribution

## Quality Criteria

- Score computation is traceable (show the math)
- Gap analysis is specific and actionable
- Ledger entry is appended (not overwritten)
- Decision follows the convergence rules strictly
