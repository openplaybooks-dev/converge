---
id: "{{taskId}}"
title: "Selection & merge — epoch {{epoch}}"
skill: frontier-select-merge
depends_on:
  - 004-beam-scoring
checks:
  - id: selection-written
    cmd: "test -f {{artifactsDir}}/selection.json"
    description: "selection.json exists"
  - id: selection-valid
    cmd: "node -e \"const s=JSON.parse(require('fs').readFileSync('{{artifactsDir}}/selection.json','utf-8')); if(!s.selectedBeams||!Array.isArray(s.selectedBeams)||s.selectedBeams.length===0)throw new Error('no selected beams'); if(typeof s.insightDelta!=='number')throw new Error('missing insightDelta')\""
    description: "selection.json has selected beams and insight delta"
---

# Selection & Merge — Epoch {{epoch}}

Select the top-{{selectionWidth}} beams and merge their insights into the accumulated knowledge model.

**Research question**: {{question}}
**Selection width**: {{selectionWidth}}

## Inputs

- `{{artifactsDir}}/scores/summary.json` — ranked beam scores
- `{{artifactsDir}}/explorations/summary.json` — all exploration results
- `{{projectDir}}/.converge/artifacts/frontier-research/research-state.json` — accumulated knowledge (if exists)

## Process

1. Read scored beams, ranked by composite score
2. Select top-{{selectionWidth}} beams as "winners"
3. Merge insights from selected beams:
   - Combine claims, evidence, and connections
   - Resolve any contradictions between beams
   - Identify cross-beam patterns (insights that multiple beams converged on)
4. Record dead ends from eliminated beams (prevent re-exploration)
5. Compute **insight delta**: proportion of genuinely new insights vs. accumulated knowledge
   - `insightDelta = newUniqueInsights / totalAccumulatedInsights`
   - A high delta means the epoch was productive; a low delta suggests diminishing returns

## Output

Write `{{artifactsDir}}/selection.json`:
```json
{
  "epoch": {{epoch}},
  "selectionWidth": {{selectionWidth}},
  "selectedBeams": [
    {
      "beamId": "B1",
      "composite": 0.85,
      "keyInsight": "Most important finding",
      "mergedInsights": [
        { "claim": "...", "evidence": "...", "confidence": 0.8, "novelty": 0.7 }
      ]
    }
  ],
  "eliminatedBeams": [
    { "beamId": "B3", "composite": 0.4, "reason": "Low evidence score", "deadEnds": ["..."] }
  ],
  "crossBeamPatterns": ["Insights confirmed by multiple beams"],
  "contradictions": ["Conflicting findings between beams and resolution"],
  "newInsightsCount": 5,
  "totalAccumulatedInsights": 12,
  "insightDelta": 0.42,
  "mergedKnowledge": {
    "claims": ["All accumulated claims"],
    "connections": ["Relationships between claims"],
    "deadEnds": ["All tracked dead ends"]
  }
}
```
