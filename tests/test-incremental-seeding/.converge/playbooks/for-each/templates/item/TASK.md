---
id: item-template
title: For-each item
passthrough: true
vars:
  item_name:
  item_index:
checks:
  - id: item-output-present
    cmd: test -f "output/for-each/${CONVERGE_VAR_ITEM_NAME}.txt"
---

# For-each item body

Writes one artifact per emitted item.

```bash
printf 'item=%s index=%s\n' \
  "$CONVERGE_VAR_ITEM_NAME" \
  "$CONVERGE_VAR_ITEM_INDEX" \
  > "output/for-each/${CONVERGE_VAR_ITEM_NAME}.txt"
echo "[for-each-item] ${CONVERGE_VAR_ITEM_NAME}"
```
