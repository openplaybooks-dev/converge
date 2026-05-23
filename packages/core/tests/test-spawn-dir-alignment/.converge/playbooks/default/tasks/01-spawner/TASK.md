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
      test -f "$CONVERGE_SPAWN_DIR/child-1/spawn.yml" && echo "SPAWN_YML_IN_SPAWN_DIR=ok"
    description: Spawn dir contains child spawn.yml
spawn:
  template: child-template
---
# Body
#!/bin/bash
echo "Body running, CONVERGE_SPAWN_DIR=$CONVERGE_SPAWN_DIR"
mkdir -p "$CONVERGE_SPAWN_DIR/child-1"
cat > "$CONVERGE_SPAWN_DIR/child-1/spawn.yml" << 'EOF'
template: child-template
params:
  id: child-1
EOF
echo "Wrote spawn.yml to $CONVERGE_SPAWN_DIR/child-1/spawn.yml"
