---
id: parent
title: Incremental seed parent (do-while)
materialization: incremental
seeds:
  - type: seed
    name: incremental-do-while
---

Incremental seed container — spawns one child per DAG iteration.
Materialization is "incremental" so the seed re-runs until it returns false.
