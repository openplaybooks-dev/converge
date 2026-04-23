/**
 * WBS: Beam Scoring — Per-Beam Score Spawner
 *
 * Reads beams.json and spawns one scoring task per beam,
 * plus a consolidation task that merges all scores.
 *
 *   001-score-B1 → 002-score-B2 → ... → 999-consolidate
 */

import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export async function run(ctx) {
  const artifactsDir = ctx.vars.artifactsDir;
  const beamsPath = join(artifactsDir, 'beams.json');
  const raw = readFileSync(beamsPath, 'utf-8');
  const { beams } = JSON.parse(raw);

  const scoresDir = join(artifactsDir, 'scores');
  if (!existsSync(scoresDir)) mkdirSync(scoresDir, { recursive: true });

  const taskIds = [];

  for (let i = 0; i < beams.length; i++) {
    const b = beams[i];
    const num = String(i + 1).padStart(3, '0');
    const taskId = `${num}-score-${b.id}`;

    await ctx.spawn(
      { _type: 'raw-markdown', content: `---
id: "${taskId}"
title: "Score beam ${b.id}"
skill: frontier-score-beam
checks:
  - id: score-${b.id}-exists
    cmd: "test -f ${artifactsDir}/scores/beam-${b.id}.json"
    description: "Score for ${b.id} exists"
  - id: score-${b.id}-valid
    cmd: "node -e \\"const s=JSON.parse(require('fs').readFileSync('${artifactsDir}/scores/beam-${b.id}.json','utf-8')); if(typeof s.composite!=='number')throw new Error('missing composite'); ['novelty','evidence','coherence','depth','generativity'].forEach(d=>{if(typeof s.dimensions[d]!=='number')throw new Error('missing '+d)})\\""
    description: "Score for ${b.id} has composite and all 5 dimensions"
---

# Score Beam ${b.id}

**Direction**: ${b.direction}
**Hypothesis**: ${b.hypothesis}

## Inputs

- \`${artifactsDir}/explorations/beam-${b.id}.json\` — exploration results
- \`${artifactsDir}/beams.json\` — original beam definition

## Scoring Dimensions (each 0-1)

| Dimension | Weight | What it measures |
|-----------|--------|-----------------|
| Novelty | 25% | Are the insights genuinely new? Not just restating known facts? |
| Evidence | 20% | How well-supported are the claims? Quality of reasoning? |
| Coherence | 20% | Do insights fit together? Internally consistent? |
| Depth | 20% | Surface-level observations vs deep structural understanding? |
| Generativity | 15% | Do findings open new research directions? Spawn follow-up questions? |

\`composite = 0.25*novelty + 0.20*evidence + 0.20*coherence + 0.20*depth + 0.15*generativity\`

## Output

Write \`${artifactsDir}/scores/beam-${b.id}.json\`:
\`\`\`json
{
  "beamId": "${b.id}",
  "direction": "${b.direction}",
  "dimensions": {
    "novelty": 0.0,
    "evidence": 0.0,
    "coherence": 0.0,
    "depth": 0.0,
    "generativity": 0.0
  },
  "composite": 0.0,
  "strengths": ["What this beam did well"],
  "weaknesses": ["Where this beam fell short"],
  "keyInsight": "The single most important finding from this beam"
}
\`\`\`` },
      { id: taskId },
    );

    taskIds.push(taskId);
  }

  // Consolidation task
  await ctx.spawn(
    { _type: 'raw-markdown', content: `---
id: "999-consolidate"
title: "Consolidate beam scores"
checks:
  - id: scores-summary-exists
    cmd: "test -f ${artifactsDir}/scores/summary.json"
    description: "Scores summary exists"
---

# Consolidate Beam Scores

Merge all per-beam scores into a single summary, ranked by composite score.

## Process

1. Read all \`${artifactsDir}/scores/beam-*.json\` files
2. Rank beams by composite score (descending)
3. Compute population statistics

## Output

Write \`${artifactsDir}/scores/summary.json\`:
\`\`\`json
{
  "epoch": ${ctx.vars.epoch},
  "beams": [
    { "beamId": "B1", "composite": 0.85, "dimensions": {...}, "keyInsight": "..." }
  ],
  "stats": { "mean": 0.7, "max": 0.85, "min": 0.55, "count": ${beams.length} }
}
\`\`\`` },
    { id: '999-consolidate', dependencies: taskIds },
  );
}
