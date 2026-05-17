---
title: LLM Training Configuration Evolution
seed:
  mode: cli
blocking: true
---

Evolve LLM training configurations through iterative generation, evaluation, selection, and crossover. Each wave of this task is one generation: wave 0 seeds → evaluates → selects; later waves crossover → evaluate → select; when the best candidate's fitness reaches `fitnessThreshold`, a final report is spawned instead.

Decide the wave's branch from `CONVERGE_TASK_WAVE` and `best-candidate.json`, then emit the right `converge spawn task` lines. Templates contain `{{wave}}/{{taskId}}` placeholders; `converge spawn task --task-file` doesn't expand them, so we pre-render each into `.converge/tmp/seed/wave-${WAVE}/` first.

```bash
WAVE="${CONVERGE_TASK_WAVE:-0}"
THRESHOLD="${CONVERGE_VAR_FITNESSTHRESHOLD:-0.9}"
TEMPLATES=".converge/playbooks/templates"
TMP=".converge/tmp/seed/wave-${WAVE}"
mkdir -p "${TMP}" >&2

# render <template-name> <task-id> → echo rendered path
render() {
  local src="${TEMPLATES}/$1/TASK.md"
  local dst="${TMP}/$2.md"
  sed -e "s/{{wave}}/${WAVE}/g" -e "s/{{taskId}}/$2/g" "${src}" > "${dst}"
  printf '%s\n' "${dst}"
}

# Convergence: best-candidate.json.fitness >= THRESHOLD
CONVERGED=0
if [ -f best-candidate.json ]; then
  FIT=$(jq -r '.fitness // empty' best-candidate.json)
  if [ -n "${FIT}" ] && awk -v f="${FIT}" -v t="${THRESHOLD}" 'BEGIN { exit !(f+0 >= t+0) }'; then
    CONVERGED=1
  fi
fi

if [ "${CONVERGED}" = "1" ]; then
  REPORT=$(render report 001-report)
  converge spawn task --id 001-report --task-file "${REPORT}"
elif [ -z "${WAVE}" ] || [ "${WAVE}" = "0" ]; then
  SEED=$(render seed           001-seed)
  EVAL=$(render evaluate-batch 002-evaluate)
  SEL=$(render select          003-select)
  converge spawn task --id 001-seed     --task-file "${SEED}"
  converge spawn task --id 002-evaluate --task-file "${EVAL}" --depends-on 001-seed
  converge spawn task --id 003-select   --task-file "${SEL}"  --depends-on 002-evaluate
else
  CROSS=$(render crossover      001-crossover)
  EVAL=$(render evaluate-batch 002-evaluate)
  SEL=$(render select          003-select)
  converge spawn task --id 001-crossover --task-file "${CROSS}"
  converge spawn task --id 002-evaluate  --task-file "${EVAL}" --depends-on 001-crossover
  converge spawn task --id 003-select    --task-file "${SEL}"  --depends-on 002-evaluate
fi
```

Each child inherits playbook inputs (`trainingGoal`, `modelScale`, `populationSize`, `topK`, `fitnessThreshold`) via the framework's `CONVERGE_VAR_*` env inheritance.
