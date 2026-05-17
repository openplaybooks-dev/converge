---
id: "{{taskId}}"
title: "Crossover — Generation {{wave}}"
skill: evolve-crossover
vars:
  wave:
  trainingGoal:
  modelScale: "7B"
  populationSize: "5"
  topK: "2"
  fitnessThreshold: "0.9"
outputs:
  - candidates/gen-{{wave}}/
checks:
  - id: gen-candidates-exist
    cmd: test -d candidates/gen-{{wave}}
    description: Generation {{wave}} candidates directory exists
---

# Crossover — Generation {{wave}}

Produce generation `{{wave}}` training configurations via crossover of the
top-K parents selected in the previous generation.

**Inputs**: `selection.json` (top-K parents from generation {{wave}}-1),
`best-candidate.json` (all-time best so far).
**Population size**: `{{populationSize}}`
**Top-K parents**: `{{topK}}`
**Training goal**: {{trainingGoal}}

## Process

1. Read `selection.json` to get the top-`{{topK}}` parent configurations.
2. Produce new configurations by combining parent strategies:
   - **Uniform crossover**: take architecture from parent A, hyperparameters
     from parent B.
   - **Interpolation**: blend numerical parameters (e.g. average learning
     rates, mix ratios).
   - **Novel injection**: 1–2 entirely new configurations to avoid local
     optima (different architecture family, unconventional data strategy).
3. Apply mutations: perturb learning rate ±30%, adjust layer count ±2,
   shift data mix ratios.
4. Write `{{populationSize}}` new configurations to `candidates/gen-{{wave}}/`.

## Outputs

`candidates/gen-{{wave}}/candidate-001.json` through `candidate-NNN.json`
(one per configuration, zero-padded to 3 digits).

## Candidate JSON format

Same schema as the gen-0 seed output, but with `parents` and `mutations`
populated:

```json
{
  "id": "candidate-001",
  "generation": {{wave}},
  "approach": "Description of this training strategy",
  "specification": {
    "architecture": { "...": "..." },
    "hyperparameters": { "...": "..." },
    "dataStrategy": { "...": "..." }
  },
  "parents": ["parent-candidate-001", "parent-candidate-003"],
  "crossoverStrategy": "uniform|interpolation|novel",
  "mutations": [
    "took GQA attention from parent-001",
    "blended learning rate between parents"
  ]
}
```
