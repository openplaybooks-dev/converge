---
id: research-evaluate
title: Evidence Quality Evaluation
checks:
  - id: evidence-quality
    cmd: node ./check.js
    description: All claims backed by sources, no unresolved contradictions
---

# Evidence Quality Evaluation

Evaluate the quality and completeness of the research evidence.

## Process

1. Read `evidence.json`
2. Validate every claim has sources
3. Check for unresolved contradictions
4. Verify all hypotheses have test results
5. Assess overall evidence sufficiency

## Quality Criteria

- Zero unbacked claims
- Zero unresolved contradictions
- All hypotheses tested (supported/refuted/inconclusive)
- Minimum evidence threshold met
