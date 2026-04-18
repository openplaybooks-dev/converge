---
id: evolve-crossover
title: Crossover Training Configurations
---

# Crossover Training Configurations

Produce a new generation of LLM training configurations by combining selected parents.

## Process

1. Read `selection.json` to get the top-K parent configurations
2. Generate new configurations using multiple strategies:
   - **Uniform crossover**: take architecture block from parent A, hyperparameters from parent B, data strategy from the higher-fitness parent
   - **Interpolation**: blend numerical parameters (average learning rates, interpolate mix ratios, split-the-difference on layer count)
   - **Novel injection**: 1-2 entirely new configurations exploring underrepresented regions (e.g. if all parents use GQA, try MHA; if all use cosine schedule, try WSD)
3. Apply mutations to crossover offspring:
   - Perturb learning rate ±30%
   - Adjust layer count ±2 (recompute hidden dim to maintain param budget)
   - Shift data mix ratios by ±0.05-0.1
   - Swap optimizer or schedule type occasionally
4. Record provenance: which parents, what crossover strategy, what mutations
5. Write each new configuration as a separate JSON file

## Outputs

- `candidates/gen-N/candidate-001.json` through `candidate-NNN.json`:
  ```json
  {
    "id": "candidate-001",
    "generation": 1,
    "approach": "GQA + code-heavy mix from parent-003, cosine schedule from parent-001",
    "specification": {
      "architecture": { "attentionType": "GQA", "layers": 34, "..." : "..." },
      "hyperparameters": { "learningRate": 2.5e-4, "optimizer": "AdamW", "..." : "..." },
      "dataStrategy": { "mix": { "code": 0.25, "webText": 0.45, "..." : "..." }, "..." : "..." }
    },
    "parents": ["candidate-003", "candidate-001"],
    "crossoverStrategy": "uniform",
    "mutations": ["took GQA from parent-003", "averaged learning rates", "added 2 layers"]
  }
  ```

## Quality Criteria

- At least 1-2 configurations use "novel" strategy (not derived from parents)
- Parent-derived configurations clearly trace to their parents
- Mutations are meaningful (not just noise — e.g. "perturbed LR from 3e-4 to 2.1e-4")
- Architecture choices remain internally consistent after crossover (param count, head divisibility)
- Data mix ratios still sum to 1.0
- Population size matches the configured populationSize
