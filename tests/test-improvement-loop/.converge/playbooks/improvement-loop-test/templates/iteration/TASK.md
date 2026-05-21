---
id: iter-{{waveId}}
title: "Iteration {{waveId}} — propose RFC → implement → benchmark"
description: |
  mode: spawner that fans out a 2-step sub-pipeline: propose, then implement.
  Each step is sequential via depends_on. After all waves, compare runs.
mode: spawner
spawn:
  min_children: 2
  max_children: 2
  apply: auto
vars:
  - wave
  - waveId
inputs: []
outputs:
  - "improve-test/{{waveId}}/implemented.txt"
checks:
  - id: implemented-file-written
    cmd: bash -c '[[ -f improve-test/{{waveId}}/implemented.txt ]]'
    description: implemented.txt written for this wave
---

# Iteration {{waveId}}

This iteration is a `mode: spawner`. Its body writes 2 `<id>/spawn.yml` invocations
with sequential `depends_on:`: propose → implement.

## Body

```bash
#!/usr/bin/env bash
set -euo pipefail

WAVE_ID="{{waveId}}"
WAVE_NUM="{{wave}}"

mkdir -p "improve-test/$WAVE_ID"

# Step 1: propose — writes rfc.md
mkdir -p "$CONVERGE_SPAWN_DIR/propose"
cat > "$CONVERGE_SPAWN_DIR/propose/spawn.yml" <<EOF
template: propose
params:
  waveId: "$WAVE_ID"
  wave: "$WAVE_NUM"
EOF

# Step 2: implement — depends on propose
mkdir -p "$CONVERGE_SPAWN_DIR/implement"
cat > "$CONVERGE_SPAWN_DIR/implement/spawn.yml" <<EOF
template: implement
depends_on:
  - propose
params:
  waveId: "$WAVE_ID"
  wave: "$WAVE_NUM"
EOF

echo "iteration {{waveId}}: spawned propose + implement"
```