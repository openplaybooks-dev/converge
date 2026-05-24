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

This iteration is a `mode: spawner`. Its body spawns 2 children
with sequential `depends_on:`: propose → implement.

## Body

```bash
#!/usr/bin/env bash
set -euo pipefail

WAVE_ID="{{waveId}}"
WAVE_NUM="{{wave}}"

mkdir -p "improve-test/$WAVE_ID"

# Step 1: propose — writes rfc.md
converge spawn propose propose --var waveId="$WAVE_ID" --var wave="$WAVE_NUM"

# Step 2: implement — depends on propose
converge spawn implement implement --var waveId="$WAVE_ID" --var wave="$WAVE_NUM" --after propose

echo "iteration {{waveId}}: spawned propose + implement"
```