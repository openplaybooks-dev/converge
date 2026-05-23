---
id: sub-alpha-template
title: Sub Alpha — leaf spawned by child-alpha in a loop
passthrough: true
vars:
  sprint_id:
  owner:
  index: 0
outputs:
  - output/sub-alpha-$CONVERGE_VAR_INDEX.txt
checks: []
---

# Sub Alpha body

Writes its existence to output/sub-alpha-<index>.txt along with the
vars it received from child-alpha (via parent's sprint_id and owner,
plus its own index).

```bash
mkdir -p output
echo "sub-alpha-$CONVERGE_VAR_INDEX: sprint=$CONVERGE_VAR_SPRINT_ID owner=$CONVERGE_VAR_OWNER" > "output/sub-alpha-$CONVERGE_VAR_INDEX.txt"
echo "[sub-alpha-$CONVERGE_VAR_INDEX] wrote $(cat "output/sub-alpha-$CONVERGE_VAR_INDEX.txt")"
```