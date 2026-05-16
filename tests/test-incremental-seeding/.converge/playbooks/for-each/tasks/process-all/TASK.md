---
id: process-all
title: Process all items (for-each incremental)
materialization: incremental
seed:
  mode: cli
---

Process a fixed list of items one at a time. Each child creates its
own output file. Emit one `converge spawn task` command for the next
unprocessed item each pass.
