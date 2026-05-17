---
id: "{{taskId}}"
title: "Spawn Sub-subtopics: {{subtopicName}}"
depends_on:
  - 002-decompose
seed:
  mode: cli
checks:
  - id: sub-subtopics-spawned
    cmd: "test -f {{artifactsDir}}/2-research/{{subtopicId}}-spawned.json"
    description: "Sub-subtopics spawned marker exists"
---

# Spawn Sub-subtopics for: {{subtopicName}}

Reads the decomposition decision and (recursively) spawns one child per sub-subtopic using the SAME `subtopic-task` template.

## Seed

Read the decompose decision and either (a) write a `spawned: 0` marker and emit zero spawns, or (b) recursively spawn one `subtopic-task` per sub-subtopic:

```bash
ARTIFACTS_DIR="${CONVERGE_VAR_ARTIFACTSDIR:-.converge/artifacts/${CONVERGE_PLAYBOOK:-deep-research}}"
SUBTOPIC_ID="${CONVERGE_VAR_SUBTOPICID:?subtopicId is required}"
DECOMPOSE="${ARTIFACTS_DIR}/2-research/${SUBTOPIC_ID}-decompose.json"
SPAWN_JSONL="${ARTIFACTS_DIR}/2-research/${SUBTOPIC_ID}-spawn.jsonl"
SPAWNED_MARKER="${ARTIFACTS_DIR}/2-research/${SUBTOPIC_ID}-spawned.json"
SUBTOPIC_TPL=".converge/playbooks/deep-research/templates/002-research-x/tasks/002-subtopic-research/templates/subtopic-task/TASK.md"
mkdir -p "${ARTIFACTS_DIR}/2-research"

SHOULD=$(jq -r '.shouldDecompose // false' "${DECOMPOSE}")
if [ "${SHOULD}" != "true" ]; then
  printf '{"subtopicId":"%s","spawned":0,"reason":"no decomposition needed"}\n' \
    "${SUBTOPIC_ID}" > "${SPAWNED_MARKER}"
  exit 0
fi

# Build spawn manifest.
jq -c --arg parentId "${SUBTOPIC_ID}" \
      --arg epoch "${CONVERGE_VAR_EPOCH}" \
      --arg question "${CONVERGE_VAR_QUESTION}" \
      --arg domain "${CONVERGE_VAR_DOMAIN}" \
      --arg maxEpochs "${CONVERGE_VAR_MAXEPOCHS:-3}" \
      --arg confidenceThreshold "${CONVERGE_VAR_CONFIDENCETHRESHOLD:-0.8}" \
  '.subSubtopics[] | {
     id: (.id // ($parentId + "-" + (.name | tostring))),
     vars: {
       subtopicId: (.id // ($parentId + "-" + (.name | tostring))),
       subtopicName: (.name // .id),
       subtopicDescription: (.description // ""),
       epoch: $epoch, question: $question, domain: $domain,
       maxEpochs: $maxEpochs, confidenceThreshold: $confidenceThreshold
     }
   }' "${DECOMPOSE}" > "${SPAWN_JSONL}"

COUNT=$(wc -l < "${SPAWN_JSONL}" | tr -d ' ')

while IFS= read -r ROW; do
  ID=$(echo "${ROW}" | jq -r '.id')
  ST_ID=$(echo "${ROW}"   | jq -r '.vars.subtopicId')
  ST_NAME=$(echo "${ROW}" | jq -r '.vars.subtopicName')
  ST_DESC=$(echo "${ROW}" | jq -r '.vars.subtopicDescription')
  converge spawn template \
    --path "${SUBTOPIC_TPL}" \
    --id "${ID}" \
    --var "taskId=${ID}" \
    --var "subtopicId=${ST_ID}" \
    --var "subtopicName=${ST_NAME}" \
    --var "subtopicDescription=${ST_DESC}" \
    --var "epoch=${CONVERGE_VAR_EPOCH}" \
    --var "question=${CONVERGE_VAR_QUESTION}" \
    --var "domain=${CONVERGE_VAR_DOMAIN}" \
    --var "maxEpochs=${CONVERGE_VAR_MAXEPOCHS:-3}" \
    --var "confidenceThreshold=${CONVERGE_VAR_CONFIDENCETHRESHOLD:-0.8}"
done < "${SPAWN_JSONL}"

printf '{"subtopicId":"%s","spawned":%s}\n' "${SUBTOPIC_ID}" "${COUNT}" > "${SPAWNED_MARKER}"
```

If `shouldDecompose: false`, the marker is written and zero spawns are emitted — return `done: true` in that case. Otherwise the recursion continues through the spawned `subtopic-task` instances until a downstream `002-decompose` returns `shouldDecompose: false`.
