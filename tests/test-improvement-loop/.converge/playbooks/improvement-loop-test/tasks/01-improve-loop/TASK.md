---
id: 01-improve-loop
title: Improvement loop — 10 waves
description: |
  mode: converger that runs exactly 10 waves per invocation.
  Each wave spawns one iteration template that proposes and implements a change.
  After all waves complete, a compare step runs and picks the best implementation.
mode: converger
passthrough: true
ai:
  provider: stub
converge:
  max_waves: 11
  halt_when:
    - id: all-waves-done
      cmd: "bash -c '[[ -f improve-test/.all-waves-done ]]'"
inputs: []
outputs:
  - improve-test/winners.json
checks:
  - id: at-least-one-wave
    cmd: bash -c '[[ -d improve-test/wave-001 ]]'
    description: At least wave-001 was spawned
  - id: all-10-waves-spawned
    cmd: bash -c '[[ -f improve-test/.all-waves-done ]]'
    description: All 10 waves completed
---

# Improvement loop — 10 waves

`mode: converger`. Each wave picks the next wave number, spawns one `iteration`
template instance (propose + implement). After the 10th wave, the converge step
runs the compare phase.

## Body

```bash
mkdir -p improve-test

WAVE_NUM=$(ls -1d improve-test/wave-* 2>/dev/null | wc -l | tr -d ' ')
WAVE_NUM=$((WAVE_NUM + 1))
WAVE_ID=$(printf "wave-%03d" "$WAVE_NUM")
mkdir -p "improve-test/$WAVE_ID"

if [[ ! -f improve-test/journal.md ]]; then
  echo "# improvement-loop-test journal" > improve-test/journal.md
  echo "" >> improve-test/journal.md
fi
echo "- $WAVE_ID: spawned" >> improve-test/journal.md

SPAWN_BASE="${CONVERGE_SPAWN_DIR:-${CONVERGE_TASK_DIR:-./attempts/wip/spawn}}"
mkdir -p "$SPAWN_BASE/$WAVE_ID"
printf 'template: iteration\nparams:\n  wave: "%s"\n  waveId: "%s"\n' "$WAVE_NUM" "$WAVE_ID" > "$SPAWN_BASE/$WAVE_ID/spawn.yml"

if [[ "$WAVE_NUM" -ge 10 ]]; then
  touch improve-test/.all-waves-done
  mkdir -p "$SPAWN_BASE/compare"
  printf 'template: compare\nparams:\n  waveId: "%s"\n' "final" > "$SPAWN_BASE/compare/spawn.yml"
fi
```