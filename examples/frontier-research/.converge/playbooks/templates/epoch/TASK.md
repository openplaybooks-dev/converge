---
id: "{{taskId}}"
title: "Epoch {{epoch}}"
vars:
  epoch:
  question:
  domain:
  beamWidth:
  selectionWidth:
---

# Epoch {{epoch}}

Run the full beam-search research pipeline: frontier analysis → beam spawning → beam execution → beam scoring → selection & merge → gradient step.

**Research question**: {{question}}
**Domain**: {{domain}}
**Beam width**: {{beamWidth}}
**Selection width**: {{selectionWidth}}

## Phase Subtasks

The 6 phase subtasks live under `tasks/` and are picked up automatically by the framework's `tasks/` subdirectory convention. They run in sequence via their `depends_on` chain:

1. `frontier-analysis` — map the knowledge frontier
2. `beam-spawning` — define `{{beamWidth}}` parallel beams
3. `beam-execution` — spawn one exploration child per beam and consolidate
4. `beam-scoring` — spawn one scoring child per beam and consolidate
5. `selection-merge` — pick top-`{{selectionWidth}}` beams and merge insights
6. `gradient-step` — update accumulated knowledge and decide CONTINUE vs CONVERGED

Each phase inherits this epoch's vars (`epoch`, `question`, `domain`, `beamWidth`, `selectionWidth`) via the framework's strict-mode var inheritance.

There is nothing for the runner to do at this level — the phase subtasks carry the actual work.
