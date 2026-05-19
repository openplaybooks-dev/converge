---
id: 002-build-per-screen
title: Build Per Screen
description: Spawn a spec, design, convert, split, and route-mount pipeline for every route-level screen
mode: spawner
spawn:
  min_children: 1
blocking: true
depends_on:
  - 001-scaffold-react-app
inputs:
  - .stitch/screens.json
  - .stitch/system/DESIGN.md
  - .stitch/assets/manifest.json
outputs:
  - src/screens/**/*.tsx
  - src/components/**/*.tsx
  - src/app/router.tsx
---
<!-- MIGRATION (RFC 0021/0022): The legacy `converge spawn template`
     calls below should be replaced with a JSONL manifest writer:

       cat > "$CONVERGE_TASK_DIR/spawn.plan.jsonl" <<'EOF'
       {"id":"child-1","template":".../TASK.md","vars":{"k":"v"}}
       EOF

     The framework calls `converge apply` after the body when
     `mode: spawner` is declared (apply: auto, default).
     See docs/rfcs/0021-declarative-spawn-apply.md. -->

# Build Per Screen

```bash
TEMPLATES=".converge/playbooks/default/templates"
SCREENS_JSON=".stitch/screens.json"

[ -f "${SCREENS_JSON}" ] || exit 1
COUNT=$(jq 'if type == "array" then length else (.screens // []) | length end' "${SCREENS_JSON}")
[ "${COUNT}" -gt 0 ] || exit 1

for I in $(seq 0 $((COUNT - 1))); do
  PREFIX=$(printf '%03d' $((I + 1)))
  S=$(jq -c "if type == \"array\" then .[${I}] else .screens[${I}] end" "${SCREENS_JSON}")
  SID=$(echo "${S}" | jq -r '.id')
  TITLE=$(echo "${S}" | jq -r '.title')
  ROUTE=$(echo "${S}" | jq -r '.route')
  COMPONENT=$(echo "${SID}" | awk -F'[-_]' '{ s=\"\"; for (i=1;i<=NF;i++){ if (length($i)>0) s = s toupper(substr($i,1,1)) tolower(substr($i,2)) } print s }')
  SNAKE=$(echo "${SID}" | tr '[:upper:]' '[:lower:]' | tr '-' '_')
  SPEC=".stitch/designs/${SID}/SPEC.md"
  META=".stitch/designs/${SID}/META.md"
  HTML=".stitch/designs/${SID}/design.html"
  SCREEN_PATH="src/screens/${SNAKE}/${COMPONENT}Screen.tsx"
  LOCAL_COMPONENTS="src/screens/${SNAKE}/components"

  converge spawn template --path "${TEMPLATES}/screen-01-spec/TASK.md"    --id "${PREFIX}-${SID}-01-spec"    --var "screenId=${SID}" --var "title=${TITLE}" --var "route=${ROUTE}" --var "componentName=${COMPONENT}" --var "specPath=${SPEC}"
  converge spawn template --path "${TEMPLATES}/screen-02-design/TASK.md"  --id "${PREFIX}-${SID}-02-design"  --var "screenId=${SID}" --var "title=${TITLE}" --var "route=${ROUTE}" --var "specPath=${SPEC}" --var "metaPath=${META}" --var "designPath=${HTML}"
  converge spawn template --path "${TEMPLATES}/screen-03-convert/TASK.md" --id "${PREFIX}-${SID}-03-convert" --var "screenId=${SID}" --var "title=${TITLE}" --var "route=${ROUTE}" --var "componentName=${COMPONENT}" --var "specPath=${SPEC}" --var "designPath=${HTML}" --var "screenPath=${SCREEN_PATH}"
  converge spawn template --path "${TEMPLATES}/screen-04-split/TASK.md"   --id "${PREFIX}-${SID}-04-split"   --var "screenId=${SID}" --var "title=${TITLE}" --var "screenPath=${SCREEN_PATH}" --var "componentsDir=${LOCAL_COMPONENTS}"
  converge spawn template --path "${TEMPLATES}/screen-05-route/TASK.md"   --id "${PREFIX}-${SID}-05-route"   --var "screenId=${SID}" --var "title=${TITLE}" --var "route=${ROUTE}" --var "componentName=${COMPONENT}" --var "screenPath=${SCREEN_PATH}"
done
```

