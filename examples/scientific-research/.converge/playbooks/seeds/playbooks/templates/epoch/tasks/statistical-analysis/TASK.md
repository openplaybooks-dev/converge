---
id: "{{taskId}}"
title: "Statistical analysis — epoch {{epoch}}"
skill: research-statistics
dependencies:
  - 003-experiment
checks:
  - id: statistics-written
    cmd: "test -f {{artifactsDir}}/statistical-analysis/statistics.json"
    description: "statistics.json exists"
  - id: meta-analysis-written
    cmd: "test -f {{artifactsDir}}/statistical-analysis/meta-analysis.json"
    description: "meta-analysis.json exists"
  - id: statistics-valid
    cmd: "node -e \"const s=JSON.parse(require('fs').readFileSync('{{artifactsDir}}/statistical-analysis/statistics.json','utf-8')); if(!s.hypothesisResults||!Array.isArray(s.hypothesisResults))throw new Error('missing hypothesisResults')\""
    description: "statistics.json has hypothesisResults array"
---

# Statistical Analysis — Epoch {{epoch}}

Compute effect sizes, confidence intervals, and meta-analysis across all experiment results.

**Research question**: {{question}}

## Inputs

- `{{artifactsDir}}/experiment/summary.json` — consolidated experiment results
- `{{artifactsDir}}/experiment/H*.json` — individual hypothesis results
- Prior epoch `meta-analysis.json` files (for cumulative meta-analysis)

## Statistical Methods

### Effect Size Computation

For each hypothesis result, compute Cohen's d:
```
d = (M1 - M2) / SD_pooled
SD_pooled = sqrt((SD1² + SD2²) / 2)
```

Magnitude thresholds: |d| < 0.2 = negligible, 0.2-0.5 = small, 0.5-0.8 = medium, > 0.8 = large

### Confidence Intervals

For each effect size, compute 95% CI:
```
SE = sqrt((n1+n2)/(n1*n2) + d²/(2*(n1+n2)))
CI = d ± 1.96 * SE
```

If sample sizes aren't applicable (qualitative research), estimate precision from evidence quality:
- Grade A evidence: SE = 0.10
- Grade B evidence: SE = 0.20
- Grade C evidence: SE = 0.35
- Grade D evidence: SE = 0.50

### Meta-Analysis (Cross-Epoch)

If prior epochs have results for the same hypothesis, perform fixed-effects meta-analysis:
```
weight_i = 1 / SE_i²
pooled_effect = sum(weight_i * d_i) / sum(weight_i)
pooled_SE = sqrt(1 / sum(weight_i))
```

Compute I² heterogeneity:
```
Q = sum(weight_i * (d_i - pooled_effect)²)
I² = max(0, (Q - (k-1)) / Q) * 100
```
Where k = number of studies. I² > 75% indicates substantial heterogeneity — switch to random-effects model.

## Outputs

Write `{{artifactsDir}}/statistical-analysis/statistics.json`:
```json
{
  "epoch": {{epoch}},
  "hypothesisResults": [
    {
      "hypothesisId": "H1",
      "effectSize": { "type": "cohens_d", "value": 0.85, "magnitude": "large" },
      "confidenceInterval": { "lower": 0.42, "upper": 1.28, "level": 0.95 },
      "sampleSize": { "n1": 30, "n2": 30 },
      "pValue": 0.001,
      "statisticalSignificance": true,
      "practicalSignificance": true
    }
  ]
}
```

Write `{{artifactsDir}}/statistical-analysis/meta-analysis.json`:
```json
{
  "epoch": {{epoch}},
  "cumulativeResults": [
    {
      "hypothesisId": "H1",
      "epochsIncluded": [1, 2],
      "model": "fixed-effects|random-effects",
      "pooledEffect": { "value": 0.72, "se": 0.12 },
      "pooledCI": { "lower": 0.48, "upper": 0.96, "level": 0.95 },
      "heterogeneity": { "Q": 2.3, "I2": 15.2, "interpretation": "low" },
      "k": 2
    }
  ],
  "overallAssessment": "Summary of statistical findings"
}
```
