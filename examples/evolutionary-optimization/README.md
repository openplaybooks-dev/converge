# Evolutionary Optimization — LLM Training

Evolve LLM training configurations through iterative generation, evaluation, selection, and crossover. Explores architectures, hyperparameters, and data strategies to find high-fitness training recipes.

## Usage

```bash
converge .converge/playbooks/llm-training-evolve/playbook.yml run --converge \
  --trainingGoal="Train a 7B parameter model for code generation with strong HumanEval performance" \
  --modelScale=7B
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `trainingGoal` | yes | — | The LLM training objective |
| `modelScale` | no | `7B` | Target model scale (1B, 7B, 13B, 70B) |
| `populationSize` | no | `5` | Candidates per generation |
| `topK` | no | `2` | Top configurations selected as parents |
| `fitnessThreshold` | no | `0.9` | Fitness score (0-1) required for convergence |

## How It Works

Each wave is one generation of the evolutionary loop:

```
Wave 1 (Gen 0 — seed):
  001-seed → 002-evaluate (per-candidate) → 003-select

Wave 2+ (Gen N — crossover):
  001-crossover → 002-evaluate (per-candidate) → 003-select

Final wave (converged):
  001-report
```

### Configuration Space

Candidates specify three blocks:

- **Architecture** — attention type (MHA/GQA/MQA), layers, hidden dim, FFN type (SwiGLU/GeGLU), positional encoding (RoPE/ALiBi), context length, vocab size
- **Hyperparameters** — optimizer (AdamW/Lion/Sophia), learning rate, warmup, batch size, weight decay, LR schedule
- **Data strategy** — corpus mix (web/code/books/math/science), total tokens, deduplication, filtering, curriculum

### Evaluation Criteria

Each configuration is scored on four dimensions (0-1):

| Criterion | What it measures |
|-----------|-----------------|
| `benchmarkPotential` | Expected performance on target benchmarks (MMLU, HumanEval, GSM8K) |
| `trainingEfficiency` | FLOPs efficiency, tokens-per-parameter ratio |
| `scalingProperties` | Adherence to Chinchilla/compute-optimal scaling laws |
| `robustness` | Training stability, divergence risk |

### Crossover Strategies

- **Uniform** — take architecture from parent A, hyperparameters from parent B
- **Interpolation** — blend numerical parameters (average LRs, interpolate mix ratios)
- **Novel injection** — 1-2 entirely new configurations to avoid local optima

### Convergence

The `dod.js` checks 4 criteria:
1. At least one generation evaluated
2. Best fitness meets threshold
3. Best configuration has complete spec (architecture + hyperparameters + data)
4. Training recipe report generated

## File Structure

```
.converge/playbooks/
├── playbook.yml
├── tasks/
│   └── TASK.md              # TASK bodies emit CLI spawn commands for
│                            # seed/crossover/evaluate/select and per-candidate evaluation
├── skills/
│   ├── evolve-seed/         # Generate diverse initial configurations
│   ├── evolve-evaluate/
│   │   ├── SKILL.md         # Score one configuration
���   │   └── check.js         # Validates score format
│   ├── evolve-select/       # Rank + pick top-K
│   ├── evolve-crossover/    # Merge parents → new configurations
│   └── evolve-report/       # Final training recipe
└── goals/
    └── 001-optimization-converged/
        ├── GOAL.md
        └── dod.js            # 4-test convergence check
```
