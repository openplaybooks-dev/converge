---
id: build
title: Build — do-while root, spawns one sprint per wave
passthrough: true
checks:
  - id: completed-3-waves
    cmd: test -f output/build/wave-2.flag
converge: |
  Decide whether the build is finished by reading output/build/wave.counter.
  If wave 2 has been recorded (3 sprints spawned), halt; else continue.
ai:
  provider: stub
---

# Build — do-while root

Root task of the goal-driven loop. Each gap-repair iteration:

1. Reads `output/build/wave.counter` (defaults to 0)
2. Writes per-wave flag `output/build/wave-${WAVE}.flag`
3. Spawns one `sprint-${WAVE}` orchestrator via `converge spawn task`,
   passing wave + sprint_id as typed vars
4. Bumps the counter

After 3 waves (0, 1, 2) the body marks itself done so the converge:
prompt short-circuits to the early-halt path.

```bash
mkdir -p output/build

if [ -s output/build/wave.counter ]; then
  WAVE=$(cat output/build/wave.counter)
else
  WAVE=0
fi

TS=$(date +%s)
echo "wave=$WAVE ran-at=$TS" > "output/build/wave-${WAVE}.flag"
echo "[build] wave=$WAVE — spawning sprint-${WAVE}"

# Spawn one sprint per wave. Template `sprint` resolves to
# .converge/playbooks/default/templates/sprint/TASK.md. The sprint
# orchestrator will spawn 2 phase children of its own. Idempotent —
# skip if this wave's sprint has already been spawned (the build body
# can re-run if the gap loop hasn't yet seen the wave-flag check pass).
SPAWN_MARKER="output/spawn-markers/build-sprint-${WAVE}.done"
mkdir -p output/spawn-markers
if [ ! -f "$SPAWN_MARKER" ]; then
  converge spawn "sprint-${WAVE}" sprint \
    --var "wave=${WAVE}" \
    --var "sprint_id=sprint-${WAVE}"
  touch "$SPAWN_MARKER"
else
  echo "[build] sprint-${WAVE} already spawned (idempotent)"
fi

NEXT=$((WAVE + 1))
echo "$NEXT" > output/build/wave.counter

if [ "$WAVE" -ge 2 ]; then
  converge tasks mark build --status done \
    --reasoning "build completed 3 waves (0..2); halting per converge: contract"
  echo "[build] marked done after wave $WAVE"
fi
```
