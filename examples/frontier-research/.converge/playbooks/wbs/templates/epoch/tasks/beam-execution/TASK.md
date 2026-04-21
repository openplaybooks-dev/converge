---
id: "{{taskId}}"
title: "Beam execution — epoch {{epoch}}"
dependencies:
  - 002-beam-spawning
wbs:
  type: nodejs
  path: ./wbs/wbs.js
---

# Beam Execution — Epoch {{epoch}}

Execute each beam defined in `{{artifactsDir}}/beams.json` in parallel.

This task dynamically spawns one exploration task per beam, plus a consolidation task that merges all results into `{{artifactsDir}}/explorations/summary.json`.

Each beam follows its own methodology — there is no fixed exploration template. Beams may use literature review, logical analysis, analogical reasoning, computational modeling, or any approach specified in their definition.
