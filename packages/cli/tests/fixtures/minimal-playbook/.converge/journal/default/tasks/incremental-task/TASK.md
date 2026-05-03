---
materialization: incremental
wbs:
  type: nodejs
  path: seed.cjs
outputs:
  - target/incremental-task/result.txt
checks:
  - id: output-exists
    cmd: test -f target/incremental-task/result.txt
---
# incremental-task
