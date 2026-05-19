---
id: 04-generate-assets
title: Generate Assets — Icons, Illustrations & Images
description: Two-phase asset pipeline — analyze app to discover needed assets, then generate and wire each one
mode: spawner
spawn:
  min_children: 1
blocking: true
depends_on:
  - 03-build-screens
tags:
  - assets
  - svg
  - illustrations
  - icons
inputs:
  - .stitch/screens.json
  - .stitch/system/DESIGN.md
  - lib/screens/**/*.dart
  - lib/models/*.dart
outputs:
  - assets/**/*.svg
  - assets/**/*.png
checks:
  - id: assets-json-exists
    cmd: test -f assets.json
    description: Asset manifest was created by analysis step
  - id: assets-directory-exists
    cmd: test -d assets/
    description: Asset output directory exists
  - id: svgs-generated
    cmd: find assets -name '*.svg' -type f | wc -l | awk '{if ($1 >= 1) exit 0; exit 1}'
    description: At least 1 SVG asset generated
  - id: flutter-validate
    cmd: flutter pub get && dart analyze lib/
    description: Flutter project validates with new assets
---
<!-- MIGRATION (RFC 0021/0022): The legacy `converge spawn template`
     calls below should be replaced with a JSONL manifest writer:

       cat > "$CONVERGE_TASK_DIR/spawn.plan.jsonl" <<'EOF'
       {"id":"child-1","template":".../TASK.md","vars":{"k":"v"}}
       EOF

     The framework calls `converge apply` after the body when
     `mode: spawner` is declared (apply: auto, default).
     See docs/rfcs/0021-declarative-spawn-apply.md. -->


# Generate Assets — Icons, Illustrations & Images

Per-asset 3-step pipeline (spec, generate, wire) for every asset in `assets.json`.

```bash
TEMPLATES=".converge/playbooks/default/templates"
[ -f assets.json ] || exit 0
COUNT=$(jq 'if type == "array" then length else (.assets // []) | length end' assets.json)
[ "${COUNT}" -gt 0 ] || exit 0

for I in $(seq 0 $((COUNT - 1))); do
  PREFIX=$(printf '%03d' $((I + 1)))
  A=$(jq -c "if type == \"array\" then .[${I}] else .assets[${I}] end" assets.json)
  AID=$(echo "${A}"   | jq -r '.id')
  NAME=$(echo "${A}"  | jq -r '.name // .id')
  TYPE=$(echo "${A}"  | jq -r '.type // "svg"')
  OUTPUT=$(echo "${A}"| jq -r '.output // .path // empty')

  converge spawn template --path "${TEMPLATES}/asset-01-spec/TASK.md"     --id "${PREFIX}-${AID}-01-spec"     --var "assetId=${AID}" --var "assetName=${NAME}" --var "assetType=${TYPE}" --var "outputPath=${OUTPUT}"
  converge spawn template --path "${TEMPLATES}/asset-02-generate/TASK.md" --id "${PREFIX}-${AID}-02-generate" --var "assetId=${AID}" --var "assetName=${NAME}" --var "assetType=${TYPE}" --var "outputPath=${OUTPUT}"
  converge spawn template --path "${TEMPLATES}/asset-03-wire/TASK.md"     --id "${PREFIX}-${AID}-03-wire"     --var "assetId=${AID}" --var "assetName=${NAME}" --var "assetType=${TYPE}" --var "outputPath=${OUTPUT}"
done
```

If `assets.json` is missing or empty, exit with no spawns.
