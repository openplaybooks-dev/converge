/**
 * WBS: Experiment — Per-Hypothesis Test Spawner
 *
 * Reads hypotheses.json and spawns one experiment task per active hypothesis,
 * plus a consolidation task that merges all results.
 *
 *   001-test-H1 → 002-test-H2 → ... → 999-consolidate
 */

import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export async function run(ctx) {
  const artifactsDir = ctx.vars.artifactsDir;
  const hypothesesPath = join(artifactsDir, 'hypothesize', 'hypotheses.json');
  const raw = readFileSync(hypothesesPath, 'utf-8');
  const { hypotheses } = JSON.parse(raw);

  const active = hypotheses.filter(h => h.status !== 'retired' && h.status !== 'converged');
  const experimentDir = join(artifactsDir, 'experiment');
  if (!existsSync(experimentDir)) mkdirSync(experimentDir, { recursive: true });

  const taskIds = [];

  for (let i = 0; i < active.length; i++) {
    const h = active[i];
    const num = String(i + 1).padStart(3, '0');
    const taskId = `${num}-test-${h.id}`;

    await ctx.spawn(
      { _type: 'raw-markdown', content: `---
id: "${taskId}"
title: "Test hypothesis ${h.id}"
skill: research-experiment
checks:
  - id: result-${h.id}-exists
    cmd: "test -f ${artifactsDir}/experiment/${h.id}.json"
    description: "Experiment result for ${h.id} exists"
  - id: result-${h.id}-valid
    cmd: "node -e \\"const r=JSON.parse(require('fs').readFileSync('${artifactsDir}/experiment/${h.id}.json','utf-8')); if(!r.status)throw new Error('missing status'); if(!r.effectSize)throw new Error('missing effectSize')\\""
    description: "Result for ${h.id} has status and effectSize"
---

# Test Hypothesis ${h.id}

**Statement**: ${h.statement}
**Test Plan**: ${h.testPlan}
**Falsification Criteria**: ${h.falsificationCriteria || 'Not specified'}
**Prior Probability**: mean=${h.priorProbability?.mean ?? 'N/A'}, sd=${h.priorProbability?.sd ?? 'N/A'}

## Process

1. Design experiment based on the test plan
2. Execute the experiment — gather evidence from literature, reasoning, analysis
3. Compute effect size (Cohen's d or appropriate measure)
4. Record confidence interval for the effect
5. Document methodology and limitations
6. Determine outcome: supported, refuted, or inconclusive

## Output

Write \`${artifactsDir}/experiment/${h.id}.json\`:
\`\`\`json
{
  "hypothesisId": "${h.id}",
  "statement": "${h.statement}",
  "status": "supported|refuted|inconclusive",
  "effectSize": {
    "type": "cohens_d",
    "value": 0.0,
    "magnitude": "negligible|small|medium|large"
  },
  "confidenceInterval": {
    "lower": 0.0,
    "upper": 0.0,
    "level": 0.95
  },
  "evidence": [
    { "observation": "...", "source": "...", "supports": true, "weight": 0.8 }
  ],
  "methodology": "Description of experiment methodology",
  "limitations": ["..."],
  "sampleCharacteristics": "Description of data/evidence used"
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
title: "Consolidate experiment results"
checks:
  - id: summary-exists
    cmd: "test -f ${artifactsDir}/experiment/summary.json"
    description: "Experiment summary exists"
---

# Consolidate Experiment Results

Merge all hypothesis test results into a single summary.

## Process

1. Read all \`${artifactsDir}/experiment/H*.json\` files
2. Compile a summary of all hypothesis outcomes
3. Compute aggregate statistics

## Output

Write \`${artifactsDir}/experiment/summary.json\`:
\`\`\`json
{
  "epoch": ${ctx.vars.epoch},
  "total": ${active.length},
  "supported": 0,
  "refuted": 0,
  "inconclusive": 0,
  "results": [
    { "id": "H1", "status": "supported", "effectSize": 0.85 }
  ],
  "averageEffectSize": 0.0,
  "hypothesesWithLargeEffects": 0
}
\`\`\`` },
    { id: '999-consolidate', dependencies: taskIds },
  );
}
