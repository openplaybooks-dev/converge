---
materialization: incremental
mode: converger
converge:
  max_waves: 30
  # halt_when: deterministic checks; replaces seed-era keepLooping=false.
  halt_when:
    - id: epoch-done
      cmd: 'test -f "$CONVERGE_TASK_DIR/halt.marker"'
outputs:
  - target/incremental-task/result.txt
checks:
  - id: output-exists
    cmd: test -f target/incremental-task/result.txt
---
# incremental-task
