---
id: 003-wire-per-screen
title: "Wire Per Screen — Fix All Handlers"
description: Two-level CLI seed — spawns one parent per screen, then one child per broken interactive element
references:
  - flutter-implementing-navigation-and-routing
  - flutter-managing-state
  - flutter-building-forms
seed:
  mode: cli
blocking: true
depends_on:
  - 002-analyze-navigations
tags:
  - navigation
  - interactions
  - wiring
inputs:
  - navigations.json
  - lib/router/app_router.dart
outputs:
  - lib/screens/**/*.dart
  - lib/widgets/**/*.dart
---

# Wire Per Screen

Two-level fan-out from `navigations.json`: one `wire-screen` parent per screen that has unwired elements, plus one `wire-element` child per unwired element.

```bash
TEMPLATES=".converge/playbooks/default/templates"
[ -f navigations.json ] || exit 0

# Build screen-level groups (only screens with at least one unwired element).
SCREENS=$(jq -c '
  .screens // .
  | map({
      screenId: (.screenId // .id),
      title: (.title // .screenId // .id),
      file: (.file // ""),
      elements: ((.elements // []) | map(select((.status // "") != "wired")))
    })
  | map(select(.elements | length > 0))
' navigations.json)

COUNT=$(echo "${SCREENS}" | jq 'length')
[ "${COUNT}" -gt 0 ] || exit 0

for I in $(seq 0 $((COUNT - 1))); do
  P=$(printf '%03d' $((I + 1)))
  S=$(echo "${SCREENS}" | jq -c ".[${I}]")
  SID=$(echo "${S}"   | jq -r '.screenId')
  TITLE=$(echo "${S}" | jq -r '.title')
  FILE=$(echo "${S}"  | jq -r '.file')
  ELEMS_COUNT=$(echo "${S}" | jq '.elements | length')

  converge spawn template \
    --path "${TEMPLATES}/wire-screen/TASK.md" \
    --id "${P}-${SID}-wire-screen" \
    --var "screenId=${SID}" \
    --var "title=${TITLE}" \
    --var "screenFile=${FILE}"

  for J in $(seq 0 $((ELEMS_COUNT - 1))); do
    Q=$(printf '%03d' $((J + 1)))
    E=$(echo "${S}" | jq -c ".elements[${J}]")
    EID=$(echo "${E}"     | jq -r '.id // .elementId')
    ETYPE=$(echo "${E}"   | jq -r '.type // ""')
    EWIDGET=$(echo "${E}" | jq -r '.widget // ""')
    EFILE=$(echo "${E}"   | jq -r '.file // empty')
    [ -z "${EFILE}" ] && EFILE="${FILE}"
    EACTION=$(echo "${E}" | jq -r '.action // ""')
    ETARGET=$(echo "${E}" | jq -r '.target // ""')
    ESTATUS=$(echo "${E}" | jq -r '.status // ""')
    BODY="Wire ${EWIDGET} (${ETYPE}) at ${EFILE}: status=${ESTATUS}, action=${EACTION}, target=${ETARGET}."

    converge spawn template \
      --path "${TEMPLATES}/wire-element/TASK.md" \
      --id "${P}-${SID}-${Q}-${EID}" \
      --var "screenId=${SID}" \
      --var "elementId=${EID}" \
      --var "elementType=${ETYPE}" \
      --var "elementWidget=${EWIDGET}" \
      --var "file=${EFILE}" \
      --var "body=${BODY}"
  done
done
```

If `navigations.json` is missing or every element is already wired, exit with no spawns.
