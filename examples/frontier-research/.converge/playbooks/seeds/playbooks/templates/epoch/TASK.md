---
id: "{{taskId}}"
title: "Epoch {{epoch}}"
seeds:
  - type: nodejs
    path: ./wb./seed.js
---

# Epoch {{epoch}}

Run the full beam-search research pipeline: frontier analysis → beam spawning → beam execution → beam scoring → selection & merge → gradient step.

**Research question**: {{question}}
**Domain**: {{domain}}
**Beam width**: {{beamWidth}}
**Selection width**: {{selectionWidth}}
