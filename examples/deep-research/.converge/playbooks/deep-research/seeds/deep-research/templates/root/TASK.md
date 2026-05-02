---
id: "{{taskId}}"
title: "Research: {{question}}"
seeds:
  - type: nodejs
    path: {{templatesDir}}/root/wbs/wbs.js
vars:
  artifactsDir: "{{artifactsDir}}"
  templatesDir: "{{templatesDir}}"
  question: "{{question}}"
  domain: "{{domain}}"
  maxEpochs: "{{maxEpochs}}"
  researchKey: "{{researchKey}}"
---

# Deep Research: {{question}}

Comprehensive research investigation with iterative deepening across multiple phases.

**Research question**: {{question}}
**Domain**: {{domain}}
**Max epochs**: {{maxEpochs}}
**Artifacts dir**: {{artifactsDir}}

## Research Pipeline

This research follows a 3-phase approach:

1. **Phase 1: Initial Research** — Broad understanding and scope identification
2. **Phase 2: Research-X** — Iterative deepening with epoch-based investigation
3. **Phase 3: Final Report** — Synthesis and comprehensive documentation

Each phase builds on the previous, with quality gates controlling progression.
