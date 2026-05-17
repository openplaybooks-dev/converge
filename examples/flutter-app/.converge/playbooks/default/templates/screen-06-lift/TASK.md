---
title: "Lift: {{title}}"
description: "Lift shared widgets from {{title}} to lib/widgets/"
seed:
  mode: cli
blocking: true
tags:
  - lift
  - screen-{{screenId}}
vars:
  screenId:
  title:
  screenPath:
  widgetsJsonPath:
  localWidgetsDir:
inputs:
  - "{{widgetsJsonPath}}"
  - "{{localWidgetsDir}}/**/*.dart"
outputs:
  - lib/widgets/**/*.dart
---

# Lift: {{title}}

Lift each widget in `{{localWidgetsDir}}/` marked `shared: true` in `{{widgetsJsonPath}}` to `lib/widgets/` — one spawn per shared widget.

```bash
TEMPLATES=".converge/playbooks/default/templates"
WIDGETS="{{widgetsJsonPath}}"
LOCAL_DIR="{{localWidgetsDir}}"
SCREEN_PATH="{{screenPath}}"
SID="{{screenId}}"
TITLE="{{title}}"

[ -f "${WIDGETS}" ] || exit 0

I=0
while IFS= read -r W; do
  [ -z "${W}" ] && continue
  SHARED=$(echo "${W}" | jq -r '.shared // false')
  [ "${SHARED}" = "true" ] || continue
  I=$((I + 1))
  P=$(printf '%03d' "${I}")
  WID=$(echo "${W}"   | jq -r '.id // .name')
  WNAME=$(echo "${W}" | jq -r '.name // .id')
  LOCAL_FILE="${LOCAL_DIR}/${WNAME}.dart"
  SHARED_FILE="lib/widgets/${WNAME}.dart"
  converge spawn template \
    --path "${TEMPLATES}/screen-widget-lift/TASK.md" \
    --id "${SID}-lift-${P}-${WID}" \
    --var "screenId=${SID}" \
    --var "screenTitle=${TITLE}" \
    --var "screenPath=${SCREEN_PATH}" \
    --var "widgetId=${WID}" \
    --var "widgetName=${WNAME}" \
    --var "localFile=${LOCAL_FILE}" \
    --var "sharedFile=${SHARED_FILE}"
done < "${WIDGETS}"
```

If no widgets are shared (or the file is missing/empty), exit with no spawns.
