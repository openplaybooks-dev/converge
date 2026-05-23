#!/usr/bin/env bash
# Deterministic 100-item catalog generator
set -euo pipefail

TARGET_DIR="${1:-.}"
OUT="$TARGET_DIR/catalog.json"

CATEGORIES=(grassland forest desert tundra wetland)

echo "[" > "$OUT"
for i in $(seq 1 100); do
  PADDED=$(printf "%03d" "$i")
  CAT_IDX=$(( (i - 1) % 5 ))
  CAT="${CATEGORIES[$CAT_IDX]}"
  # Capitalize first letter
  CAT_NAME="$(echo "${CAT:0:1}" | tr '[:lower:]' '[:upper:]')${CAT:1}"

  COMMA=","
  [ "$i" -eq 100 ] && COMMA=""

  cat >> "$OUT" <<EOF
  {"id": "item-${PADDED}", "name": "${CAT_NAME} ${PADDED}", "category": "${CAT}"}${COMMA}
EOF
done
echo "]" >> "$OUT"

echo "Generated $OUT with 100 items"
