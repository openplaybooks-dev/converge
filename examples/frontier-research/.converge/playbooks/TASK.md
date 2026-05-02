---
id: frontier-research
title: Frontier research pipeline
seeds:
  - type: nodejs
    path: ./wbs/wbs.js
---

# Frontier Research Pipeline

Each epoch runs a 6-phase beam-search research iteration:
1. **Frontier Analysis** — map current knowledge frontier, rank edges by impact/tractability/novelty
2. **Beam Spawning** — define N parallel research beams targeting promising frontier edges
3. **Beam Execution** — explore each beam in parallel (no fixed methodology — each beam defines its own approach)
4. **Beam Scoring** — score each beam on 5 dimensions (novelty, evidence, coherence, depth, generativity)
5. **Selection & Merge** — select top-K beams, merge insights, compute insight delta
6. **Gradient Step** — update accumulated knowledge model, decide convergence

Knowledge accumulates across epochs. Dead ends are tracked to prevent re-exploration. The loop stops when insight delta falls below threshold for 2 consecutive epochs.
