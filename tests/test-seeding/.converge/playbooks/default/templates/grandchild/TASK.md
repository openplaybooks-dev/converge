---
id: grandchild-template
title: Grandchild — declares sprint_id (required) + phase (default)
passthrough: true
vars:
  sprint_id:           # required, propagated from parent's --var
  phase: "task"        # optional, defaults to "task"
outputs:
  - output/grand.txt
checks:
  - id: grand-has-sprint-and-phase
    cmd: grep -q "^sprint-042/task$" output/grand.txt
---

# Grandchild body

Proves 3-level var propagation: parent → child-alpha → grandchild,
with the sprint_id surviving the journey. The `phase` var was never
passed by anyone — the framework falls back to the template's default.

```bash
mkdir -p output
echo "$CONVERGE_VAR_SPRINT_ID/$CONVERGE_VAR_PHASE" > output/grand.txt
echo "[grandchild] wrote $(cat output/grand.txt)"
```
