---
id: child-template
title: Default child
passthrough: true
vars:
  child_id:
  child_value:
checks:
  - id: child-output-present
    cmd: test -f "output/${CONVERGE_VAR_CHILD_ID}.txt"
---

# Default child body

Writes one leaf artifact named after the spawned child id.

```bash
printf '%s\n' "$CONVERGE_VAR_CHILD_VALUE" > "output/${CONVERGE_VAR_CHILD_ID}.txt"
echo "[default-child] ${CONVERGE_VAR_CHILD_ID} -> ${CONVERGE_VAR_CHILD_VALUE}"
```
