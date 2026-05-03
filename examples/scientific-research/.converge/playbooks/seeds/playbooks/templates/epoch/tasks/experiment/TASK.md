---
id: "{{taskId}}"
title: "Experiment — epoch {{epoch}}"
dependencies:
  - 002-hypothesize
seeds:
  - type: nodejs
    path: ./wb./seed.js
---

# Experiment Execution — Epoch {{epoch}}

Test each active hypothesis from `{{artifactsDir}}/hypothesize/hypotheses.json`.

This task dynamically spawns one experiment task per active hypothesis, plus a consolidation task that merges all results.

Each experiment must produce structured results with effect sizes, confidence intervals, methodology documentation, and limitations.
