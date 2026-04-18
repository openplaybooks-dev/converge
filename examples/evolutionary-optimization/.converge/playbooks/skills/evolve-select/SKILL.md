---
id: evolve-select
title: Select Top-K Training Configurations
---

# Select Top-K Training Configurations

Rank evaluated LLM training configurations and select the top-K as parents for the next generation.

## Process

1. Read the consolidated scores for the current generation
2. Rank configurations by overall fitness (descending)
3. Select the top-K configurations as parents
4. Compare this generation's best to the all-time best
5. Update `best-candidate.json` if a new best is found
6. Advance the generation counter in `evolution-state.json`
7. Write selection results for the crossover phase

## Outputs

- `selection.json`:
  ```json
  {
    "generation": 0,
    "parents": [
      {
        "candidateId": "candidate-003",
        "fitness": 0.85,
        "specification": {
          "architecture": { "attentionType": "GQA", "layers": 32, "..." : "..." },
          "hyperparameters": { "learningRate": 2e-4, "..." : "..." },
          "dataStrategy": { "mix": { "code": 0.3, "..." : "..." }, "..." : "..." }
        }
      }
    ],
    "populationStats": { "mean": 0.7, "max": 0.85, "min": 0.55 }
  }
  ```
- `best-candidate.json`:
  ```json
  {
    "candidateId": "candidate-003",
    "generation": 0,
    "fitness": 0.85,
    "approach": "GQA architecture with code-heavy curriculum",
    "specification": { "architecture": {...}, "hyperparameters": {...}, "dataStrategy": {...} }
  }
  ```
- `evolution-state.json` — generation counter incremented, status updated

## Quality Criteria

- Selection is strictly by fitness ranking
- Best configuration is tracked across all generations (not just current)
- Generation counter is advanced exactly by 1
- Parent specifications are preserved in full (needed by crossover)
