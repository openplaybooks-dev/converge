---
id: sprint-2--phase-a
title: Phase — leaf task, writes per-sprint/per-phase artifact
checks:
  - id: phase-artifact-present
    type: cmd
    cmd: test -s "output/phases/${CONVERGE_VAR_SPRINT_ID}--phase-${CONVERGE_VAR_PHASE}.json"
    description: phase-artifact-present
vars:
  wave: "2"
  sprint_id: sprint-2
  phase: a
passthrough: true
---

# Phase body

A leaf task. Writes one JSON artifact recording its three declared
vars (wave, sprint_id, phase) and the run timestamp.

```bash
mkdir -p output/phases

WAVE="$CONVERGE_VAR_WAVE"
SID="$CONVERGE_VAR_SPRINT_ID"
PHASE="$CONVERGE_VAR_PHASE"
TS=$(date +%s)

cat > "output/phases/${SID}--phase-${PHASE}.json" <<EOF
{
  "wave": "${WAVE}",
  "sprint_id": "${SID}",
  "phase": "${PHASE}",
  "ran_at": ${TS}
}
EOF

echo "[phase] sprint=$SID phase=$PHASE wave=$WAVE — artifact written"
```
