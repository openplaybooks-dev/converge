---
id: "{{taskId}}"
title: Seed Initial Training Configurations
skill: evolve-seed
vars:
  trainingGoal:
  modelScale: "7B"
  populationSize: "5"
  topK: "2"
  fitnessThreshold: "0.9"
outputs:
  - candidates/gen-0/
  - evolution-state.json
checks:
  - id: candidates-dir-exists
    cmd: test -d candidates/gen-0
    description: Generation 0 candidates directory exists
  - id: state-initialized
    cmd: "node -e \"const s=JSON.parse(require('fs').readFileSync('evolution-state.json','utf-8')); if(s.generation!==0)throw new Error('generation not 0')\""
    description: evolution-state.json initialized with generation 0
---

# Seed Initial Training Configurations

Generate `{{populationSize}}` diverse LLM training configurations for the
initial generation.

**Training goal**: {{trainingGoal}}
**Model scale**: {{modelScale}}
**Population size**: {{populationSize}}

## Process

1. Analyze the training goal and target model scale.
2. Generate `{{populationSize}}` diverse training configurations.
3. Each configuration must explore a distinctly different strategy axis:
   - **Architecture**: attention type (MHA/GQA/MQA), depth vs width,
     FFN ratio, positional encoding (RoPE/ALiBi/learned).
   - **Hyperparameters**: learning rate, batch size, warmup schedule,
     optimizer (AdamW/Lion/Sophia), weight decay.
   - **Data strategy**: pretraining mix ratios (code/text/math),
     curriculum ordering, data filtering, deduplication approach.
4. Write each configuration as a separate JSON file under `candidates/gen-0/`.
5. Initialize `evolution-state.json` with `{ "generation": 0, "status": "seeded" }`.

## Outputs

- `candidates/gen-0/candidate-001.json` through `candidate-NNN.json` (one per
  configuration, zero-padded to 3 digits).
- `evolution-state.json`:
  ```json
  { "generation": 0, "status": "seeded" }
  ```

## Candidate JSON format

```json
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
```
