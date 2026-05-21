---
id: sprint-0
title: Sprint orchestrator — spawns 2 phase children
checks:
  - id: sprint-flag-exists
    type: cmd
    cmd: test -f "output/sprints/${CONVERGE_VAR_SPRINT_ID}.flag"
    description: sprint-flag-exists
vars:
  wave: "0"
  sprint_id: sprint-0
passthrough: true
---

# Sprint orchestrator body

Spawned by `build` once per wave with `id=sprint-${WAVE}`. Reads its
two declared vars (`wave`, `sprint_id`), writes a per-sprint flag
recording the context, then spawns 2 phase children. Spawn is
idempotent: if a phase id already exists in the ledger from a prior
attempt, the framework's appendTaskUpsert refuses; we guard with a
local "spawned" marker so re-attempts don't trip duplicate-id errors.

```bash
mkdir -p output/sprints output/spawn-markers

WAVE="$CONVERGE_VAR_WAVE"
SID="$CONVERGE_VAR_SPRINT_ID"

echo "wave=$WAVE sprint=$SID ran-at=$(date +%s)" > "output/sprints/${SID}.flag"
echo "[sprint] $SID (wave=$WAVE) — spawning 2 phase children"

# Idempotent spawn: skip if marker exists (re-attempt path).
MARKER="output/spawn-markers/${SID}.done"
if [ ! -f "$MARKER" ]; then
  converge spawn "${SID}--phase-a" phase \
    --var "wave=$WAVE" \
    --var "sprint_id=$SID" \
    --var "phase=a"

  converge spawn "${SID}--phase-b" phase \
    --var "wave=$WAVE" \
    --var "sprint_id=$SID" \
    --var "phase=b" \
    --after "${SID}--phase-a"

  touch "$MARKER"
else
  echo "[sprint] $SID — phases already spawned (idempotent)"
fi
```
