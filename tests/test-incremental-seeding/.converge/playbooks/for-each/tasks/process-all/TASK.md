---
id: process-all
title: Process all items (for-each incremental)
materialization: incremental
seeds:
  - type: seed
    name: for-each
---

Process a fixed list of items one at a time. Each child creates its
own output file. The seed function reads seed.json to find already-spawned
children and spawns the next unprocessed item.
