---
id: converge-runner
title: converge-runner.ts — executeDag() in place of wave loop, NO waves
description: |
  The converge runner currently wraps autonomousRun() in a wave loop:
  while gaps exist, run tasks, score progress, repeat. Replace with
  executeDag(). Single pass. No waves.

children:
  - converge-runner-red
  - converge-runner-green
---

# 08 — converge-runner.ts

### red
Write baseline test for converge runner behavior.

### green
Replace the wave loop: `executeDag()` runs all tasks in topological
order. If `result.success` is false, report failures. No waves.
No gap detection. No scoring. Just DAG execution.

## Done when

executeDag() replaces the wave loop. Baseline test passes with
equivalent behavior (tasks complete). No wave messages in output.
