---
id: "{{taskId}}"
title: "Evaluate Generation {{wave}}"
seed:
  mode: cli
vars:
  wave:
  trainingGoal:
  modelScale: "7B"
  populationSize: "5"
  topK: "2"
  fitnessThreshold: "0.9"
outputs:
  - scored/gen-{{wave}}.json
---

# Evaluate Generation {{wave}}

Score every training configuration in generation `{{wave}}` by spawning one `evaluate-candidate` child per `candidates/gen-{{wave}}/candidate-*.json` file, plus a final `consolidate` child that depends on every evaluator and merges per-candidate scores into `scored/gen-{{wave}}.json`.

Templates contain `{{wave}}/{{taskId}}/{{candidateId}}/{{candidateFile}}` placeholders that `converge spawn task --task-file` doesn't expand, so we pre-render each child into `.converge/tmp/evaluate-batch/gen-${WAVE}/` first:

```bash
WAVE="${CONVERGE_VAR_WAVE:-${CONVERGE_TASK_WAVE:-0}}"
TEMPLATES=".converge/playbooks/templates"
TMP=".converge/tmp/evaluate-batch/gen-${WAVE}"
CANDIDATES_DIR="candidates/gen-${WAVE}"
mkdir -p "${TMP}" >&2

EVAL_IDS=""
for FILE in "${CANDIDATES_DIR}"/candidate-*.json; do
  [ -f "${FILE}" ] || continue
  CID=$(jq -r '.id' "${FILE}")
  TID="eval-gen${WAVE}-${CID}"
  DST="${TMP}/${TID}.md"
  sed \
    -e "s|{{wave}}|${WAVE}|g" \
    -e "s|{{taskId}}|${TID}|g" \
    -e "s|{{candidateId}}|${CID}|g" \
    -e "s|{{candidateFile}}|${FILE}|g" \
    "${TEMPLATES}/evaluate-candidate/TASK.md" > "${DST}"
  converge spawn task --id "${TID}" --task-file "${DST}"
  EVAL_IDS="${EVAL_IDS} ${TID}"
done

# Final consolidate task — depends on every evaluator.
CONS_ID="consolidate-gen${WAVE}"
CONS_DST="${TMP}/${CONS_ID}.md"
sed -e "s|{{wave}}|${WAVE}|g" -e "s|{{taskId}}|${CONS_ID}|g" \
  "${TEMPLATES}/consolidate/TASK.md" > "${CONS_DST}"
DEP_FLAGS=""
for EID in ${EVAL_IDS}; do DEP_FLAGS="${DEP_FLAGS} --depends-on ${EID}"; done
converge spawn task --id "${CONS_ID}" --task-file "${CONS_DST}" ${DEP_FLAGS}
```

Playbook inputs (`trainingGoal`, `modelScale`, etc.) flow to children via the framework's `CONVERGE_VAR_*` env inheritance.
