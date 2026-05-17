---
id: process-all
title: Process all items (for-each incremental)
passthrough: true
checks:
  - id: for-each-complete
    cmd: test -f output/for-each/wave-2.flag
converge:
  cmd: |
    if [ -f output/for-each/wave-2.flag ]; then
      echo done
    else
      echo continue
    fi
---

# For-each parent

Walks a fixed item list (`alpha`, `beta`, `gamma`) and emits one child
from template `item` per wave. A marker makes the spawn idempotent.

```bash
mkdir -p output/for-each output/spawn-markers

ITEMS=(alpha beta gamma)
if [ -s output/for-each/index.counter ]; then
  IDX=$(cat output/for-each/index.counter)
else
  IDX=0
fi

ITEM="${ITEMS[$IDX]}"
echo "[for-each] index=$IDX item=$ITEM"
echo "index=$IDX item=$ITEM ran-at=$(date +%s)" > "output/for-each/wave-${IDX}.flag"

MARKER="output/spawn-markers/for-each-${ITEM}.done"
if [ ! -f "$MARKER" ]; then
  converge spawn "$ITEM" item \
    --var "item_name=${ITEM}" \
    --var "item_index=${IDX}"
  touch "$MARKER"
else
  echo "[for-each] $ITEM already spawned"
fi

NEXT=$((IDX + 1))
echo "$NEXT" > output/for-each/index.counter
```
