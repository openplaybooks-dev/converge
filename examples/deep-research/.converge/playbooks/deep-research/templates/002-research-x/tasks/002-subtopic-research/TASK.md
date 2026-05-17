---
id: "{{taskId}}"
title: "Sub-topic Research — Epoch {{epoch}}"
depends_on:
  - 001-subtopic-split
seed:
  mode: cli
vars:
  epoch:
  question:
  domain:
  maxEpochs:
  confidenceThreshold:
checks:
  - id: subtopics-spawned
    cmd: "test -f {{artifactsDir}}/2-research/epoch-{{epoch}}-subtopic-spawn.jsonl"
    description: "spawn JSONL was written"
---

# Sub-topic Research — Epoch {{epoch}}

Spawn one parallel research child per sub-topic identified by `001-subtopic-split`.

## Seed

Read `{{artifactsDir}}/1-initial/subtopics.json` (written by `001-subtopic-split`), write the spawn manifest at `{{artifactsDir}}/2-research/epoch-{{epoch}}-subtopic-spawn.jsonl` (satisfies the `subtopics-spawned` check), and emit one `converge spawn template` line per subtopic instantiating the `subtopic-task` template:

```bash
ARTIFACTS_DIR="${CONVERGE_VAR_ARTIFACTSDIR:-.converge/artifacts/${CONVERGE_PLAYBOOK:-deep-research}}"
EPOCH="${CONVERGE_VAR_EPOCH:?epoch is required}"
SUBTOPICS="${ARTIFACTS_DIR}/1-initial/subtopics.json"
MANIFEST="${ARTIFACTS_DIR}/2-research/epoch-${EPOCH}-subtopic-spawn.jsonl"
SUBTOPIC_TPL=".converge/playbooks/deep-research/templates/002-research-x/tasks/002-subtopic-research/templates/subtopic-task/TASK.md"
mkdir -p "${ARTIFACTS_DIR}/2-research"

# Build spawn manifest (satisfies the subtopics-spawned check).
jq -c --arg epoch "${EPOCH}" \
      --arg question "${CONVERGE_VAR_QUESTION}" \
      --arg domain "${CONVERGE_VAR_DOMAIN}" \
      --arg maxEpochs "${CONVERGE_VAR_MAXEPOCHS:-3}" \
      --arg confidenceThreshold "${CONVERGE_VAR_CONFIDENCETHRESHOLD:-0.8}" \
  '.subtopics[] | {
     id: ("epoch-" + $epoch + "-subtopic-" + .id),
     vars: {
       epoch: $epoch,
       subtopicId: .id,
       subtopicName: (.subtopic // .name // .id),
       subtopicDescription: (.scope // .description // ""),
       question: $question, domain: $domain,
       maxEpochs: $maxEpochs, confidenceThreshold: $confidenceThreshold
     }
   }' "${SUBTOPICS}" > "${MANIFEST}"

# Emit spawn lines.
while IFS= read -r ROW; do
  ID=$(echo "${ROW}" | jq -r '.id')
  ST_ID=$(echo "${ROW}"   | jq -r '.vars.subtopicId')
  ST_NAME=$(echo "${ROW}" | jq -r '.vars.subtopicName')
  ST_DESC=$(echo "${ROW}" | jq -r '.vars.subtopicDescription')
  converge spawn template \
    --path "${SUBTOPIC_TPL}" \
    --id "${ID}" \
    --var "taskId=${ID}" \
    --var "epoch=${EPOCH}" \
    --var "subtopicId=${ST_ID}" \
    --var "subtopicName=${ST_NAME}" \
    --var "subtopicDescription=${ST_DESC}" \
    --var "question=${CONVERGE_VAR_QUESTION}" \
    --var "domain=${CONVERGE_VAR_DOMAIN}" \
    --var "maxEpochs=${CONVERGE_VAR_MAXEPOCHS:-3}" \
    --var "confidenceThreshold=${CONVERGE_VAR_CONFIDENCETHRESHOLD:-0.8}"
done < "${MANIFEST}"
```

If no subtopics are present and stdout is empty, return `done: true`.
