---
id: research-statistics
title: Statistical Analysis
---

# Statistical Analysis

Compute effect sizes, confidence intervals, meta-analysis, and heterogeneity statistics.

## Methods

### Cohen's d
```
d = (M1 - M2) / SD_pooled
SD_pooled = sqrt((SD1^2 + SD2^2) / 2)
```
Thresholds: negligible < 0.2, small 0.2-0.5, medium 0.5-0.8, large > 0.8

### 95% Confidence Interval
```
SE = sqrt((n1+n2)/(n1*n2) + d^2/(2*(n1+n2)))
CI = [d - 1.96*SE, d + 1.96*SE]
```

For qualitative research, use grade-based SE:
- A: SE=0.10, B: SE=0.20, C: SE=0.35, D: SE=0.50

### Fixed-Effects Meta-Analysis
```
weight_i = 1 / SE_i^2
pooled_d = sum(weight_i * d_i) / sum(weight_i)
pooled_SE = sqrt(1 / sum(weight_i))
```

### I^2 Heterogeneity
```
Q = sum(weight_i * (d_i - pooled_d)^2)
I^2 = max(0, (Q - (k-1)) / Q) * 100
```
Interpretation: < 25% low, 25-75% moderate, > 75% substantial

If I^2 > 75%, switch to random-effects model (DerSimonian-Laird):
```
tau^2 = max(0, (Q - (k-1)) / (sum(w) - sum(w^2)/sum(w)))
weight_re_i = 1 / (SE_i^2 + tau^2)
```

## Quality Criteria

- Effect sizes computed for all testable hypotheses
- CIs provided for all effect sizes
- Meta-analysis performed when multiple epochs have data
- Heterogeneity assessed and interpreted
