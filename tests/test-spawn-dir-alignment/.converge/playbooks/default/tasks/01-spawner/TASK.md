---
id: 01-spawner
title: Env Var Test
mode: spawner
passthrough: true
inputs: []
outputs:
  - dummy-output.txt
checks:
  - id: env-set
    cmd: |
      echo "CONVERGE_SPAWN_DIR_SET=ok"
    description: Env vars are set
spawn:
  template: child-template
---
# Body
#!/bin/bash
touch dummy-output.txt
echo "Body ran with CONVERGE_SPAWN_DIR=$CONVERGE_SPAWN_DIR"
echo "Body ran with CONVERGE_TASK_DIR=$CONVERGE_TASK_DIR"
