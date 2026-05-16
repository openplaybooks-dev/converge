---
id: process-batches
title: Process batches (outer incremental loop)
materialization: incremental
seed:
  mode: cli
---

Outer incremental CLI parent. Emits one batch child per DAG iteration.
Each batch child is itself an incremental CLI parent that emits item children.
