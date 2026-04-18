---
id: research-hypothesize
title: Hypothesis Formulation
---

# Hypothesis Formulation

Formulate testable hypotheses based on the literature review.

## Process

1. Read `literature-review.md` and `known-findings.json`
2. Identify knowledge gaps and open questions
3. Formulate specific, testable hypotheses
4. For each hypothesis, define a test plan
5. Assess complexity — can it be tested directly, or does it need its own research pipeline?

## Outputs

- `hypotheses.json`:
  ```json
  {
    "hypotheses": [
      {
        "id": "H1",
        "statement": "...",
        "testable": true,
        "testPlan": "Description of how to test this hypothesis",
        "complexity": "simple|complex",
        "rationale": "Why this hypothesis is worth testing"
      }
    ]
  }
  ```

## Quality Criteria

- At least 1 testable hypothesis
- Each hypothesis has a concrete test plan
- Hypotheses are falsifiable (can be refuted by evidence)
- Complexity is assessed for each hypothesis
