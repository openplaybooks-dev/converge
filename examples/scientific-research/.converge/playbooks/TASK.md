---
id: scientific-research
title: Scientific research pipeline
seed:
  mode: cli
---

# Scientific Research Pipeline

Each loop iteration spawns one epoch task that runs the full 8-phase research cycle:

1. **Literature** — incremental literature search, prior state
2. **Hypothesize** — Bayesian hypothesis formulation and updating
3. **Experiment** — per-hypothesis structured experiments
4. **Statistical Analysis** — effect sizes, CIs, meta-analysis
5. **Evidence Synthesis** — GRADE methodology assessment
6. **Contradiction Resolution** — systematic conflict resolution
7. **Paper Draft** — academic paper with 8 sections
8. **Convergence Check** — quality scoring, continue/stop decision

Evidence accumulates across epochs. Bayesian priors update. The loop stops when quality thresholds are met and improvement plateaus.

## Spawn one epoch per iteration

Read `CONVERGE_TASK_WAVE` and the playbook input vars and emit exactly one `converge spawn template` line:

```bash
EPOCH="${CONVERGE_TASK_WAVE:-1}"
converge spawn template \
  --path .converge/playbooks/templates/epoch/TASK.md \
  --id "epoch-${EPOCH}" \
  --var "epoch=${EPOCH}" \
  --var "question=${CONVERGE_VAR_QUESTION}" \
  --var "domain=${CONVERGE_VAR_DOMAIN:-general}" \
  --var "targetScore=${CONVERGE_VAR_TARGETSCORE:-70}"
```

Do not modify the command. Do not add or omit lines.

The spawned epoch task auto-discovers its 8 phase subtasks from `templates/epoch/tasks/` and runs them sequentially via their `depends_on` chain.
