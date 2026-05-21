---
id: compare-final
title: "Compare — select the best wave after all 10 complete"
description: |
  After all 10 waves have implemented their changes, this step compares all
  score files and writes winners.json listing the best wave(s).
vars:
  - waveId
outputs:
  - "improve-test/winners.json"
checks:
  - id: winners-json-written
    cmd: bash -c '[[ -f improve-test/winners.json ]]'
    description: winners.json written with the best wave
---

# Compare final

## Body

```bash
#!/usr/bin/env bash
set -euo pipefail

# Collect all wave scores and pick the best.
# Higher score = better in this simplified test.
BEST_WAVE=""
BEST_SCORE="-1"

for wave_dir in improve-test/wave-*; do
  if [[ ! -d "$wave_dir" ]]; then continue; fi
  score_file="$wave_dir/score.txt"
  if [[ ! -f "$score_file" ]]; then continue; fi

  score=$(cat "$score_file")
  wave_id=$(basename "$wave_dir")

  echo "Wave $wave_id: score=$score"

  if (( score > BEST_SCORE )); then
    BEST_SCORE=$score
    BEST_WAVE=$wave_id
  fi
done

echo ""
echo "=== BEST WAVE: $BEST_WAVE (score=$BEST_SCORE) ==="

# Write winners.json.
{
  echo "{"
  echo "  \"best_wave\": \"$BEST_WAVE\","
  echo "  \"best_score\": $BEST_SCORE,"
  echo "  \"total_waves\": $(ls -1d improve-test/wave-* 2>/dev/null | wc -l | tr -d ' ')"
  echo "}"
} > improve-test/winners.json

# Update journal.
echo "" >> improve-test/journal.md
echo "---" >> improve-test/journal.md
echo "Winner: $BEST_WAVE with score $BEST_SCORE" >> improve-test/journal.md

echo "[compare] winners.json written"
```