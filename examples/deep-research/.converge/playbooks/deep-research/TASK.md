---
id: deep-research
title: Deep research pipeline
seed:
  mode: cli
---

# Deep Research

Layered deep research with iterative deepening across three phases:

1. **Phase 1 — Initial** (one-shot): broad survey, source gathering, scope identification, initial aggregation.
2. **Phase 2 — Research-X** (loops over epochs): per-epoch subtopic split → parallel subtopic research → cross-topic aggregate → epoch decision.
3. **Phase 3 — Final Report** (one-shot): synthesize all findings.

## Seed

On wave 1 spawn the static head of the pipeline (initial phase + first research-x epoch). On subsequent waves emit nothing — the `004-epoch-decision` subtask of the most recent epoch is what spawns either the next epoch's `002-research-x` or the terminal `003-report`.

```bash
WAVE="${CONVERGE_TASK_WAVE:-1}"
[ "${WAVE}" != "1" ] && exit 0

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

If the snippet emits nothing on a later wave, return `done: true`.
