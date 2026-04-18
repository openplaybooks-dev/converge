---
title: LLM Training Configuration Evolution
wbs:
  type: nodejs
  path: ./wbs.js
blocking: true
---

Evolve LLM training configurations through iterative generation,
evaluation, selection, and crossover.

Each wave = one generation:
1. **Seed** (gen 0) or **Crossover** (gen 1+) — produce training configurations
2. **Evaluate** — score each configuration on benchmark fitness
3. **Select** — rank configurations, keep top-K, update best-ever

Configurations specify architecture choices (attention type, layer count,
hidden dim, positional encoding), hyperparameters (learning rate, batch
size, warmup, optimizer), and data strategy (mix ratios, curriculum,
augmentation). The convergence loop re-triggers when best fitness is
below the threshold. When converged, a final training recipe is produced.
