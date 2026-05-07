---
id: 02-drain-epochs
title: "Drain epochs — incremental do-while"
description: "Incremental seed. One child per pass processes a queue item. Discovers follow-up work from completed outputs, enqueues, spawns next. Stops when queue drained."
materialization: incremental
seeds:
  - type: seed
    name: drain-epoch
inputs:
  - .converge/artifacts/queue-pattern/queue.json
outputs:
  - .converge/artifacts/queue-pattern/pages/*.json
  - .converge/artifacts/queue-pattern/queue.json
checks:
  - id: queue-drained
    cmd: jq -e '.pending | length == 0' .converge/artifacts/queue-pattern/queue.json && jq -e '.processing | length == 0' .converge/artifacts/queue-pattern/queue.json
    description: Queue fully drained
  - id: four-pages-produced
    cmd: test $(find .converge/artifacts/queue-pattern/pages -name "*.json" 2>/dev/null | wc -l) -ge 4
    description: All 4 pages produced (alpha + beta + gamma + delta)
---

# Drain Epochs — Incremental Do-While

Incremental seed (do-while pattern). Each DAG pass:
1. Scans completed items in `pages/*.json`
2. Discovers follow-up items from completed outputs
3. Enqueues new items → spawns one `process-{id}` child
4. Stops when `pending=[] AND processing=[]` (convergence)

## Discovery map
- alpha → discovers: gamma
- beta → discovers: delta
- gamma → discovers: (none)
- delta → discovers: (none)

## Convergence
Queue drains when: **0 pending AND 0 processing**. Expected 5 seed passes for 4 items.
