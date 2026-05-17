---
id: 07-build-overlays
title: Build Overlays — Spec, Design, Convert, Connect, Mount
description: Per-overlay pipeline for dynamic views (bottom sheets, dialogs, persistent bars)
references:
  - flutter-implementing-navigation-and-routing
  - flutter-animating-apps
seed:
  mode: cli
blocking: true
depends_on:
  - 03-build-screens
tags:
  - overlays
  - flutter
inputs:
  - .stitch/screens.json
  - .stitch/SITE.md
  - .stitch/system/DESIGN.md
  - .stitch/UX.md
outputs:
  - lib/widgets/overlays/**/*.dart
checks:
  - id: overlays-created
    cmd: find lib/widgets/overlays -name '*.dart' 2>/dev/null | wc -l | awk '{if ($1 >= 2) exit 0; exit 1}'
    description: At least 2 overlay widgets were created
  - id: dart-analysis-valid
    cmd: dart analyze lib/
    description: All generated code passes analysis
---

# Build Overlays

Per-overlay 5-step pipeline (spec, design, convert, connect, mount) for each overlay entry in `.stitch/screens.json` (entries whose `route` starts with `overlay:`).

```bash
TEMPLATES=".converge/playbooks/default/templates"
SCREENS_JSON=".stitch/screens.json"
[ -f "${SCREENS_JSON}" ] || exit 0

OVERLAYS=$(jq -c '
  (if type == "array" then . else .screens end)
  | map(select(.route | startswith("overlay:")))
' "${SCREENS_JSON}")

COUNT=$(echo "${OVERLAYS}" | jq 'length')
[ "${COUNT}" -gt 0 ] || exit 0

for I in $(seq 0 $((COUNT - 1))); do
  PREFIX=$(printf '%03d' $((I + 1)))
  O=$(echo "${OVERLAYS}" | jq -c ".[${I}]")
  OID=$(echo "${O}"   | jq -r '.id')
  TITLE=$(echo "${O}" | jq -r '.title')
  ROUTE=$(echo "${O}" | jq -r '.route')
  WIDGET=$(echo "${OID}" | awk -F'[-_]' '{ s=""; for (i=1;i<=NF;i++){ if (length($i)>0) s = s toupper(substr($i,1,1)) tolower(substr($i,2)) } print s }')
  SNAKE=$(echo "${OID}" | tr '[:upper:]' '[:lower:]' | tr '-' '_')

  for STEP in 01-spec 02-design 03-convert 04-connect 05-mount; do
    converge spawn template \
      --path "${TEMPLATES}/overlay-${STEP}/TASK.md" \
      --id "${PREFIX}-${OID}-${STEP}" \
      --var "overlayId=${OID}" \
      --var "title=${TITLE}" \
      --var "route=${ROUTE}" \
      --var "widgetName=${WIDGET}" \
      --var "fileBaseName=${SNAKE}"
  done
done
```

If no overlay entries exist, exit with no spawns.
