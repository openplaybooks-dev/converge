---
id: parent
title: Seeding parent (flow-driven)
passthrough: true
outputs:
  - output/parent.flag
checks:
  - id: parent-flag
    cmd: test -s output/parent.flag
---

# Parent

The flow spawns the two level-2 children; this body only records that the
parent ran.

```bash
mkdir -p output
echo "parent ran" > output/parent.flag
echo "[parent] done"
```
