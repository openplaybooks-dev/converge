---
id: frontier-research
title: Frontier research pipeline
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
