---
id: sub-beta-template
title: Sub Beta — leaf spawned by child-beta in a loop
passthrough: true
vars:
  sprint_id:
  index: 0
outputs:
  - output/sub-beta-$CONVERGE_VAR_INDEX.txt
checks: []
---

# Sub Beta body

Writes its existence to output/sub-beta-<index>.txt. Note: no `owner`
in the contract, so the framework filters it out (even though child-beta
received owner from parent — child-beta didn't declare it, so it
doesn't propagate to sub-beta).

```bash
mkdir -p output
echo "sub-beta-$CONVERGE_VAR_INDEX: sprint=$CONVERGE_VAR_SPRINT_ID" > "output/sub-beta-$CONVERGE_VAR_INDEX.txt"
echo "[sub-beta-$CONVERGE_VAR_INDEX] wrote $(cat "output/sub-beta-$CONVERGE_VAR_INDEX.txt")"
```