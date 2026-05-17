---
id: parent
title: Incremental seed parent (do-while)
passthrough: true
checks:
  - id: default-wave-2
    cmd: test -f output/default/wave-2.flag
converge:
  cmd: |
    if [ -f output/default/wave-2.flag ]; then
      echo done
    else
      echo continue
    fi
---

# Default do-while parent

Each gap-driven re-run emits exactly one child from template `child`.
Wave 0 emits `child-00`, wave 1 emits `child-01`, wave 2 emits `child-02`.
The body is idempotent: a marker prevents duplicate spawn attempts.

```bash
mkdir -p output/default output/spawn-markers

if [ -s output/default/wave.counter ]; then
  WAVE=$(cat output/default/wave.counter)
else
  WAVE=0
fi

CHILD_ID=$(printf "child-%02d" "$WAVE")
echo "wave=$WAVE child=$CHILD_ID ran-at=$(date +%s)" > "output/default/wave-${WAVE}.flag"
echo "[default] wave=$WAVE -> $CHILD_ID"

MARKER="output/spawn-markers/default-${CHILD_ID}.done"
if [ ! -f "$MARKER" ]; then
  converge spawn "$CHILD_ID" child \
    --var "child_id=${CHILD_ID}" \
    --var "child_value=child ${WAVE}"
  touch "$MARKER"
else
  echo "[default] $CHILD_ID already spawned"
fi

NEXT=$((WAVE + 1))
echo "$NEXT" > output/default/wave.counter
```
