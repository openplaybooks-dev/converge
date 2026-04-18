/**
 * WBS: Per-Configuration Evaluation Spawner
 *
 * Reads candidates/gen-N/ directory, spawns one eval task per training
 * configuration, then a consolidation task that merges scores into
 * scored/gen-N.json.
 *
 *   001-eval-candidate-001 → 002-eval-candidate-002 → ... → 999-consolidate
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';

function readJSON(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
}

export async function run(ctx) {
  const state = readJSON('evolution-state.json');
  const generation = state?.generation ?? 0;
  const candidateDir = `candidates/gen-${generation}`;

  const files = readdirSync(candidateDir).filter((f) => f.endsWith('.json')).sort();
  const taskIds = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const candidate = readJSON(`${candidateDir}/${file}`);
    const candidateId = candidate?.id ?? file.replace('.json', '');
    const num = String(i + 1).padStart(3, '0');
    const taskId = `${num}-eval-${candidateId}`;

    await ctx.spawn({
      id: taskId,
      title: `Evaluate ${candidateId}`,
      skill: 'evolve-evaluate',
      outputs: [`scored/gen-${generation}-${candidateId}.json`],
      checks: [
        {
          id: `score-${candidateId}-exists`,
          cmd: `test -f scored/gen-${generation}-${candidateId}.json`,
          description: `Score file for ${candidateId} exists`,
        },
        {
          id: `score-${candidateId}-valid`,
          cmd: `node -e "const s=JSON.parse(require('fs').readFileSync('scored/gen-${generation}-${candidateId}.json','utf-8')); if(typeof s.fitness!=='number'||s.fitness<0||s.fitness>1)throw new Error('invalid fitness')"`,
          description: `Score for ${candidateId} has valid fitness 0-1`,
        },
      ],
      body: `Evaluate LLM training configuration ${candidateId} from generation ${generation}.

**Input**: \`${candidateDir}/${file}\`
\`\`\`json
${JSON.stringify(candidate, null, 2)}
\`\`\`

**Process**:
1. Analyze the architecture choices against the training goal and model scale
2. Evaluate hyperparameter settings using known scaling laws and training stability heuristics
3. Assess data strategy quality (mix diversity, filtering rigor, token budget adequacy)
4. Score on four criteria:
   - **benchmarkPotential**: Predicted performance on target benchmarks (MMLU, HumanEval, GSM8K, etc.)
   - **trainingEfficiency**: FLOPs efficiency, tokens-per-parameter ratio, convergence speed
   - **scalingProperties**: How well the configuration follows Chinchilla/compute-optimal scaling
   - **robustness**: Training stability, risk of divergence, sensitivity to hyperparameter perturbation
5. Compute overall fitness as weighted average (0-1 scale)
6. Identify specific strengths and weaknesses

**Output**: \`scored/gen-${generation}-${candidateId}.json\`:
\`\`\`json
{
  "candidateId": "${candidateId}",
  "generation": ${generation},
  "fitness": 0.75,
  "scores": {
    "benchmarkPotential": 0.8,
    "trainingEfficiency": 0.7,
    "scalingProperties": 0.6,
    "robustness": 0.9
  },
  "strengths": ["GQA attention reduces KV cache memory by 4x", "cosine schedule well-tuned for 1T tokens"],
  "weaknesses": ["learning rate too high for this batch size", "no code-focused curriculum despite code generation goal"]
}
\`\`\``,
    });

    taskIds.push(taskId);
  }

  // Consolidation task — merge all per-configuration scores
  await ctx.spawn({
    id: '999-consolidate',
    title: `Consolidate Generation ${generation} Scores`,
    dependencies: taskIds,
    outputs: [`scored/gen-${generation}.json`],
    checks: [
      {
        id: `gen-${generation}-scores-exist`,
        cmd: `test -f scored/gen-${generation}.json`,
        description: `Consolidated scores for generation ${generation} exist`,
      },
    ],
    body: `Merge all per-configuration score files into a single generation summary.

**Process**:
1. Read all \`scored/gen-${generation}-*.json\` files
2. Compile into a single array sorted by fitness (descending)
3. Compute population statistics (mean, max, min fitness)

**Output**: \`scored/gen-${generation}.json\`:
\`\`\`json
{
  "generation": ${generation},
  "candidates": [
    { "candidateId": "...", "fitness": 0.85, "scores": {...}, "strengths": [...], "weaknesses": [...] }
  ],
  "stats": { "mean": 0.7, "max": 0.85, "min": 0.55, "count": ${files.length} }
}
\`\`\``,
  });
}
