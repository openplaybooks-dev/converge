---
id: evolve-evaluate
title: Evaluate Training Configuration
checks:
  - id: score-format
    cmd: node ./check.js
    description: Scored output has valid fitness and scores
---

# Evaluate Training Configuration

Score a single LLM training configuration against the training goal.

## Process

1. Read the candidate training configuration from the task body
2. Evaluate architecture choices:
   - Does the attention type suit the model scale? (GQA/MQA preferred at 7B+)
   - Is depth/width ratio appropriate? (typical: 32-40 layers for 7B)
   - Is FFN expansion ratio efficient? (SwiGLU ~2.67x standard)
   - Does context length match training goal requirements?
3. Evaluate hyperparameters:
   - Learning rate vs batch size relationship (linear scaling rule)
   - Warmup proportion (typically 0.5-2% of total steps)
   - Weight decay magnitude (0.01-0.1 typical)
   - Optimizer suitability for the scale
4. Evaluate data strategy:
   - Token budget vs param count (Chinchilla: ~20 tokens/param)
   - Mix alignment with training goal (code model needs code-heavy mix)
   - Filtering and dedup quality
   - Curriculum design appropriateness
5. Score on four criteria (each 0-1):
   - **benchmarkPotential**: Expected performance on target benchmarks
   - **trainingEfficiency**: FLOPs per quality point, tokens-per-param ratio
   - **scalingProperties**: Adherence to known scaling laws
   - **robustness**: Training stability, divergence risk
6. Compute overall fitness as weighted average
7. Identify specific strengths and weaknesses with technical rationale

## Outputs

- Scored candidate JSON file:
  ```json
  {
    "candidateId": "candidate-001",
    "generation": 0,
    "fitness": 0.75,
    "scores": {
      "benchmarkPotential": 0.8,
      "trainingEfficiency": 0.7,
      "scalingProperties": 0.6,
      "robustness": 0.9
    },
    "strengths": ["GQA with 4 KV heads is memory-efficient for inference", "cosine schedule tuned for token budget"],
    "weaknesses": ["LR 3e-4 may be too high for 4M batch size", "no math curriculum despite math benchmark targets"]
  }
  ```

## Quality Criteria

- Fitness is a number between 0 and 1
- All four score dimensions present
- Strengths and weaknesses reference specific technical details (not generic)
- Scoring is grounded in known scaling laws and training best practices
