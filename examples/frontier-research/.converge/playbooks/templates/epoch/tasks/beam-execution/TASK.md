---
id: "{{taskId}}"
title: "Beam execution — epoch {{epoch}}"
depends_on:
  - 002-beam-spawning
mode: spawner
spawn:
  min_children: 1

---
<!-- MIGRATION (RFC 0021/0022): The legacy `converge spawn template`
     calls below should be replaced with a JSONL manifest writer:

       cat > "$CONVERGE_TASK_DIR/spawn.plan.jsonl" <<'EOF'
       {"id":"child-1","template":".../TASK.md","vars":{"k":"v"}}
       EOF

     The framework calls `converge apply` after the body when
     `mode: spawner` is declared (apply: auto, default).
     See docs/rfcs/0021-declarative-spawn-apply.md. -->


# Beam Execution — Epoch {{epoch}}

Spawn one `beam-exploration` child per beam defined in `{{artifactsDir}}/beams.json`.

Read the beam definitions and emit one `converge spawn template` line per beam, pointing at the `beam-exploration` template and threading `epoch`, `beamId`, and the beam object as `beamJson`:

```bash
ARTIFACTS_DIR=".converge/artifacts/${CONVERGE_PLAYBOOK:-frontier-research}/epoch-${CONVERGE_VAR_EPOCH}"
jq -c '.beams[]' "${ARTIFACTS_DIR}/beams.json" | while read -r BEAM; do
  BEAM_ID=$(echo "${BEAM}" | jq -r '.id')
  converge spawn template \
    --path .converge/playbooks/templates/beam-exploration/TASK.md \
    --id "epoch-${CONVERGE_VAR_EPOCH}-explore-${BEAM_ID}" \
    --var "epoch=${CONVERGE_VAR_EPOCH}" \
    --var "beamId=${BEAM_ID}" \
    --var "beamJson=${BEAM}"
done
```

Emit every line of stdout as a `converge spawn` command. Do not modify the spawn invocation.

## Consolidation

After all per-beam children finish, read every `{{artifactsDir}}/explorations/beam-<id>.json` they produced and write a merged `{{artifactsDir}}/explorations/summary.json` so the downstream beam-scoring phase has a single file to consume.
