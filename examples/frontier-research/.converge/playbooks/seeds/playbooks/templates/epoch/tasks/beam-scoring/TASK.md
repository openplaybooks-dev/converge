---
id: "{{taskId}}"
title: "Beam scoring — epoch {{epoch}}"
depends_on:
  - 003-beam-execution
seeds:
  - type: nodejs
    path: ./wb./seed.js
---

# Beam Scoring — Epoch {{epoch}}

Score each beam's exploration results on 5 dimensions.

This task dynamically spawns one scoring task per beam, plus a consolidation task that merges all scores into `{{artifactsDir}}/scores/summary.json`.

Each beam is scored on: novelty, evidence strength, coherence, depth, and generativity.
