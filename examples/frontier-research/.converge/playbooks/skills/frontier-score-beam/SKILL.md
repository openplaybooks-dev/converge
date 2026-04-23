---
id: frontier-score-beam
title: Beam Scoring
---

# Beam Scoring

Score a single beam's exploration results on 5 dimensions.

## Scoring Dimensions (each 0-1)

| Dimension | Weight | Criteria |
|-----------|--------|----------|
| **Novelty** | 25% | Are insights genuinely new? Not restating known facts or obvious conclusions? |
| **Evidence** | 20% | How well-supported are claims? Quality of reasoning chain? Multiple independent lines of evidence? |
| **Coherence** | 20% | Do insights fit together internally? Consistent with accumulated knowledge? |
| **Depth** | 20% | Surface-level observations vs deep structural understanding? Identifies mechanisms, not just correlations? |
| **Generativity** | 15% | Do findings open new research directions? Generate follow-up questions? Enable new beams? |

## Composite Score

```
composite = 0.25*novelty + 0.20*evidence + 0.20*coherence + 0.20*depth + 0.15*generativity
```

## Process

1. Read the beam's exploration results
2. Read the original beam definition for context
3. Score each dimension independently with justification
4. Compute composite score
5. Identify the single most important insight (key insight)
6. Note strengths and weaknesses

## Outputs

- `beam-{id}.json` — 5-dimension scores, composite, strengths, weaknesses, key insight

## Quality Criteria

- All 5 dimensions scored with justification
- Composite correctly computed from weights
- Strengths and weaknesses reference specific findings (not generic)
- Key insight is a single, concrete claim (not a vague summary)
- Scoring is calibrated: 0.5 = average, 0.8+ = exceptional, 0.3- = poor
