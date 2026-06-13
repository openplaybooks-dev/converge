---
id: sub-alpha
title: Sub Alpha — leaf (flow-driven)
passthrough: true
vars:
  sprint_id:
  owner:
  index: 0
outputs:
  - output/sub-alpha-{{index}}.txt
---

# Sub Alpha

```bash
mkdir -p output
echo "sub-alpha-{{index}}: sprint={{sprint_id}} owner={{owner}}" > output/sub-alpha-{{index}}.txt
echo "[sub-alpha-{{index}}] wrote $(cat output/sub-alpha-{{index}}.txt)"
```
