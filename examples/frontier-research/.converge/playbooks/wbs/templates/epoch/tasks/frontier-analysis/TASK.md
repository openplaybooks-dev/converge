---
id: "{{taskId}}"
title: "Frontier analysis — epoch {{epoch}}"
skill: frontier-analyze
checks:
  - id: frontier-analysis-written
    cmd: "test -f {{artifactsDir}}/frontier-analysis.json"
    description: "frontier-analysis.json exists"
  - id: frontier-analysis-valid
    cmd: "node -e \"const f=JSON.parse(require('fs').readFileSync('{{artifactsDir}}/frontier-analysis.json','utf-8')); if(!f.edges||!Array.isArray(f.edges)||f.edges.length===0)throw new Error('no frontier edges'); f.edges.forEach((e,i)=>{if(!e.id||!e.direction||typeof e.impact!=='number')throw new Error('edge '+(i+1)+' missing fields')})\""
    description: "frontier-analysis.json has valid edges with scores"
---

# Frontier Analysis — Epoch {{epoch}}

Map the current knowledge frontier and identify the most promising edges for exploration.

**Research question**: {{question}}
**Domain**: {{domain}}

## Cross-Epoch Context

Check for prior epoch artifacts:
- Read `{{projectDir}}/.converge/artifacts/frontier-research/research-state.json` for accumulated knowledge model
- Read `{{projectDir}}/.converge/artifacts/frontier-research/research-ledger.jsonl` for prior epoch metrics
- Read prior epoch `selection.json` files to understand which directions were productive
- Read prior epoch `gradient-step.json` to see convergence trajectory

For epoch 1, start fresh. For subsequent epochs, focus on frontier edges that emerged from prior merged insights and avoid dead ends.

## Process

1. If prior epochs exist, read the accumulated `research-state.json`
2. Identify the boundaries of current knowledge about the research question
3. For each frontier edge, assess:
   - **Impact**: How much would progress here advance understanding? (0-1)
   - **Tractability**: How likely is meaningful progress with available methods? (0-1)
   - **Novelty**: How unexplored is this direction? (0-1)
4. Rank edges by composite score: `0.4 * impact + 0.3 * tractability + 0.3 * novelty`
5. Filter out directions that overlap with tracked dead ends

## Output

Write `{{artifactsDir}}/frontier-analysis.json`:
```json
{
  "question": "{{question}}",
  "epoch": {{epoch}},
  "knownTerritory": ["Summary of what is already established"],
  "edges": [
    {
      "id": "E1",
      "direction": "Description of this frontier direction",
      "impact": 0.8,
      "tractability": 0.7,
      "novelty": 0.9,
      "compositeScore": 0.81,
      "rationale": "Why this edge is promising",
      "relatedDeadEnds": ["DE1"],
      "suggestedApproaches": ["Possible method 1", "Possible method 2"]
    }
  ],
  "deadEndsConsidered": ["Directions avoided due to prior failures"],
  "frontierShift": "How the frontier has moved since last epoch (null for epoch 1)"
}
```
