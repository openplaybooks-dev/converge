---
id: seed-all
title: Seed all 100 items from catalog (inline batch)
passthrough: true
outputs:
  - output/batch-inline/summary.txt
checks:
  - id: all-items-spawned
    cmd: test $(ls output/catalog-item/*.txt 2>/dev/null | wc -l) -eq 100
converge:
  cmd: |
    if ls output/catalog-item/*.txt >/dev/null 2>&1; then
      COUNT=$(ls output/catalog-item/*.txt | wc -l)
      [ "$COUNT" -ge 100 ] && echo done || echo continue
    else
      echo continue
    fi
---

# Seed all 100 items (inline)

Reads `catalog.json`, generates `catalog.jsonl`, and runs
`converge spawn --batch catalog.jsonl` to register all 100 children
in a single call.

```bash
mkdir -p output/catalog-item output/batch-inline

# Generate JSONL from catalog.json
# Each line: {"id":"item-NNN","template":"catalog-item","vars":{"item_id":"item-NNN","item_name":"...","item_category":"..."}}
> catalog.jsonl
while IFS= read -r line; do
  # Skip lines that are just [ or ]
  echo "$line" | grep -qE '^\s*[\[\]]' && continue
  
  ID=$(echo "$line" | grep -o '"id"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)".*/\1/')
  NAME=$(echo "$line" | grep -o '"name"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)".*/\1/')
  CAT=$(echo "$line" | grep -o '"category"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)".*/\1/')
  
  # Skip empty lines
  [ -z "$ID" ] && continue
  
  printf '{"id":"%s","template":"catalog-item","vars":{"item_id":"%s","item_name":"%s","item_category":"%s"}}\n' \
    "$ID" "$ID" "$NAME" "$CAT" >> catalog.jsonl
done < catalog.json

# Batch-spawn all 100 items
converge spawn --batch catalog.jsonl

# Write summary
COUNT=$(ls output/catalog-item/*.txt 2>/dev/null | wc -l)
echo "batch-spawned: $COUNT items" > output/batch-inline/summary.txt
echo "[seed-all] batch complete: $COUNT items"
```
