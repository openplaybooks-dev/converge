---
id: 03-build-screens
title: Build Screens
description: Per-screen vertical pipeline — spec, design HTML, Flutter widgets, analyze, split, lift — for every screen in screens.json
references:
  - flutter-building-layouts
  - flutter-animating-apps
  - flutter-improving-accessibility
seed:
  mode: cli
blocking: true
depends_on:
  - 02-design-system
tags:
  - screens
  - flutter
inputs:
  - .stitch/screens.json
  - .stitch/system/DESIGN.md
  - .stitch/UX.md
outputs:
  - lib/screens/**/*.dart
  - lib/widgets/**/*.dart
  - lib/router/app_router.dart
checks:
  - id: screens-json-exists
    cmd: test -f .stitch/screens.json
    description: Screen definitions exist
  - id: screens-created
    cmd: find lib/screens -name '*.dart' -type f | wc -l | awk '{if ($1 > 0) exit 0; exit 1}'
    description: At least one screen widget was created
  - id: dart-analysis-valid
    cmd: dart analyze lib/
    description: All generated code passes analysis
backlogs:
  - id: noop-buttons
    cmd: "grep -rn 'onPressed: null' lib/screens/ lib/widgets/ 2>/dev/null | grep -v 'disabled' || true"
    description: Buttons with null onPressed (non-functional)
    severity: high
  - id: placeholder-text
    cmd: "grep -rn 'Lorem\\|placeholder\\|TODO\\|FIXME\\|Coming soon\\|TBD' lib/screens/ lib/widgets/ 2>/dev/null || true"
    description: Placeholder or TODO text left in UI
    severity: medium
  - id: hardcoded-strings
    cmd: "grep -rn \"Text('.*[A-Z].*')\" lib/screens/ 2>/dev/null | head -20 || true"
    description: Hardcoded display strings in screens
    severity: low
---

# Build Screens

Spawn a 6-step pipeline (spec, design, convert, analyze, split, lift) per screen in `.stitch/screens.json`. Filter to entries whose `route` starts with `/` (drop overlay entries).

```bash
TEMPLATES=".converge/playbooks/default/templates"
SCREENS_JSON=".stitch/screens.json"

# Accept either a top-level array or { "screens": [...] }, then filter to "/" routes.
SCREENS=$(jq -c '
  (if type == "array" then . else .screens end)
  | map(select(.route | startswith("/")))
' "${SCREENS_JSON}")

COUNT=$(echo "${SCREENS}" | jq 'length')
[ "${COUNT}" -gt 0 ] || { echo "no screens with route starting with /" >&2; exit 1; }

for I in $(seq 0 $((COUNT - 1))); do
  PREFIX=$(printf '%03d' $((I + 1)))
  S=$(echo "${SCREENS}" | jq -c ".[${I}]")
  SID=$(echo "${S}"   | jq -r '.id')
  TITLE=$(echo "${S}" | jq -r '.title')
  ROUTE=$(echo "${S}" | jq -r '.route')
  # PascalCase: split on -/_, capitalize each piece, join.
  WIDGET=$(echo "${SID}" | awk -F'[-_]' '{ s=""; for (i=1;i<=NF;i++){ if (length($i)>0) s = s toupper(substr($i,1,1)) tolower(substr($i,2)) } print s }')
  # snake_case: replace - with _, lowercase.
  SNAKE=$(echo "${SID}" | tr '[:upper:]' '[:lower:]' | tr '-' '_')
  SCREEN_PATH="lib/screens/${SNAKE}/${SNAKE}_screen.dart"
  LOCAL_WIDGETS_DIR="lib/screens/${SNAKE}/_widgets"
  WIDGETS_JSON=".stitch/designs/${SID}/widgets.jsonl"
  SPEC=".stitch/designs/${SID}/SPEC.md"
  META=".stitch/designs/${SID}/META.md"
  DESIGN=".stitch/designs/${SID}/design.html"

  converge spawn template --path "${TEMPLATES}/screen-01-spec/TASK.md"    --id "${PREFIX}-${SID}-01-spec"    --var "screenId=${SID}" --var "title=${TITLE}" --var "route=${ROUTE}" --var "widgetName=${WIDGET}" --var "specPath=${SPEC}"
  converge spawn template --path "${TEMPLATES}/screen-02-design/TASK.md"  --id "${PREFIX}-${SID}-02-design"  --var "screenId=${SID}" --var "title=${TITLE}" --var "specPath=${SPEC}" --var "metaPath=${META}" --var "designPath=${DESIGN}"
  converge spawn template --path "${TEMPLATES}/screen-03-convert/TASK.md" --id "${PREFIX}-${SID}-03-convert" --var "screenId=${SID}" --var "title=${TITLE}" --var "route=${ROUTE}" --var "widgetName=${WIDGET}" --var "specPath=${SPEC}" --var "designPath=${DESIGN}" --var "screenPath=${SCREEN_PATH}"
  converge spawn template --path "${TEMPLATES}/screen-04-analyze/TASK.md" --id "${PREFIX}-${SID}-04-analyze" --var "screenId=${SID}" --var "title=${TITLE}" --var "screenPath=${SCREEN_PATH}" --var "widgetsJsonPath=${WIDGETS_JSON}"
  converge spawn template --path "${TEMPLATES}/screen-05-split/TASK.md"   --id "${PREFIX}-${SID}-05-split"   --var "screenId=${SID}" --var "title=${TITLE}" --var "screenPath=${SCREEN_PATH}" --var "widgetsJsonPath=${WIDGETS_JSON}" --var "localWidgetsDir=${LOCAL_WIDGETS_DIR}"
  converge spawn template --path "${TEMPLATES}/screen-06-lift/TASK.md"    --id "${PREFIX}-${SID}-06-lift"    --var "screenId=${SID}" --var "title=${TITLE}" --var "screenPath=${SCREEN_PATH}" --var "widgetsJsonPath=${WIDGETS_JSON}" --var "localWidgetsDir=${LOCAL_WIDGETS_DIR}"
done
```
