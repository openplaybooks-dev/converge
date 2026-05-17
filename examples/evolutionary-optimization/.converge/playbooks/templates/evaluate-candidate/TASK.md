---
id: "{{taskId}}"
title: "Evaluate {{candidateId}} (gen {{wave}})"
skill: evolve-evaluate
vars:
  wave:
  candidateId:
  candidateFile:
  trainingGoal:
  modelScale: "7B"
outputs:
  - scored/gen-{{wave}}-{{candidateId}}.json
checks:
  - id: score-file-exists
    cmd: test -f scored/gen-{{wave}}-{{candidateId}}.json
    description: "Score file for {{candidateId}} exists"
  - id: score-fitness-valid
    cmd: "node -e \"const s=JSON.parse(require('fs').readFileSync('scored/gen-{{wave}}-{{candidateId}}.json','utf-8')); if(typeof s.fitness!=='number'||s.fitness<0||s.fitness>1)throw new Error('invalid fitness')\""
    description: "Score for {{candidateId}} has valid fitness 0-1"
---

# Evaluate {{candidateId}} (generation {{wave}})

Evaluate a single LLM training configuration.

**Candidate file**: `{{candidateFile}}`
**Training goal**: {{trainingGoal}}
**Model scale**: {{modelScale}}

## Process

1. Read the candidate configuration from `{{candidateFile}}`.
2. Analyze the architecture choices against the training goal and model scale.
3. Evaluate hyperparameter settings using known scaling laws and training-
   stability heuristics.
4. Assess data strategy quality (mix diversity, filtering rigor, token-budget
   adequacy).
5. Score on four criteria, each 0–1:
   - **benchmarkPotential** — predicted performance on target benchmarks
     (MMLU, HumanEval, GSM8K, etc.)
   - **trainingEfficiency** — FLOPs efficiency, tokens-per-parameter ratio,
     convergence speed
   - **scalingProperties** — adherence to Chinchilla / compute-optimal
     scaling laws
   - **robustness** — training stability, risk of divergence, sensitivity
     to hyperparameter perturbation
6. Compute overall fitness as a weighted average (0–1 scale).
7. Identify specific strengths and weaknesses with technical rationale.

## Output

Write `scored/gen-{{wave}}-{{candidateId}}.json`:

```json
{
  "candidateId": "{{candidateId}}",
  "generation": {{wave}},
  "fitness": 0.75,
  "scores": {
    "benchmarkPotential": 0.8,
    "trainingEfficiency": 0.7,
    "scalingProperties": 0.6,
    "robustness": 0.9
  },
  "strengths": [
    "GQA attention reduces KV cache memory by 4x",
    "cosine schedule well-tuned for 1T tokens"
  ],
  "weaknesses": [
    "learning rate too high for this batch size",
    "no code-focused curriculum despite code generation goal"
  ]
}
```
