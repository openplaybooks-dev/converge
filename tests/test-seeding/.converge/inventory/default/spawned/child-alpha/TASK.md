---
id: child-alpha
title: Child Alpha — declares 3 vars, spawns grandchild
outputs:
  - output/alpha.flag
checks:
  - id: alpha-flag-has-context
    type: cmd
    cmd: grep -q "sprint=sprint-042 owner=alice wave=3" output/alpha.flag
    description: alpha-flag-has-context
vars:
  sprint_id: sprint-042
  owner: alice
  wave: "3"
passthrough: true
---

# Child Alpha body

Reads the three vars the framework filled (sprint_id, owner, wave) and
writes them to output/alpha.flag to prove they arrived. Then spawns
grandchild and passes sprint_id along — grandchild declares only
sprint_id, so owner is naturally not forwarded (and the framework
would drop it anyway because grandchild's contract doesn't include it).

```bash
mkdir -p output
echo "sprint=$CONVERGE_VAR_SPRINT_ID owner=$CONVERGE_VAR_OWNER wave=$CONVERGE_VAR_WAVE" > output/alpha.flag

converge spawn grandchild grandchild \
  --var sprint_id="$CONVERGE_VAR_SPRINT_ID"

echo "[child-alpha] context=$(cat output/alpha.flag); spawned grandchild"
```
