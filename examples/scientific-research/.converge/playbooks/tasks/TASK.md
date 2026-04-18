---
title: Scientific Research Pipeline
wbs:
  type: nodejs
  path: ./wbs.js
blocking: true
---

Execute the scientific method to answer the research question.

Sequential pipeline aligned with standard scientific methodology:
1. Literature review — survey existing knowledge
2. Hypothesize — formulate testable hypotheses from findings
3. Experiment — test each hypothesis (spawns per-hypothesis tasks)
4. Analyze — cross-reference results, identify patterns and gaps
5. Synthesize — produce final answer with evidence chain

Each phase has deterministic checks verifying its outputs exist and
are well-formed. The convergence loop re-triggers the pipeline when
evidence is insufficient or contradictions remain.
