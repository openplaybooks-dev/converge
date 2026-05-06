---
id: process-batches
title: Process batches (outer incremental loop)
materialization: incremental
seeds:
  - type: seed
    name: batch-loop
---

Outer incremental seed. Spawns one batch child per DAG iteration.
Each batch child is itself an incremental seed that spawns item children.
