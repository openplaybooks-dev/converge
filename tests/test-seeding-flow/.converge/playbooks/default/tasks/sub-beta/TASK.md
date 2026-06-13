---
id: sub-beta
title: Sub Beta — leaf, no owner (flow-driven)
passthrough: true
vars:
  sprint_id:
  index: 0
outputs:
  - output/sub-beta-{{index}}.txt
---

# Sub Beta

No `owner` in the contract — proves the parent's `owner` was already filtered
out at child-beta and never reached level 3.

```bash
mkdir -p output
echo "sub-beta-{{index}}: sprint={{sprint_id}}" > output/sub-beta-{{index}}.txt
echo "[sub-beta-{{index}}] wrote $(cat output/sub-beta-{{index}}.txt)"
```
