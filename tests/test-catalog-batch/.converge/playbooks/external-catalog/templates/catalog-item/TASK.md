---
id: catalog-item-template
title: Catalog item processor
passthrough: true
vars:
  item_id:
  item_name:
  item_category:
outputs:
  - output/catalog-item/${CONVERGE_VAR_ITEM_ID}.txt
checks:
  - id: item-output-valid
    cmd: grep -q "^id=${CONVERGE_VAR_ITEM_ID} name=${CONVERGE_VAR_ITEM_NAME} category=${CONVERGE_VAR_ITEM_CATEGORY}$" "output/catalog-item/${CONVERGE_VAR_ITEM_ID}.txt"
---

# Catalog item body

Writes one artifact per catalog item.

```bash
mkdir -p output/catalog-item
printf 'id=%s name=%s category=%s\n' \
  "$CONVERGE_VAR_ITEM_ID" \
  "$CONVERGE_VAR_ITEM_NAME" \
  "$CONVERGE_VAR_ITEM_CATEGORY" \
  > "output/catalog-item/${CONVERGE_VAR_ITEM_ID}.txt"
echo "[catalog-item] ${CONVERGE_VAR_ITEM_ID} done"
```
