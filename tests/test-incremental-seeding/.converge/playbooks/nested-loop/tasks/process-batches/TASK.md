---
id: process-batches
title: Process batches (outer incremental loop)
passthrough: true
checks:
  - id: nested-batches-complete
    cmd: test -f output/nested-loop/outer-wave-1.flag
converge:
  cmd: |
    if [ -f output/nested-loop/outer-wave-1.flag ]; then
      echo done
    else
      echo continue
    fi
---

# Nested-loop outer parent

Each wave emits one batch child from template `batch`. Each batch child is
its own incremental loop that emits two item children from template `item`.

```bash
mkdir -p output/nested-loop output/spawn-markers

if [ -s output/nested-loop/batch.counter ]; then
  WAVE=$(cat output/nested-loop/batch.counter)
else
  WAVE=0
fi

BATCH_ID="batch-${WAVE}"
echo "[nested-root] wave=$WAVE -> $BATCH_ID"
echo "wave=$WAVE batch=$BATCH_ID ran-at=$(date +%s)" > "output/nested-loop/outer-wave-${WAVE}.flag"

MARKER="output/spawn-markers/nested-${BATCH_ID}.done"
if [ ! -f "$MARKER" ]; then
  converge spawn "$BATCH_ID" batch \
    --var "batch_id=${BATCH_ID}" \
    --var "batch_wave=${WAVE}"
  touch "$MARKER"
else
  echo "[nested-root] $BATCH_ID already spawned"
fi

NEXT=$((WAVE + 1))
echo "$NEXT" > output/nested-loop/batch.counter
```
