---
id: "{{taskId}}"
title: "Final report generation"
skill: research-final-report
checks:
  - id: report-written
    cmd: "test -f {{artifactsDir}}/report.md"
    description: "report.md exists"
  - id: citations-present
    cmd: "node -e \"const f=require('fs').readFileSync('{{artifactsDir}}/report.md','utf-8'); if(!f.includes('[SRC-'))throw new Error('no citations')\""
    description: "Report contains inline [SRC-N] citations"
---

# Final Report — Deep Research Synthesis

Generate the comprehensive final research report synthesizing all three layers.

**Research question**: {{question}}

## Inputs

Read all layer aggregations:
- `{{projectDir}}/.converge/artifacts/deep-research/layers/001/004-aggregation/aggregation.json`
- `{{projectDir}}/.converge/artifacts/deep-research/layers/002/004-aggregation/aggregation.json`
- `{{projectDir}}/.converge/artifacts/deep-research/layers/003/004-aggregation/aggregation.json`

Read source registry:
- `{{projectDir}}/.converge/artifacts/deep-research/source-registry.json`

## Report Structure

### 1. Executive Summary (150-250 words)

Synthesize the most important findings across all layers into 3-5 bullet points. Each bullet should represent a major insight with its confidence level.

### 2. Key Findings by Layer

**Layer 1 — Breadth Survey Findings**:
- Key findings from Layer 1 with [SRC-N] citations
- Promising areas identified

**Layer 2 — Focused Exploration Findings**:
- Cross-area insights (connections, contradictions)
- Critical areas for deeper investigation

**Layer 3 — Deep Investigation Findings**:
- Definitive findings with reasoning chains
- Resolved contradictions and genuinely contested topics

### 3. Deep Dive Analysis

Comprehensive analysis of the 1-2 most critical areas from Layer 3. Include all supporting evidence, reasoning chains, and source citations.

### 4. Reasoning Chains

For each major conclusion:
- The chain of evidence leading to it
- Assumptions and their support
- How contradictions were resolved or characterized

### 5. Source Quality Overview

- Summary of source quality across all layers
- Tier distribution (high/medium/low quality sources)
- Key sources that drove major conclusions

### 6. Limitations and Gaps

- Areas investigated but not resolved
- Contradictions that could not be resolved
- Evidence gaps requiring further research

### 7. References

Full citation list with [SRC-N] IDs, sorted by relevance.

## Output

Write `{{artifactsDir}}/report.md` — the complete structured final report with inline [SRC-N] citations throughout.

## Quality Criteria

- Every factual claim has inline [SRC-N] citation
- Reasoning chains are visible and traceable
- Limitations are honestly reported
- Report is comprehensive (3000+ words)
- Structure follows the 7-section outline above