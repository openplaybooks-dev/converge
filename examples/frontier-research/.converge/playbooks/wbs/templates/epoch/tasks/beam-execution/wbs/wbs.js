/**
 * WBS: Beam Execution — Per-Beam Exploration Spawner
 *
 * Reads beams.json and spawns one exploration task per beam,
 * plus a consolidation task that merges all results.
 *
 *   001-explore-B1 → 002-explore-B2 → ... → 999-consolidate
 */

import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export async function run(ctx) {
  const artifactsDir = ctx.vars.artifactsDir;
  const beamsPath = join(artifactsDir, 'beams.json');
  const raw = readFileSync(beamsPath, 'utf-8');
  const { beams } = JSON.parse(raw);

  const explorationsDir = join(artifactsDir, 'explorations');
  if (!existsSync(explorationsDir)) mkdirSync(explorationsDir, { recursive: true });

  const taskIds = [];

  for (let i = 0; i < beams.length; i++) {
    const b = beams[i];
    const num = String(i + 1).padStart(3, '0');
    const taskId = `${num}-explore-${b.id}`;

    await ctx.spawn(
      { _type: 'raw-markdown', content: `---
id: "${taskId}"
title: "Explore beam ${b.id}"
skill: frontier-explore-beam
checks:
  - id: exploration-${b.id}-exists
    cmd: "test -f ${artifactsDir}/explorations/beam-${b.id}.json"
    description: "Exploration result for ${b.id} exists"
  - id: exploration-${b.id}-valid
    cmd: "node -e \\"const r=JSON.parse(require('fs').readFileSync('${artifactsDir}/explorations/beam-${b.id}.json','utf-8')); if(!r.insights||!Array.isArray(r.insights))throw new Error('missing insights'); if(!r.status)throw new Error('missing status')\\""
    description: "Exploration for ${b.id} has insights and status"
---

# Explore Beam ${b.id}

**Direction**: ${b.direction}
**Approach**: ${b.approach}
**Hypothesis**: ${b.hypothesis}
**Exploration Strategy**: ${b.explorationStrategy}

## Research Question Context

${ctx.vars.question || ''}

## Process

Follow the beam's exploration strategy. There is no fixed methodology — use whatever approach the beam definition specifies. The goal is to discover insights, connections, and evidence related to the beam's direction.

1. Execute the exploration strategy defined above
2. Gather evidence, identify connections, test the hypothesis
3. Record insights — both expected and unexpected
4. Note any dead ends encountered
5. Identify connections to other potential research directions

## Output

Write \`${artifactsDir}/explorations/beam-${b.id}.json\`:
\`\`\`json
{
  "beamId": "${b.id}",
  "direction": "${b.direction}",
  "status": "productive|dead-end|inconclusive",
  "hypothesis": "${b.hypothesis}",
  "hypothesisOutcome": "supported|refuted|modified|inconclusive",
  "insights": [
    {
      "id": "I1",
      "claim": "A specific insight discovered",
      "evidence": "What supports this insight",
      "confidence": 0.8,
      "novelty": 0.7,
      "connections": ["Related insights or directions"]
    }
  ],
  "deadEnds": ["Approaches that failed and why"],
  "unexpectedFindings": ["Surprises encountered during exploration"],
  "suggestedFollowups": ["Directions worth pursuing based on findings"]
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
title: "Consolidate explorations"
checks:
  - id: exploration-summary-exists
    cmd: "test -f ${artifactsDir}/explorations/summary.json"
    description: "Exploration summary exists"
---

# Consolidate Beam Explorations

Merge all per-beam exploration results into a single summary.

## Process

1. Read all \`${artifactsDir}/explorations/beam-*.json\` files
2. Compile a summary of all beam outcomes
3. Count productive vs dead-end vs inconclusive beams
4. Collect all unique insights across beams

## Output

Write \`${artifactsDir}/explorations/summary.json\`:
\`\`\`json
{
  "epoch": ${ctx.vars.epoch},
  "totalBeams": ${beams.length},
  "productive": 0,
  "deadEnds": 0,
  "inconclusive": 0,
  "allInsights": [
    { "beamId": "B1", "insightId": "I1", "claim": "...", "confidence": 0.8, "novelty": 0.7 }
  ],
  "allDeadEnds": ["..."],
  "crossBeamConnections": ["Insights that appeared in multiple beams"]
}
\`\`\`` },
    { id: '999-consolidate', dependencies: taskIds },
  );
}
