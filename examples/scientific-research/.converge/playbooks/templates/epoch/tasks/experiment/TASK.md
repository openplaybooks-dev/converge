---
id: "{{taskId}}"
title: "Experiment — epoch {{epoch}}"
depends_on:
  - 002-hypothesize
seed:
  mode: cli
---

# Experiment Execution — Epoch {{epoch}}

Test each active hypothesis from `{{artifactsDir}}/hypothesize/hypotheses.json` by spawning one child task per hypothesis.

Each child experiment must produce structured results with effect sizes, confidence intervals, methodology documentation, and limitations.

## Spawn per-hypothesis children

Read `{{artifactsDir}}/hypothesize/hypotheses.json`, filter to hypotheses with `status: "active"`, and emit one `converge spawn template` line per hypothesis:

```bash
ARTIFACTS_DIR="${CONVERGE_VAR_ARTIFACTSDIR:?artifactsDir is required}"
CATALOG="${ARTIFACTS_DIR}/hypothesize/hypotheses.json"

jq -c '.hypotheses[] | select(.status == "active")' "${CATALOG}" | while read -r H; do
  H_ID=$(echo "${H}" | jq -r '.id')
  H_STATEMENT=$(echo "${H}" | jq -r '.statement // ""')
  H_TESTPLAN=$(echo "${H}" | jq -r '.testPlan // ""')
  converge spawn template \
    --path .converge/playbooks/templates/experiment-single/TASK.md \
    --id "experiment-${CONVERGE_VAR_EPOCH}-${H_ID}" \
    --var "epoch=${CONVERGE_VAR_EPOCH}" \
    --var "question=${CONVERGE_VAR_QUESTION}" \
    --var "domain=${CONVERGE_VAR_DOMAIN:-general}" \
    --var "hypothesisId=${H_ID}" \
    --var "hypothesisStatement=${H_STATEMENT}" \
    --var "testPlan=${H_TESTPLAN}"
done
```

Each spawned `experiment-single` child writes its result to `{{artifactsDir}}/experiment/<H_id>.json`. The downstream statistical-analysis task reads these per-hypothesis files.
