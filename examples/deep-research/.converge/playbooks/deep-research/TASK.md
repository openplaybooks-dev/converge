---
id: deep-research
title: Deep research pipeline
seeds:
  - type: nodejs
    path: ./wbs/wbs.js
---

# Deep Research

Layered deep research with iterative deepening. Each layer aggregates findings, identifies promising areas, and triggers deeper investigation in subsequent layers.

**Research question**: ${question}
**Domain**: ${domain}
**Max epochs**: ${maxEpochs}

The pipeline runs layers sequentially: Layer 1 (Breadth Survey) → Layer 2 (Focused Exploration) → Layer 3 (Deep Investigation) → Final Report. Quality gates control progression between layers.