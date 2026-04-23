---
id: research-literature
title: Incremental Literature Search
---

# Literature Search

Conduct a systematic, incremental literature search.

## Process

1. For epoch 1: perform a broad search across the research domain
2. For later epochs: read prior `sources.json` and `gap-analysis.md` to focus on gaps
3. For each source found, extract structured citation data
4. Assess relevance: high (directly addresses question), medium (related), low (tangential)
5. Rate methodology quality for empirical sources
6. Identify knowledge gaps, conflicts, and emerging themes

## Incremental Search Strategy

- Never duplicate sources already found in prior epochs
- Focus search on gaps identified in prior convergence checks
- Broaden search terms if coverage is low
- Narrow search if too many low-relevance results

## Outputs

- `sources.json` — structured source data with citation info, key findings, methodology notes
- `prior-state.json` — cumulative knowledge state assessment

## Quality Criteria

- At least 3 distinct sources per epoch
- Each source has attributed findings
- Methodology is documented for empirical sources
- Knowledge gaps are explicitly identified
