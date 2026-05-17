---
id: nested-item-template
title: Nested item
passthrough: true
vars:
  batch_id:
  item_id:
  item_wave:
checks:
  - id: nested-item-output-present
    cmd: test -f "output/nested-loop/items/${CONVERGE_VAR_ITEM_ID}.txt"
---

# Nested item body

Writes one artifact for a batch/item pair.

```bash
mkdir -p output/nested-loop/items

printf 'batch=%s item=%s wave=%s\n' \
  "$CONVERGE_VAR_BATCH_ID" \
  "$CONVERGE_VAR_ITEM_ID" \
  "$CONVERGE_VAR_ITEM_WAVE" \
  > "output/nested-loop/items/${CONVERGE_VAR_ITEM_ID}.txt"
echo "[nested-item] ${CONVERGE_VAR_ITEM_ID}"
```
