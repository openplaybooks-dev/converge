---
id: evolve-seed
title: Seed Initial Training Configurations
---

# Seed Initial Training Configurations

Generate the initial generation of diverse LLM training configurations.

## Process

1. Analyze the training goal and target model scale
2. Identify the configuration space dimensions:
   - **Architecture**: attention type (MHA/GQA/MQA), layer count, hidden dim, FFN type (SwiGLU/GeGLU/ReLU²), positional encoding (RoPE/ALiBi/learned), context length, vocab size
   - **Hyperparameters**: optimizer (AdamW/Lion/Sophia), learning rate, warmup schedule, batch size, weight decay, gradient clipping, LR schedule
   - **Data strategy**: pretraining corpus mix (web/code/books/math/science), total tokens, deduplication method, quality filtering, curriculum ordering
3. Generate N configurations, each exploring a distinctly different strategy
4. Write each configuration as a separate JSON file
5. Initialize `evolution-state.json`

## Outputs

- `candidates/gen-0/candidate-001.json` through `candidate-NNN.json`:
  ```json
  {
    "id": "candidate-001",
    "generation": 0,
    "approach": "Deep-narrow architecture with aggressive code curriculum",
    "specification": {
      "architecture": {
        "params": "7B",
        "layers": 40,
        "hiddenDim": 3584,
        "heads": 28,
        "kvHeads": 4,
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
        "mix": { "webText": 0.4, "code": 0.3, "books": 0.1, "math": 0.1, "science": 0.1 },
        "deduplication": "MinHash",
        "filtering": "perplexity-based",
        "curriculum": "code-heavy-early"
      }
    },
    "parents": [],
    "crossoverStrategy": "novel",
    "mutations": ["initial seed"]
  }
  ```
- `evolution-state.json`:
  ```json
  { "generation": 0, "status": "seeded" }
  ```

## Quality Criteria

- Each configuration explores a distinctly different axis (not minor LR tweaks)
- Architecture choices are internally consistent (param count matches layer/dim)
- Hyperparameters are in known-good ranges for the model scale
- Data mix ratios sum to 1.0
- Total token budget is reasonable for the param count (Chinchilla-aware)
