/**
 * Seed: LLM Training Configuration Evolution Engine
 *
 * Reads evolution-state.json to determine current generation:
 *   Gen 0:  001-seed → 002-evaluate → 003-select
 *   Gen N:  001-crossover → 002-evaluate → 003-select
 *   Converged: 001-report
 */

import { readFileSync, existsSync } from 'node:fs';

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
  const best = readJSON('best-candidate.json');

  const generation = state?.generation ?? 0;
  const fitnessThreshold = parseFloat(ctx.inputs?.fitnessThreshold ?? '0.9');
  const converged = best && best.fitness >= fitnessThreshold;

  // If converged, only produce the final training recipe
  if (converged) {
    await ctx.spawn({
      id: '001-report',
      title: 'Training Recipe Report',
      skill: 'evolve-report',
      outputs: ['optimization-report.md'],
      checks: [
        {
          id: 'report-exists',
          cmd: 'test -f optimization-report.md',
          description: 'Training recipe report exists',
        },
      ],
      body: `Generate the final LLM training recipe report.

**Inputs**: \`evolution-state.json\`, \`best-candidate.json\`, \`scored/\` directory

**Process**:
1. Read the best training configuration and its fitness history
2. Summarize the evolutionary trajectory (generations, fitness curve)
3. Detail the winning architecture, hyperparameters, and data strategy
4. Note trade-offs vs runner-up configurations
5. Produce an actionable training recipe

**Output**: \`optimization-report.md\` — comprehensive training recipe with:
- Full model architecture specification
- Hyperparameter settings with rationale
- Data mix and curriculum strategy
- Expected benchmark performance
- Fitness progression across generations
- Key trade-offs and alternative configurations`,
    });
    return;
  }

  // Gen 0: seed new configurations; Gen N: crossover from parents
  if (generation === 0 && !state) {
    await ctx.spawn({
      id: '001-seed',
      title: 'Seed Initial Training Configurations',
      skill: 'evolve-seed',
      outputs: ['candidates/gen-0/', 'evolution-state.json'],
      checks: [
        {
          id: 'candidates-dir-exists',
          cmd: 'test -d candidates/gen-0',
          description: 'Generation 0 candidates directory exists',
        },
        {
          id: 'state-initialized',
          cmd: `node -e "const s=JSON.parse(require('fs').readFileSync('evolution-state.json','utf-8')); if(s.generation!==0)throw new Error('generation not 0')"`,
          description: 'evolution-state.json initialized with generation 0',
        },
      ],
      body: `Generate ${ctx.inputs?.populationSize ?? 5} diverse LLM training configurations.

**Inputs**: Training goal and model scale from playbook inputs.
**Training goal**: Use the trainingGoal from playbook inputs.
**Model scale**: ${ctx.inputs?.modelScale ?? '7B'}
**Population size**: ${ctx.inputs?.populationSize ?? 5}

**Process**:
1. Analyze the training goal and target model scale
2. Generate ${ctx.inputs?.populationSize ?? 5} diverse training configurations
3. Each configuration should explore a distinctly different strategy axis:
   - Vary architecture: attention type (MHA/GQA/MQA), depth vs width, FFN ratio, positional encoding (RoPE/ALiBi/learned)
   - Vary hyperparameters: learning rate, batch size, warmup schedule, optimizer (AdamW/Lion/Sophia), weight decay
   - Vary data strategy: pretraining mix ratios (code/text/math), curriculum ordering, data filtering, deduplication approach
4. Write each configuration as a separate JSON file

**Outputs**:
- \`candidates/gen-0/candidate-001.json\` through \`candidate-${String(ctx.inputs?.populationSize ?? 5).padStart(3, '0')}.json\`
- \`evolution-state.json\`:
  \`\`\`json
  { "generation": 0, "status": "seeded" }
  \`\`\`

**Candidate JSON format**:
\`\`\`json
{
  "id": "candidate-001",
  "generation": 0,
  "approach": "High-level description of this training strategy",
  "specification": {
    "architecture": {
      "params": "7B",
      "layers": 32,
      "hiddenDim": 4096,
      "heads": 32,
      "kvHeads": 8,
      "attentionType": "GQA",
      "ffnMultiplier": 2.67,
      "ffnType": "SwiGLU",
      "positionEncoding": "RoPE",
      "contextLength": 4096,
      "vocabSize": 32000
    },
    "hyperparameters": {
      "optimizer": "AdamW",
      "learningRate": 3e-4,
      "minLearningRate": 3e-5,
      "warmupSteps": 2000,
      "totalSteps": 100000,
      "batchSize": 4000000,
      "weightDecay": 0.1,
      "gradientClipping": 1.0,
      "lrSchedule": "cosine"
    },
    "dataStrategy": {
      "totalTokens": "1T",
      "mix": { "webText": 0.5, "code": 0.2, "books": 0.1, "math": 0.1, "science": 0.1 },
      "deduplication": "MinHash",
      "filtering": "perplexity-based",
      "curriculum": "none"
    }
  },
  "parents": [],
  "crossoverStrategy": "novel",
  "mutations": ["initial seed"]
}
\`\`\``,
    });
  } else {
    await ctx.spawn({
      id: '001-crossover',
      title: `Crossover — Generation ${generation}`,
      skill: 'evolve-crossover',
      outputs: [`candidates/gen-${generation}/`],
      checks: [
        {
          id: `gen-${generation}-candidates-exist`,
          cmd: `test -d candidates/gen-${generation}`,
          description: `Generation ${generation} candidates directory exists`,
        },
      ],
      body: `Produce generation ${generation} training configurations via crossover.

**Inputs**: \`selection.json\`, \`best-candidate.json\`
**Population size**: ${ctx.inputs?.populationSize ?? 5}
**Top-K parents**: ${ctx.inputs?.topK ?? 2}

**Process**:
1. Read \`selection.json\` to get the top-K parent configurations
2. Produce new configurations by combining parent strategies:
   - **Uniform crossover**: take architecture from parent A, hyperparameters from parent B
   - **Interpolation**: blend numerical parameters (e.g. average learning rates, mix ratios)
   - **Novel injection**: 1-2 entirely new configurations to avoid local optima (different architecture family, unconventional data strategy, etc.)
3. Apply mutations: perturb learning rate ±30%, adjust layer count ±2, shift data mix ratios
4. Write ${ctx.inputs?.populationSize ?? 5} new configurations

**Outputs**: \`candidates/gen-${generation}/candidate-001.json\` through \`candidate-${String(ctx.inputs?.populationSize ?? 5).padStart(3, '0')}.json\`

**Candidate JSON format**: Same schema as gen-0, but with \`parents\` and \`mutations\` populated.
\`\`\`json
{
  "id": "candidate-001",
  "generation": ${generation},
  "approach": "Description of this training strategy",
  "specification": {
    "architecture": { "..." : "..." },
    "hyperparameters": { "..." : "..." },
    "dataStrategy": { "..." : "..." }
  },
  "parents": ["parent-candidate-001", "parent-candidate-003"],
  "crossoverStrategy": "uniform|interpolation|novel",
  "mutations": ["took GQA attention from parent-001", "blended learning rate between parents"]
}
\`\`\``,
    });
  }

  // Phase 2: Evaluate all configurations (Seed parent — spawns per-candidate tasks)
  await ctx.spawn({
    id: '002-evaluate',
    title: `Evaluate Generation ${generation}`,
    dependencies: [generation === 0 && !state ? '001-seed' : '001-crossover'],
    outputs: [`scored/gen-${generation}.json`],
    seed: {
      type: 'nodejs',
      path: './evaluate-seed.js',
    },
    body: `Score each training configuration in generation ${generation}.

This task dynamically spawns one evaluation task per candidate file
in \`candidates/gen-${generation}/\`, plus a consolidation task that
merges all scores into \`scored/gen-${generation}.json\`.

Each configuration is evaluated on: benchmark performance prediction,
training efficiency, scaling properties, and robustness.`,
  });

  // Phase 3: Select top configurations
  await ctx.spawn({
    id: '003-select',
    title: `Select Top-K — Generation ${generation}`,
    skill: 'evolve-select',
    dependencies: ['002-evaluate'],
    outputs: ['selection.json', 'best-candidate.json', 'evolution-state.json'],
    checks: [
      {
        id: 'selection-exists',
        cmd: 'test -f selection.json',
        description: 'Selection results exist',
      },
      {
        id: 'best-candidate-exists',
        cmd: 'test -f best-candidate.json',
        description: 'Best configuration tracked',
      },
      {
        id: 'state-advanced',
        cmd: `node -e "const s=JSON.parse(require('fs').readFileSync('evolution-state.json','utf-8')); if(s.generation<=${generation})throw new Error('generation not advanced')"`,
        description: 'Generation counter advanced',
      },
    ],
    body: `Rank training configurations from generation ${generation} and select the top-K.

**Inputs**: \`scored/gen-${generation}.json\`, \`best-candidate.json\` (if exists)
**Top-K**: ${ctx.inputs?.topK ?? 2}

**Process**:
1. Read \`scored/gen-${generation}.json\` with all configuration scores
2. Rank by overall fitness (descending)
3. Select top-${ctx.inputs?.topK ?? 2} as parents for next generation
4. Compare best of this generation to all-time best
5. Update \`best-candidate.json\` if new best found
6. Advance generation counter in \`evolution-state.json\`

**Outputs**:
- \`selection.json\`:
  \`\`\`json
  {
    "generation": ${generation},
    "parents": [{ "candidateId": "...", "fitness": 0.85, "specification": {...} }],
    "populationStats": { "mean": 0.7, "max": 0.85, "min": 0.55 }
  }
  \`\`\`
- \`best-candidate.json\`:
  \`\`\`json
  {
    "candidateId": "...",
    "generation": ${generation},
    "fitness": 0.85,
    "approach": "...",
    "specification": {...}
  }
  \`\`\`
- \`evolution-state.json\`:
  \`\`\`json
  { "generation": ${generation + 1}, "status": "selected", "bestFitness": 0.85 }
  \`\`\``,
  });
}
