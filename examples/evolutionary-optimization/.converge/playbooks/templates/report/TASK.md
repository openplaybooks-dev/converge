---
id: "{{taskId}}"
title: Training Recipe Report
skill: evolve-report
vars:
  trainingGoal:
  modelScale: "7B"
  populationSize: "5"
  topK: "2"
  fitnessThreshold: "0.9"
outputs:
  - optimization-report.md
checks:
  - id: report-exists
    cmd: test -f optimization-report.md
    description: Training recipe report exists
---

# Training Recipe Report

Generate the final LLM training recipe report. The evolution has converged
(the best configuration has reached `fitness >= {{fitnessThreshold}}`).

**Training goal**: {{trainingGoal}}

## Inputs

- `evolution-state.json` — current generation and best fitness
- `best-candidate.json` — winning configuration
- `selection.json` — runner-up configurations from the final generation
- `scored/gen-*.json` — full fitness history across generations

## Process

1. Read the best training configuration and its fitness history.
2. Summarize the evolutionary trajectory (generations, fitness curve).
3. Detail the winning architecture, hyperparameters, and data strategy.
4. Note trade-offs vs runner-up configurations.
5. Produce an actionable training recipe.

## Output

`optimization-report.md` — comprehensive training recipe with:

- Full model architecture specification
- Hyperparameter settings with rationale
- Data mix and curriculum strategy
- Expected benchmark performance
- Fitness progression across generations
- Key trade-offs and alternative configurations
