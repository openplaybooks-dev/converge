---
id: frontier-analyze
title: Frontier Analysis
---

# Frontier Analysis

Map the current knowledge frontier and identify the most promising edges for exploration.

## Process

1. For epoch 1: analyze the research question to identify what is known, unknown, and contested
2. For later epochs: read `research-state.json` to understand accumulated knowledge and dead ends
3. Identify frontier edges — boundaries between known and unknown territory
4. Score each edge on three dimensions:
   - **Impact** (0-1): How much would progress here advance overall understanding?
   - **Tractability** (0-1): How likely is meaningful progress with available reasoning methods?
   - **Novelty** (0-1): How unexplored is this direction? (Lower if similar to dead ends)
5. Compute composite: `0.4 * impact + 0.3 * tractability + 0.3 * novelty`
6. Filter out directions overlapping with tracked dead ends
7. Rank by composite score

## Outputs

- `frontier-analysis.json` — ranked frontier edges with scores, rationale, and suggested approaches

## Quality Criteria

- At least 3 frontier edges identified per epoch
- Each edge has a clear, specific direction (not vague)
- Scores are justified with rationale
- Dead ends from prior epochs are respected
- Frontier shift from prior epoch is documented (for epoch 2+)
