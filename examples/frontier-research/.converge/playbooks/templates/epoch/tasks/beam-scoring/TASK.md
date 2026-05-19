---
id: "{{taskId}}"
title: "Beam scoring — epoch {{epoch}}"
depends_on:
  - 003-beam-execution
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


# Beam Scoring — Epoch {{epoch}}

Spawn one `beam-scoring-single` child per beam, scoring it on the 5 dimensions (novelty, evidence, coherence, depth, generativity).

Read `{{artifactsDir}}/beams.json` (beam definitions) and `{{artifactsDir}}/explorations/summary.json` (exploration results), then emit one `converge spawn template` line per beam:

```bash
ARTIFACTS_DIR=".converge/artifacts/${CONVERGE_PLAYBOOK:-frontier-research}/epoch-${CONVERGE_VAR_EPOCH}"
SUMMARY="${ARTIFACTS_DIR}/explorations/summary.json"

jq -c '.beams[]' "${ARTIFACTS_DIR}/beams.json" | while read -r BEAM; do
  BEAM_ID=$(echo "${BEAM}" | jq -r '.id')
  EXPLORATION=$(jq -c --arg id "${BEAM_ID}" '
    if (.beams? | type) == "array"  then (.beams[] | select(.beamId == $id or .id == $id))
    elif (type) == "array"          then (.[]      | select(.beamId == $id or .id == $id))
    elif has($id)                   then .[$id]
    else empty end
  ' "${SUMMARY}" | head -n 1)
  converge spawn template \
    --path .converge/playbooks/templates/beam-scoring-single/TASK.md \
    --id "epoch-${CONVERGE_VAR_EPOCH}-score-${BEAM_ID}" \
    --var "epoch=${CONVERGE_VAR_EPOCH}" \
    --var "beamId=${BEAM_ID}" \
    --var "beamJson=${BEAM}" \
    --var "explorationJson=${EXPLORATION}"
done
```

Emit every line of stdout as a `converge spawn` command.

## Consolidation

After all per-beam scoring children finish, read every `{{artifactsDir}}/scores/beam-<id>.json` and write a merged `{{artifactsDir}}/scores/summary.json` (ranked by composite score) so the downstream selection-merge phase has a single file to consume.
