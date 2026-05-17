---
id: social-sim
title: Social simulation — direct
seed:
  mode: cli
vars:
  scenario: misinfo
  populationSize: "10"
  steps: "3"
  recommender: hot-score
  seedPosts: "1"
  seed: "42"
  runId: ""
---

# Social Simulation — Direct

Spawn one epoch task per loop iteration. Generate a `runId` if the user didn't pass one, create the per-run output directories, and emit exactly one `converge spawn template` line:

```bash
WAVE="${CONVERGE_TASK_WAVE:-1}"
RUN_ID="${CONVERGE_VAR_RUNID}"
if [ -z "${RUN_ID}" ]; then
  RUN_ID="run-$(date -u +%Y-%m-%dT%H-%M)"
fi
mkdir -p "runs/${RUN_ID}" "vault/runs/${RUN_ID}"

TICK_LABEL="tick-$(printf '%02d' "${WAVE}")"

converge spawn template \
  --path .converge/playbooks/social-sim/templates/epoch/TASK.md \
  --id "epoch-${WAVE}" \
  --var "epoch=${WAVE}" \
  --var "tick=${TICK_LABEL}" \
  --var "tickNum=${WAVE}" \
  --var "runId=${RUN_ID}" \
  --var "scenario=${CONVERGE_VAR_SCENARIO:-misinfo}" \
  --var "populationSize=${CONVERGE_VAR_POPULATIONSIZE:-10}" \
  --var "steps=${CONVERGE_VAR_STEPS:-3}" \
  --var "recommender=${CONVERGE_VAR_RECOMMENDER:-hot-score}" \
  --var "seedPosts=${CONVERGE_VAR_SEEDPOSTS:-1}" \
  --var "seed=${CONVERGE_VAR_SEED:-42}"
```

Do not modify the command. Do not add or omit lines.
