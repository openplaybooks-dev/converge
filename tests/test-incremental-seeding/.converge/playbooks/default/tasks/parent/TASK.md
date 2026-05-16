---
id: parent
title: Incremental seed parent (do-while)
materialization: incremental
seed:
  mode: cli
---

Incremental CLI seed container — emits one `converge spawn task` child per DAG iteration.
Materialization is "incremental" so the parent re-runs until it is done.
