---
id: "{{taskId}}"
title: "Phase 2: Research-x — AI-Driven Iterative Research"
wbs:
  type: nodejs
  path: {{templatesDir}}/002-research-x/wbs/wbs.js
vars:
  artifactsDir: "{{artifactsDir}}"
  templatesDir: "{{templatesDir}}"
  question: "{{question}}"
  domain: "{{domain}}"
  maxEpochs: "{{maxEpochs}}"
  researchKey: "{{researchKey}}"
  epoch: "{{epoch}}"
---

# Phase 2: Research-x

AI-driven iterative research with epoch-based sub-topic investigation.

**Research question**: {{question}}
**Domain**: {{domain}}
**Artifacts dir**: {{artifactsDir}}
**Epoch**: {{epoch}}
**Max epochs**: {{maxEpochs}}

## Research-x Loop

Phase 2 loops epoch-by-epoch until AI decides "enough information" or max epochs reached:

1. **Sub-topic Split** — AI decides which sub-topics to research this epoch
2. **Parallel Research** — All sub-topics researched concurrently
3. **Cross-Topic Aggregation** — Synthesize findings across sub-topics
4. **Epoch Decision** — AI decides: continue to next epoch, or finalize report

## Stop Conditions

- **AI Confidence**: AI says "we have enough information"
- **Max Epochs**: Safety cap of {{maxEpochs}} epochs, then force stop