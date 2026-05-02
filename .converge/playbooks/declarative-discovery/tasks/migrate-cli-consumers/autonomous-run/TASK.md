---
id: autonomous-run
title: autonomous-run.ts — executeDag() wrapper, NO iteration loop
description: |
  The autonomous runner currently uses a snap-execute loop: load tree,
  find next task, execute, checkpoint, repeat. Replace with executeDag().
  The autonomous runner becomes a thin wrapper — no iteration loop.

children:
  - autonomous-run-red
  - autonomous-run-green
---

# 07 — autonomous-run.ts

### red
Write baseline test for autonomous run behavior.

### green
Replace the iteration loop with `executeDag()`. The runner reads
checkpoint state, marks already-complete nodes, then calls
`executeDag()`. Single pass. No loop.
