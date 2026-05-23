---
id: child-alpha-template
title: Child Alpha — declares 3 vars, spawns 3 sub-alpha children in a loop
passthrough: true
vars:
  # Required vars (no default → spawn fails if parent doesn't pass them).
  sprint_id:
  owner:
  # Optional with default — parent can override, otherwise this kicks in.
  wave: 0
outputs:
  - output/alpha.flag
checks:
  - id: alpha-flag-has-context
    cmd: grep -q "sprint=sprint-042 owner=alice wave=3" output/alpha.flag
---

# Child Alpha body

Reads the three vars the framework filled (sprint_id, owner, wave) and
writes them to output/alpha.flag to prove they arrived. Then spawns
3 sub-alpha children in a loop, each with a unique index.

```bash
mkdir -p output
echo "sprint=$CONVERGE_VAR_SPRINT_ID owner=$CONVERGE_VAR_OWNER wave=$CONVERGE_VAR_WAVE" > output/alpha.flag

for i in 1 2 3; do
  converge spawn "sub-alpha-$i" sub-alpha \
    --var sprint_id="$CONVERGE_VAR_SPRINT_ID" \
    --var owner="$CONVERGE_VAR_OWNER" \
    --var index="$i"
done

echo "[child-alpha] spawned 3 sub-alpha children; wrote $(cat output/alpha.flag)"
```