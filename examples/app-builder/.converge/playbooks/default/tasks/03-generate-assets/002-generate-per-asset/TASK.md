---
id: 002-generate-per-asset
title: Generate Per Asset
description: Spawn a spec, generation, and wiring pipeline for every declared image asset
seed:
  mode: cli
blocking: true
depends_on:
  - 001-analyze-assets
inputs:
  - .stitch/assets/manifest.json
outputs:
  - public/generated/**/*.png
---
# Generate Per Asset

```bash
TEMPLATES=".converge/playbooks/default/templates"
MANIFEST=".stitch/assets/manifest.json"

[ -f "${MANIFEST}" ] || exit 0
COUNT=$(jq 'if type == "array" then length else (.assets // []) | length end' "${MANIFEST}")
[ "${COUNT}" -gt 0 ] || exit 0

for I in $(seq 0 $((COUNT - 1))); do
  PREFIX=$(printf '%03d' $((I + 1)))
  A=$(jq -c "if type == \"array\" then .[${I}] else .assets[${I}] end" "${MANIFEST}")
  AID=$(echo "${A}" | jq -r '.id')
  NAME=$(echo "${A}" | jq -r '.name // .id')
  TYPE=$(echo "${A}" | jq -r '.type // "background"')
  OUTPUT=$(echo "${A}" | jq -r '.output')
  WIDTH=$(echo "${A}" | jq -r '.width // 1600')
  HEIGHT=$(echo "${A}" | jq -r '.height // 900')
  SCREENS=$(echo "${A}" | jq -r '(.screenIds // []) | join(", ")')
  SPEC=".stitch/assets/${AID}/SPEC.md"

  converge spawn template --path "${TEMPLATES}/asset-01-spec/TASK.md"     --id "${PREFIX}-${AID}-01-spec"     --var "assetId=${AID}" --var "assetName=${NAME}" --var "assetType=${TYPE}" --var "outputPath=${OUTPUT}" --var "width=${WIDTH}" --var "height=${HEIGHT}" --var "screenIds=${SCREENS}" --var "specPath=${SPEC}"
  converge spawn template --path "${TEMPLATES}/asset-02-generate/TASK.md" --id "${PREFIX}-${AID}-02-generate" --var "assetId=${AID}" --var "assetName=${NAME}" --var "assetType=${TYPE}" --var "outputPath=${OUTPUT}" --var "specPath=${SPEC}"
  converge spawn template --path "${TEMPLATES}/asset-03-wire/TASK.md"     --id "${PREFIX}-${AID}-03-wire"     --var "assetId=${AID}" --var "assetName=${NAME}" --var "assetType=${TYPE}" --var "outputPath=${OUTPUT}"
done
```

