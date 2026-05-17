---
id: "{{taskId}}"
title: "Phase 2: Research-x — Epoch {{epoch}}"
vars:
  epoch:
  question:
  domain:
  maxEpochs:
  confidenceThreshold:
---

# Phase 2: Research-x — Epoch {{epoch}}

AI-driven iterative research, one epoch at a time.

**Research question**: {{question}}
**Domain**: {{domain}}
**Epoch**: {{epoch}}
**Max epochs**: {{maxEpochs}}

## Epoch pipeline

Four sequential subtasks live under `tasks/` and are auto-discovered by the framework:

1. **001-subtopic-split** — AI decides which sub-topics to research this epoch
2. **002-subtopic-research** — Spawn one parallel child per sub-topic (dynamic, via CLI)
3. **003-cross-topic-aggregate** — Synthesize findings across sub-topics
4. **004-epoch-decision** — AI decides: continue to next epoch, or proceed to final report (spawns the next epoch's `002-research-x` or `003-report` via CLI)

## Stop conditions

- **AI confidence** reaches `{{confidenceThreshold}}`
- **Max epochs** safety cap of `{{maxEpochs}}` reached
