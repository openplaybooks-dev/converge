---
id: "{{taskId}}"
title: "Research: {{question}}"
seed:
  mode: cli
vars:
  question:
  domain:
  maxEpochs:
  confidenceThreshold:
---

# Deep Research: {{question}}

Self-contained entry point that spawns the full 3-phase pipeline. Useful when running the pipeline as a standalone child of some other workflow (the playbook-level `TASK.md` wires the same head directly).

## Seed

Spawn the initial phase plus the first research-x epoch chained after it:

```bash
INITIAL_TPL=".converge/playbooks/deep-research/templates/001-initial/TASK.md"
RESEARCH_X_TPL=".converge/playbooks/deep-research/templates/002-research-x/TASK.md"

converge spawn template \
  --path "${INITIAL_TPL}" \
  --id initial-phase \
  --var "taskId=initial-phase" \
  --var "question=${CONVERGE_VAR_QUESTION}" \
  --var "domain=${CONVERGE_VAR_DOMAIN}" \
  --var "maxEpochs=${CONVERGE_VAR_MAXEPOCHS:-3}" \
  --var "confidenceThreshold=${CONVERGE_VAR_CONFIDENCETHRESHOLD:-0.8}"

converge spawn task \
  --id research-x-epoch-1 \
  --task-file "${RESEARCH_X_TPL}" \
  --depends-on initial-phase \
  --var "taskId=research-x-epoch-1" \
  --var "epoch=1" \
  --var "question=${CONVERGE_VAR_QUESTION}" \
  --var "domain=${CONVERGE_VAR_DOMAIN}" \
  --var "maxEpochs=${CONVERGE_VAR_MAXEPOCHS:-3}" \
  --var "confidenceThreshold=${CONVERGE_VAR_CONFIDENCETHRESHOLD:-0.8}"
```

The `004-epoch-decision` subtask of each `002-research-x` instance is responsible for spawning either the next epoch's `002-research-x` or the terminal `003-report`.
