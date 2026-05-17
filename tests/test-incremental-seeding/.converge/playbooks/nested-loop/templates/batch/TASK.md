---
id: batch-template
title: Nested batch
passthrough: true
vars:
  batch_id:
  batch_wave:
checks:
  - id: batch-items-complete
    cmd: test -f "output/nested-loop/items/${CONVERGE_VAR_BATCH_ID}.wave-1.flag"
converge:
  cmd: |
    if [ -f "output/nested-loop/items/${CONVERGE_VAR_BATCH_ID}.wave-1.flag" ]; then
      echo done
    else
      echo continue
    fi
---

# Batch child body

Writes a batch flag and emits one item child per wave from template `item`.

```bash
mkdir -p output/nested-loop/batches output/nested-loop/items output/spawn-markers

BATCH_ID="$CONVERGE_VAR_BATCH_ID"
BATCH_WAVE="$CONVERGE_VAR_BATCH_WAVE"

if [ -s "output/nested-loop/items/${BATCH_ID}.counter" ]; then
  ITEM_WAVE=$(cat "output/nested-loop/items/${BATCH_ID}.counter")
else
  ITEM_WAVE=0
fi

echo "batch=$BATCH_ID wave=$BATCH_WAVE ran-at=$(date +%s)" > "output/nested-loop/batches/${BATCH_ID}.flag"
ITEM_ID="${BATCH_ID}-item-${ITEM_WAVE}"
echo "[batch] $BATCH_ID item-wave=$ITEM_WAVE -> $ITEM_ID"
echo "batch=$BATCH_ID item-wave=$ITEM_WAVE ran-at=$(date +%s)" \
  > "output/nested-loop/items/${BATCH_ID}.wave-${ITEM_WAVE}.flag"

MARKER="output/spawn-markers/${ITEM_ID}.done"
if [ ! -f "$MARKER" ]; then
  converge spawn "$ITEM_ID" item \
    --var "batch_id=${BATCH_ID}" \
    --var "item_id=${ITEM_ID}" \
    --var "item_wave=${ITEM_WAVE}"
  touch "$MARKER"
else
  echo "[batch] $ITEM_ID already spawned"
fi

NEXT=$((ITEM_WAVE + 1))
echo "$NEXT" > "output/nested-loop/items/${BATCH_ID}.counter"
```
