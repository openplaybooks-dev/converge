---
id: implement-{{waveId}}
title: "Implement {{waveId}} per its RFC"
description: |
  Reads the RFC and applies the proposed change. Each wave writes a score file
  so the compare step can evaluate which wave produced the best outcome.
vars:
  - waveId
  - wave
inputs:
  - "improve-test/{{waveId}}/rfc.md"
outputs:
  - "improve-test/{{waveId}}/implemented.txt"
  - "improve-test/{{waveId}}/score.txt"
checks:
  - id: implemented-file-written
    cmd: bash -c '[[ -f improve-test/{{waveId}}/implemented.txt ]]'
    description: implemented.txt written for this wave
  - id: score-written
    cmd: bash -c '[[ -f improve-test/{{waveId}}/score.txt ]]'
    description: score.txt written for comparison
---

# Implement {{waveId}}

## Body

```bash
#!/usr/bin/env bash
set -euo pipefail

WAVE_ID="{{waveId}}"
WAVE_NUM="{{wave}}"

# Read the RFC.
RFC_CONTENT=""
if [[ -f "improve-test/$WAVE_ID/rfc.md" ]]; then
  RFC_CONTENT=$(cat "improve-test/$WAVE_ID/rfc.md")
fi

# Apply the proposed change — write an implementation file with a wave-specific marker.
{
  echo "Implementation for {{waveId}}"
  echo "RFC content:"
  echo "$RFC_CONTENT"
  echo ""
  echo "## Implementation"
  echo "Wave $WAVE_NUM produced this output."
  echo "wave-marker: {{waveId}}"
} > "improve-test/$WAVE_ID/implemented.txt"

# Write a score so compare can pick the best.
# In a real scenario this would be a benchmark result.
# Mock: pseudo-random score based on wave number + timestamp second hand.
# This makes each wave produce a different, unpredictable score.
SECOND=$(date +%-S)
SCORE=$(( (WAVE_NUM * 7 + SECOND * 3) % 100 ))
echo "$SCORE" > "improve-test/$WAVE_ID/score.txt"

echo "[implement] {{waveId}} score=$SCORE written"
```