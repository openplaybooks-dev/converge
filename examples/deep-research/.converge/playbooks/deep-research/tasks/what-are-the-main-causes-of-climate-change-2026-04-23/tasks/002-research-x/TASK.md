---
id: 002-research-x
title: "Phase 2: Research-x — AI-Driven Iterative Research"
wbs:
  type: nodejs
  path: /Users/minh/Documents/converge/examples/deep-research/.converge/playbooks/deep-research/wbs/templates/002-research-x/wbs/wbs.js
vars:
  artifactsDir: /Users/minh/Documents/converge/examples/deep-research/.converge/artifacts/deep-research/what-are-the-main-causes-of-climate-change-2026-04-23
  templatesDir: /Users/minh/Documents/converge/examples/deep-research/.converge/playbooks/deep-research/wbs/templates
  question: What are the main causes of climate change?
  domain: environmental science
  maxEpochs: 10
  researchKey: what-are-the-main-causes-of-climate-change-2026-04-23
  epoch: 1
  taskId: 002-research-x
---

# Phase 2: Research-x

AI-driven iterative research with epoch-based sub-topic investigation.

**Research question**: What are the main causes of climate change?
**Domain**: environmental science
**Artifacts dir**: /Users/minh/Documents/converge/examples/deep-research/.converge/artifacts/deep-research/what-are-the-main-causes-of-climate-change-2026-04-23
**Epoch**: 1
**Max epochs**: 10

## Research-x Loop

Phase 2 loops epoch-by-epoch until AI decides "enough information" or max epochs reached:

1. **Sub-topic Split** — AI decides which sub-topics to research this epoch
2. **Parallel Research** — All sub-topics researched concurrently
3. **Cross-Topic Aggregation** — Synthesize findings across sub-topics
4. **Epoch Decision** — AI decides: continue to next epoch, or finalize report

## Stop Conditions

- **AI Confidence**: AI says "we have enough information"
- **Max Epochs**: Safety cap of 10 epochs, then force stop
