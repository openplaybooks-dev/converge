---
id: frontier-research
title: Frontier research pipeline
seed:
  mode: cli
---

# Frontier Research Pipeline

Spawn one epoch task per loop iteration.

Read `CONVERGE_TASK_WAVE` (the current loop iteration) and the playbook input vars and emit exactly one spawn command pointing at the `epoch` template:

```bash
EPOCH="${CONVERGE_TASK_WAVE}"
converge spawn template \
  --path .converge/playbooks/templates/epoch/TASK.md \
  --id "epoch-${EPOCH}" \
  --var "epoch=${EPOCH}" \
  --var "question=${CONVERGE_VAR_QUESTION}" \
  --var "domain=${CONVERGE_VAR_DOMAIN:-general}" \
  --var "beamWidth=${CONVERGE_VAR_BEAMWIDTH:-5}" \
  --var "selectionWidth=${CONVERGE_VAR_SELECTIONWIDTH:-2}"
```

Do not modify the command. Do not add or omit lines.
