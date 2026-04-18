---
id: research-experiment
title: Experiment Execution
---

# Experiment Execution

Test a specific hypothesis according to its test plan.

## Process

1. Read the hypothesis and its test plan
2. Design the experiment (data collection, methodology)
3. Execute the experiment — gather evidence
4. Record results with supporting data
5. Determine outcome: supported, refuted, or inconclusive

## Outputs

- `experiment-results/{hypothesis-id}.json`:
  ```json
  {
    "hypothesisId": "H1",
    "statement": "...",
    "status": "supported|refuted|inconclusive",
    "evidence": [
      { "observation": "...", "source": "...", "supports": true }
    ],
    "methodology": "...",
    "limitations": ["..."],
    "confidence": "high|medium|low"
  }
  ```

## Quality Criteria

- Every claim in the result has a source
- Methodology is documented
- Limitations are acknowledged
- Status is justified by the evidence
