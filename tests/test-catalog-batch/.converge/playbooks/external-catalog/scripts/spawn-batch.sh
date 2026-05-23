#!/usr/bin/env bash
# External batch spawning script.
# Usage: spawn-batch.sh <catalog.json> <playbook-root>
set -euo pipefail

CATALOG="$1"
PLAYBOOK_ROOT="$2"

mkdir -p "$PLAYBOOK_ROOT/output/catalog-item"

# Generate JSONL from catalog
JSONL=$(mktemp)
> "$JSONL"
while IFS= read -r line; do
  # Skip lines that are just [ or ]
  echo "$line" | grep -qE '^\s*[\[\]]' && continue

  ID=$(echo "$line" | grep -o '"id"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)".*/\1/')
  NAME=$(echo "$line" | grep -o '"name"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)".*/\1/')
  CAT=$(echo "$line" | grep -o '"category"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)".*/\1/')

  # Skip empty lines
  [ -z "$ID" ] && continue

  printf '{"id":"%s","template":"catalog-item","vars":{"item_id":"%s","item_name":"%s","item_category":"%s"}}\n' \
    "$ID" "$ID" "$NAME" "$CAT" >> "$JSONL"
done < "$CATALOG"

# Batch-spawn
converge spawn --batch "$JSONL"
rm -f "$JSONL"

COUNT=$(ls "$PLAYBOOK_ROOT/output/catalog-item"/*.txt 2>/dev/null | wc -l)
echo "$COUNT"
