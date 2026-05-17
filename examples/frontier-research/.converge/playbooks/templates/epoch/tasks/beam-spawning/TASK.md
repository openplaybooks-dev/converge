---
id: "{{taskId}}"
title: "Beam spawning — epoch {{epoch}}"
skill: frontier-spawn-beams
depends_on:
  - 001-frontier-analysis
checks:
  - id: beams-written
    cmd: "test -f {{artifactsDir}}/beams.json"
    description: "beams.json exists"
  - id: beams-valid
    cmd: "node -e \"const b=JSON.parse(require('fs').readFileSync('{{artifactsDir}}/beams.json','utf-8')); if(!b.beams||!Array.isArray(b.beams)||b.beams.length===0)throw new Error('no beams'); b.beams.forEach((x,i)=>{if(!x.id||!x.direction||!x.approach||!x.hypothesis)throw new Error('beam '+(i+1)+' missing fields')})\""
    description: "beams.json has valid beam definitions"
---

# Beam Spawning — Epoch {{epoch}}

Define {{beamWidth}} parallel research beams targeting the most promising frontier edges.

**Research question**: {{question}}
**Beam width**: {{beamWidth}}

## Inputs

- `{{artifactsDir}}/frontier-analysis.json` — ranked frontier edges
- `{{projectDir}}/.converge/artifacts/frontier-research/research-state.json` — accumulated knowledge (if exists)

## Process

1. Read the frontier analysis to identify top-ranked edges
2. Design {{beamWidth}} beams, each with:
   - A specific **direction** (which frontier edge to explore)
   - A unique **approach** (each beam defines its own methodology — no fixed template)
   - A testable **hypothesis** about what the exploration might reveal
   - An **exploration strategy** (how to gather evidence, what to look for)
3. Ensure diversity: beams should vary in both direction AND methodology
4. Balance exploitation (deep-dive into promising edges) with exploration (novel angles)

## Output

Write `{{artifactsDir}}/beams.json`:
```json
{
  "epoch": {{epoch}},
  "beamWidth": {{beamWidth}},
  "beams": [
    {
      "id": "B1",
      "frontierEdge": "E1",
      "direction": "What this beam explores",
      "approach": "How this beam will explore (unique methodology)",
      "hypothesis": "What we expect to find",
      "explorationStrategy": "Step-by-step approach to gathering evidence",
      "expectedInsights": ["What insights might emerge"],
      "riskOfDeadEnd": 0.3,
      "noveltyJustification": "Why this approach hasn't been tried"
    }
  ]
}
```
