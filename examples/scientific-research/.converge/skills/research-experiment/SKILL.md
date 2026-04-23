---
id: research-experiment
title: Structured Experiment Execution
---

# Structured Experiment Execution

Test a hypothesis using a structured methodology that produces quantifiable results.

## Process

1. Read the hypothesis statement, test plan, and falsification criteria
2. Design the experiment:
   - Define what constitutes "treatment" vs "control" (or comparison groups)
   - Identify the outcome measure
   - Document potential confounders
3. Execute the experiment — gather evidence through reasoning, literature analysis, or data analysis
4. Compute effect size using Cohen's d or appropriate measure
5. Estimate confidence interval
6. Document methodology and limitations
7. Determine outcome against falsification criteria

## Effect Size Computation

Cohen's d:
```
d = (M_treatment - M_control) / SD_pooled
SD_pooled = sqrt((SD1^2 + SD2^2) / 2)
```

Magnitude: |d| < 0.2 negligible, 0.2-0.5 small, 0.5-0.8 medium, > 0.8 large

For qualitative evidence, estimate effect magnitude from evidence strength:
- Strong, consistent evidence: d ~ 0.8-1.2
- Moderate evidence: d ~ 0.4-0.7
- Weak or mixed evidence: d ~ 0.1-0.3

## Output Schema

Each result must include:
- `status`: supported, refuted, or inconclusive
- `effectSize`: with type, value, magnitude
- `confidenceInterval`: with lower, upper, level
- `evidence`: array of observations with source and weight
- `methodology`: description of approach
- `limitations`: acknowledged weaknesses

## Quality Criteria

- Every observation cites a source
- Effect size is computed and interpreted
- Methodology is documented
- Limitations are acknowledged
- Status is justified by evidence and falsification criteria
