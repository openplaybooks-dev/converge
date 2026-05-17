---
title: "Split: {{title}}"
description: "Extract widgets from {{title}} screen into local widgets/"
seed:
  mode: cli
tags:
  - split
  - screen-{{screenId}}
vars:
  screenId:
  title:
  screenPath:
  widgetsJsonPath:
  localWidgetsDir:
inputs:
  - "{{widgetsJsonPath}}"
outputs:
  - "{{localWidgetsDir}}/**/*.dart"
---

# Split: {{title}}

Extract each widget identified in `{{widgetsJsonPath}}` into its own file under `{{localWidgetsDir}}/` — one spawn per widget.

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
  I=$((I + 1))
  P=$(printf '%03d' "${I}")
  WID=$(echo "${W}"      | jq -r '.id // .name')
  WNAME=$(echo "${W}"    | jq -r '.name // .id')
  WIDGET_FILE="${LOCAL_DIR}/${WNAME}.dart"
  converge spawn template \
    --path "${TEMPLATES}/screen-widget-split/TASK.md" \
    --id "${SID}-split-${P}-${WID}" \
    --var "screenId=${SID}" \
    --var "screenTitle=${TITLE}" \
    --var "screenPath=${SCREEN_PATH}" \
    --var "widgetId=${WID}" \
    --var "widgetName=${WNAME}" \
    --var "widgetFile=${WIDGET_FILE}"
done < "${WIDGETS}"
```

If the widgets file is missing or empty, exit with no spawns.
