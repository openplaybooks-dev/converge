---
id: parent
title: Seeding parent — demonstrates vars passing through 3 levels
passthrough: true
outputs:
  - output/parent.flag
checks:
  - id: parent-flag
    cmd: test -s output/parent.flag
---

# Parent body

Spawns two level-2 children, passing context vars:

- `sprint_id=sprint-042` — propagates through the whole tree
- `owner=alice`           — declared by child-alpha only; child-beta filters it out
- `wave=3`                — overrides child-alpha's default of 0

This demonstrates the framework's strict-mode contract: each child
template declares the vars it accepts; the framework filters parent
vars through that declaration. Undeclared vars (like `owner` for
child-beta) are dropped silently — no leak.

All evidence files land under `output/` so the fixture root stays clean.

```bash
mkdir -p output

converge spawn child-alpha child-alpha \
  --var sprint_id=sprint-042 \
  --var owner=alice \
  --var wave=3

converge spawn child-beta child-beta \
  --var sprint_id=sprint-042 \
  --var owner=alice

echo "parent ran at $(date)" > output/parent.flag
echo "[parent] spawned child-alpha (gets all 3 vars) + child-beta (only sprint_id)"
```
