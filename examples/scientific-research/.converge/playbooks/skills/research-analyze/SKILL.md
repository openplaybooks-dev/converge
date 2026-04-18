---
id: research-analyze
title: Data Analysis
---

# Data Analysis

Cross-reference experiment results with literature, identify patterns and gaps.

## Process

1. Read all `experiment-results/*.json` files
2. Read `known-findings.json` from literature review
3. Cross-reference results with prior findings
4. Identify patterns, contradictions, and remaining gaps
5. Update the evidence index

## Outputs

- `analysis.md` — narrative analysis of all results
- `evidence.json` — structured evidence index:
  ```json
  {
    "question": "...",
    "status": "complete|partial|dead-end",
    "claims": [
      {
        "claim": "...",
        "confidence": "high|medium|low",
        "sources": [{ "type": "literature|empirical|analytical", "reference": "..." }]
      }
    ],
    "contradictions": [
      { "claim1": "...", "claim2": "...", "resolved": false, "resolution": null }
    ],
    "hypotheses": [
      { "id": "H1", "statement": "...", "tested": true, "result": "supported|refuted|inconclusive", "evidence": "..." }
    ]
  }
  ```

## Quality Criteria

- Every claim has at least one source
- Contradictions are explicitly identified
- All tested hypotheses are accounted for
- Overall status reflects the evidence quality
