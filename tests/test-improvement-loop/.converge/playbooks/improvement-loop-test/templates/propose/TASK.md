---
id: propose-{{waveId}}
title: "Propose RFC for {{waveId}}"
description: |
  Writes a simple RFC file describing the proposed change for this wave.
  In a real scenario this would analyze the codebase and propose a specific improvement.
vars:
  - waveId
  - wave
outputs:
  - "improve-test/{{waveId}}/rfc.md"
checks:
  - id: rfc-written
    cmd: bash -c '[[ -f improve-test/{{waveId}}/rfc.md ]]'
    description: RFC written for this wave
---

# Propose {{waveId}}

## Body

```bash
#!/usr/bin/env bash
set -euo pipefail

WAVE_ID="{{waveId}}"
WAVE_NUM="{{wave}}"

# Write a simple RFC for this wave.
{
  echo "# RFC: improvement-{{waveId}}"
  echo ""
  echo "## Wave"
  echo "$WAVE_NUM"
  echo ""
  echo "## Summary"
  echo "Proposed change for wave $WAVE_NUM of the improvement loop."
  echo ""
  echo "## Proposed change"
  echo "Append a wave marker line to the implementation file."
} > "improve-test/$WAVE_ID/rfc.md"

echo "[propose] {{waveId}} RFC written"
```