---
id: scientific-research
title: Scientific research pipeline
mode: converger
converge:
  max_waves: 30
  # halt_when: deterministic checks; replaces seed-era keepLooping=false.
  halt_when:
    - id: epoch-done
      cmd: 'test -f "$CONVERGE_TASK_DIR/halt.marker"'

---
<!-- MIGRATION (RFC 0021/0022): The legacy `converge spawn template`
     calls below should be replaced with a JSONL manifest writer:

       cat > "$CONVERGE_TASK_DIR/spawn.plan.jsonl" <<'EOF'
       {"id":"child-1","template":".../TASK.md","vars":{"k":"v"}}
       EOF

     The framework calls `converge apply` after the body when
     `mode: spawner` is declared (apply: auto, default).
     See docs/rfcs/0021-declarative-spawn-apply.md. -->


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
