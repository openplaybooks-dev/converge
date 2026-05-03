---
id: "{{taskId}}"
title: "Phase 1: Initial Research"
seeds:
  - type: nodejs
    path: {{templatesDir}}/001-initial/wb./seed.js
vars:
  artifactsDir: "{{artifactsDir}}"
  templatesDir: "{{templatesDir}}"
  question: "{{question}}"
  domain: "{{domain}}"
  maxEpochs: "{{maxEpochs}}"
---

# Phase 1: Initial Research

Establish broad understanding of the research landscape and identify initial scope.

**Research question**: {{question}}
**Domain**: {{domain}}
**Artifacts dir**: {{artifactsDir}}

## Phase 1 Tasks

1. **Initial Search** — Broad search across the topic landscape
2. **Initial Gather** — Collect foundational sources and references
3. **Scope Identification** — Identify key areas and initial sub-topic candidates
4. **Initial Aggregation** — Synthesize and decide focus areas for research-x

## Quality Gate

Phase 1 aggregation must produce:
- A list of scoped sub-topics for research-x
- Key uncertainties identified
- Recommended depth level (shallow/medium/deep)