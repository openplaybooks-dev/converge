---
id: seed-all
title: Seed all 100 items from catalog (external script)
passthrough: true
outputs:
  - output/batch-external/summary.txt
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

# Seed all 100 items (external script)

Delegates to `scripts/spawn-batch.sh` for the batch-spawning logic.

```bash
mkdir -p output/batch-external

PLAYBOOK_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
COUNT=$(bash "$PLAYBOOK_ROOT/scripts/spawn-batch.sh" \
  "$PLAYBOOK_ROOT/catalog.json" \
  "$PLAYBOOK_ROOT")

echo "batch-spawned: $COUNT items" > output/batch-external/summary.txt
echo "[seed-all] external script complete: $COUNT items"
```
