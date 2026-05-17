---
id: "{{taskId}}"
title: "Phase 1: Initial Research"
vars:
  question:
  domain:
  maxEpochs:
  confidenceThreshold:
---

# Phase 1: Initial Research

Establish broad understanding of the research landscape and identify initial scope.

**Research question**: {{question}}
**Domain**: {{domain}}

## Phase 1 Tasks

Four sequential subtasks live under `tasks/` and are auto-discovered by the framework:

1. **001-initial-search** — Broad search across the topic landscape
2. **002-initial-gather** — Collect foundational sources and references
3. **003-scope-identification** — Identify key areas and initial sub-topic candidates
4. **004-initial-aggregation** — Synthesize and decide focus areas for research-x

## Quality Gate

Phase 1 aggregation must produce:
- A list of scoped sub-topics for research-x
- Key uncertainties identified
- Recommended depth level (shallow/medium/deep)
