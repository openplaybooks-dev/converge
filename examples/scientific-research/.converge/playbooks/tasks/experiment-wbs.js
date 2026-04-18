/**
 * WBS: Experiment — Per-Hypothesis Test Spawner
 *
 * Reads hypotheses.json and spawns one test task per hypothesis.
 * Simple hypotheses get a direct experiment task.
 * Complex hypotheses get a nested scientific method pipeline (recursive).
 *
 *   001-test-H1 → 002-test-H2 → ... → 999-consolidate
 */

import { readFileSync } from 'node:fs';

export async function run(ctx) {
  const raw = readFileSync('hypotheses.json', 'utf-8');
  const { hypotheses } = JSON.parse(raw);

  const taskIds = [];

  for (let i = 0; i < hypotheses.length; i++) {
    const h = hypotheses[i];
    const num = String(i + 1).padStart(3, '0');
    const taskId = `${num}-test-${h.id}`;

    if (h.complexity === 'complex') {
      // Complex hypothesis: nested research pipeline (recursive decomposition)
      await ctx.spawn({
        id: taskId,
        title: `Test hypothesis ${h.id} (complex — nested research)`,
        outputs: [`experiment-results/${h.id}.json`],
        wbs: {
          type: 'nodejs',
          path: '../wbs.js', // Re-use the scientific method pipeline recursively
        },
        body: `This hypothesis is too complex for direct testing and requires
its own research sub-pipeline.

**Hypothesis ${h.id}**: ${h.statement}

**Test Plan**: ${h.testPlan}

Run a nested scientific method pipeline:
1. Literature review scoped to this specific hypothesis
2. Formulate sub-hypotheses
3. Test each sub-hypothesis
4. Analyze results
5. Synthesize findings back into \`experiment-results/${h.id}.json\`

Write the final result to \`experiment-results/${h.id}.json\`:
\`\`\`json
{
  "hypothesisId": "${h.id}",
  "statement": "${h.statement}",
  "status": "supported|refuted|inconclusive",
  "evidence": [...],
  "methodology": "nested-research-pipeline",
  "limitations": [...]
}
\`\`\``,
      });
    } else {
      // Simple hypothesis: direct experiment
      await ctx.spawn({
        id: taskId,
        title: `Test hypothesis ${h.id}`,
        skill: 'research-experiment',
        outputs: [`experiment-results/${h.id}.json`],
        checks: [
          {
            id: `result-${h.id}-exists`,
            cmd: `test -f experiment-results/${h.id}.json`,
            description: `Experiment result for ${h.id} exists`,
          },
          {
            id: `result-${h.id}-valid`,
            cmd: `node -e "const r=JSON.parse(require('fs').readFileSync('experiment-results/${h.id}.json','utf-8')); if(!r.status)throw new Error('missing status'); if(!r.evidence||!Array.isArray(r.evidence))throw new Error('missing evidence')"`,
            description: `Result for ${h.id} has status and evidence`,
          },
        ],
        body: `Test hypothesis ${h.id}: ${h.statement}

**Test Plan**: ${h.testPlan}

**Process**:
1. Design experiment based on the test plan
2. Execute the experiment — gather evidence
3. Record results with supporting data
4. Determine outcome: supported, refuted, or inconclusive

**Output**: \`experiment-results/${h.id}.json\`:
\`\`\`json
{
  "hypothesisId": "${h.id}",
  "statement": "${h.statement}",
  "status": "supported|refuted|inconclusive",
  "evidence": [
    { "observation": "...", "source": "...", "supports": true }
  ],
  "methodology": "...",
  "limitations": ["..."],
  "confidence": "high|medium|low"
}
\`\`\``,
      });
    }

    taskIds.push(taskId);
  }

  // Consolidation task — merges all test results
  await ctx.spawn({
    id: '999-consolidate',
    title: 'Consolidate experiment results',
    dependencies: taskIds,
    outputs: ['experiment-results/summary.json'],
    checks: [
      {
        id: 'summary-exists',
        cmd: 'test -f experiment-results/summary.json',
        description: 'Experiment summary exists',
      },
    ],
    body: `Merge all hypothesis test results into a single summary.

**Process**:
1. Read all \`experiment-results/*.json\` files (excluding summary.json)
2. Compile a summary of all hypothesis outcomes
3. Flag any inconclusive results or failed experiments

**Output**: \`experiment-results/summary.json\`:
\`\`\`json
{
  "total": 3,
  "supported": 1,
  "refuted": 1,
  "inconclusive": 1,
  "results": [
    { "id": "H1", "status": "supported" },
    { "id": "H2", "status": "refuted" },
    { "id": "H3", "status": "inconclusive" }
  ]
}
\`\`\``,
  });
}
