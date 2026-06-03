---
id: phase-template
title: Phase — task, writes per-sprint/per-phase artifact
passthrough: true
vars:
  wave:
  sprint_id:
  phase:
checks:
  - id: phase-artifact-present
    cmd: test -s "output/phases/${CONVERGE_VAR_SPRINT_ID}--phase-${CONVERGE_VAR_PHASE}.json"
---

# Phase body

A task. Writes one JSON artifact recording its three declared
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
