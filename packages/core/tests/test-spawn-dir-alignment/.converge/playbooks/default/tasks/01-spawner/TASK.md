---
id: 01-spawner
title: Spawn Dir Test
mode: spawner
passthrough: true
inputs: []
outputs: []
checks:
  - id: spawn-dir-verified
    cmd: |
      echo "CONVERGE_SPAWN_DIR=$CONVERGE_SPAWN_DIR"
      test -d "$CONVERGE_SPAWN_DIR/child-1" && echo "SPAWN_CHILD_DIR=ok"
    description: Spawn dir contains child directory
spawn:
  template: child-template
---
# Body
#!/bin/bash
echo "Body running, CONVERGE_SPAWN_DIR=$CONVERGE_SPAWN_DIR"
converge spawn child-1 child-template --var id=child-1
echo "Spawned child-1 via converge spawn"
