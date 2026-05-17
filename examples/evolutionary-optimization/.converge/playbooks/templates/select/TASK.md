---
id: "{{taskId}}"
title: "Select Top-K — Generation {{wave}}"
skill: evolve-select
vars:
  wave:
  trainingGoal:
  modelScale: "7B"
  populationSize: "5"
  topK: "2"
  fitnessThreshold: "0.9"
outputs:
  - selection.json
  - best-candidate.json
  - evolution-state.json
checks:
  - id: selection-exists
    cmd: test -f selection.json
    description: Selection results exist
  - id: best-candidate-exists
    cmd: test -f best-candidate.json
    description: Best configuration tracked
  - id: state-advanced
    cmd: "node -e \"const s=JSON.parse(require('fs').readFileSync('evolution-state.json','utf-8')); if(s.generation<={{wave}})throw new Error('generation not advanced')\""
    description: Generation counter advanced
---

# Select Top-K — Generation {{wave}}

Rank training configurations from generation `{{wave}}` and select the top-`{{topK}}`
as parents for the next generation.

**Inputs**: `scored/gen-{{wave}}.json`, `best-candidate.json` (if exists).
**Top-K**: `{{topK}}`
**Fitness threshold**: `{{fitnessThreshold}}`

## Process

1. Read `scored/gen-{{wave}}.json` with all configuration scores.
2. Rank by overall `fitness` (descending).
3. Select the top-`{{topK}}` as parents for the next generation.
4. Compare the best of this generation to the all-time best.
5. Update `best-candidate.json` if a new best is found.
6. Advance the generation counter in `evolution-state.json`.

## Outputs

- `selection.json`:
  ```json
  {
    "generation": {{wave}},
    "parents": [
      { "candidateId": "...", "fitness": 0.85, "specification": { "...": "..." } }
    ],
    "populationStats": { "mean": 0.7, "max": 0.85, "min": 0.55 }
  }
  ```

- `best-candidate.json`:
  ```json
  {
    "candidateId": "...",
    "generation": {{wave}},
    "fitness": 0.85,
    "approach": "...",
    "specification": { "...": "..." }
  }
  ```

- `evolution-state.json` — set `generation` to `{{wave}} + 1` (so the
  next wave's crossover knows which generation it is producing):
  ```json
  { "generation": <wave+1>, "status": "selected", "bestFitness": 0.85 }
  ```
