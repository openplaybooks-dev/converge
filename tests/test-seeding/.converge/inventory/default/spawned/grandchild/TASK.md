---
id: grandchild
title: Grandchild — declares sprint_id (required) + phase (default)
outputs:
  - output/grand.txt
checks:
  - id: grand-has-sprint-and-phase
    type: cmd
    cmd: grep -q "^sprint-042/leaf$" output/grand.txt
    description: grand-has-sprint-and-phase
vars:
  sprint_id: sprint-042
  phase: leaf
passthrough: true
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
