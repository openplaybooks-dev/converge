---
id: frontier-select-merge
title: Selection & Merge
---

# Selection & Merge

Select top-K beams and merge their insights into accumulated knowledge.

## Process

1. Read scored beams ranked by composite score
2. Select top-K beams as "winners"
3. Merge insights from selected beams:
   - Deduplicate claims that express the same insight differently
   - Resolve contradictions between beams (prefer higher-evidence claims)
   - Identify cross-beam patterns — insights independently confirmed by multiple beams
4. Record dead ends from eliminated beams to prevent re-exploration
5. Compute insight delta:
   - Count genuinely new unique insights this epoch
   - Compare to total accumulated insights
   - `insightDelta = newUniqueInsights / totalAccumulatedInsights`

## Insight Delta Interpretation

- `> 0.5` — highly productive epoch, major new territory explored
- `0.2 - 0.5` — productive epoch, meaningful new insights
- `0.1 - 0.2` — diminishing returns, approaching convergence
- `< 0.1` — very little new, likely converged

## Outputs

- `selection.json` — selected beams, eliminated beams, merged knowledge, insight delta

## Quality Criteria

- Exactly K beams selected (matching selectionWidth input)
- Selection is strictly by composite score ranking
- Insight deduplication is genuine (not just string matching — semantic dedup)
- Dead ends from eliminated beams are preserved
- Insight delta computation is traceable (show the counts)
