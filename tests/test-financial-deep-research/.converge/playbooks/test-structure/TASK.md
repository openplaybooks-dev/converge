---
id: test-structure
title: "Root — mirrors financial-deep-research root"
seeds:
  - type: nodejs
    path: ./seed.js
---

# Root Task

Spawns 3 children in order:
1. **A (pipeline)** — has its own seed spawning A1, A2
2. **B (cross-ticker)** — depends on A
3. **C (report)** — depends on B
