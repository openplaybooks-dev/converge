---
id: looper
title: Multi-wave do-while looper — records each wave, gap-loop re-runs body
passthrough: true
checks:
  - id: completed-3-waves
    cmd: grep -q '^wave=2 ' output/waves.log
converge: |
  Decide whether the looper task should continue or stop. Read
  output/waves.log to see how many waves completed (one line per
  wave). If 3 waves are recorded (waves 0..2 inclusive), halt; else
  continue.
ai:
  provider: stub
---

# Looper body

A single passthrough task driven through 3 waves by the framework's
gap-repair loop. The check `grep -q '^wave=2 '` only passes once wave
2 has been recorded, so the gap-driven repair loop re-fires this body
inside a single `converge run` invocation:

  attempt 1 → body writes wave-0 artifacts → check still fails → re-detected
  attempt 2 → body writes wave-1 artifacts → check still fails → re-detected
  attempt 3 → body writes wave-2 artifacts → check passes → converged

Each wave produces THREE on-disk artifacts that prove the body ran
that wave:
  - output/waves.log           — append-only ledger, one line per wave
  - output/waves/wave-${WAVE}.json — per-wave snapshot (wave#, timestamp, attempt)
  - output/wave.counter         — monotonically increasing counter

After wave 2 the body marks the task done so the ledger row reflects
the final state.

```bash
mkdir -p output output/waves

if [ -s output/wave.counter ]; then
  WAVE=$(cat output/wave.counter)
else
  WAVE=0
fi

TS=$(date +%s)
ATTEMPT="${CONVERGE_TASK_ATTEMPT:-?}"
LEDGER_WAVE="${CONVERGE_TASK_WAVE:-?}"

# Per-wave artifact — proves THIS body invocation ran on THIS wave.
cat > "output/waves/wave-${WAVE}.json" <<EOF
{
  "wave": ${WAVE},
  "ran_at": ${TS},
  "attempt": "${ATTEMPT}",
  "ledger_wave": "${LEDGER_WAVE}"
}
EOF

# Append-only ledger.
echo "wave=$WAVE ran-at=${TS} attempt=${ATTEMPT} ledger_wave=${LEDGER_WAVE}" >> output/waves.log

TOTAL=$(wc -l < output/waves.log | tr -d ' ')
echo "[looper] wave=$WAVE attempt=$ATTEMPT — total recorded: $TOTAL"

NEXT=$((WAVE + 1))
echo "$NEXT" > output/wave.counter

if [ "$WAVE" -ge 2 ]; then
  converge tasks mark looper --status done \
    --reasoning "completed 3 waves (0..2); halting per converge: contract"
  echo "[looper] marked done after wave $WAVE"
fi
```
