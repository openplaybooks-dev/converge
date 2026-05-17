---
id: "{{taskId}}"
title: "Tick {{tick}} — simulate"
description: >
  Spawn one task per persona. Each spawned task is one persona × one tick:
  read prior timeline + own bio, decide ONE action, append to timeline.jsonl.
depends_on:
  - 010-setup
seed:
  mode: cli
inputs:
  - "runs/{{runId}}/personas.json"
  - "runs/{{runId}}/graph.json"
  - "runs/{{runId}}/timeline.jsonl"
outputs:
  - "runs/{{runId}}/timeline.jsonl"
checks:
  - id: timeline-grew
    cmd: >
      python3 -c "import json,sys;
      lines=[json.loads(l) for l in open('runs/{{runId}}/timeline.jsonl') if l.strip()];
      this_tick=[l for l in lines if l.get('tick')=={{tickNum}}];
      sys.exit(0 if len(this_tick)>=1 else 1)"
    description: "At least one persona acted this tick (timeline.jsonl has rows with tick={{tickNum}})"
---

# Tick {{tick}} — Simulate

Spawn one persona-tick task per persona. Read `runs/${runId}/personas.json` and emit one `converge spawn template` line per persona:

```bash
RUN_ID="${CONVERGE_VAR_RUNID:?runId is required}"
TICK_NUM="${CONVERGE_VAR_TICKNUM:?tickNum is required}"
CATALOG="runs/${RUN_ID}/personas.json"

jq -c '.[]' "${CATALOG}" | while read -r P; do
  P_ID=$(echo "${P}"     | jq -r '.id')
  P_HANDLE=$(echo "${P}" | jq -r '.handle')
  P_BIO=$(echo "${P}"    | jq -r '.bio // ""')
  converge spawn template \
    --path .converge/playbooks/social-sim/templates/persona-tick/TASK.md \
    --id "t${TICK_NUM}-${P_ID}" \
    --var "personaId=${P_ID}" \
    --var "personaHandle=${P_HANDLE}" \
    --var "personaBio=${P_BIO}"
done
```

Tick-level vars (`tickNum`, `runId`, `scenario`, ...) inherit via strict-mode from this task's frontmatter, so each child sees the full context. Do not modify the spawn invocation.
