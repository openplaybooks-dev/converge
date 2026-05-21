---
id: child-beta
title: Child Beta — declares only sprint_id (filters out owner)
outputs:
  - output/beta.txt
checks:
  - id: beta-has-sprint-no-owner
    type: cmd
    cmd: grep -q "^sprint-042$" output/beta.txt && ! grep -q "alice" output/beta.txt
    description: beta-has-sprint-no-owner
vars:
  sprint_id: sprint-042
passthrough: true
---

# Child Beta body

```bash
mkdir -p output
# Only $CONVERGE_VAR_SPRINT_ID is set; $CONVERGE_VAR_OWNER is empty
# because the framework's strict contract dropped it.
echo "$CONVERGE_VAR_SPRINT_ID" > output/beta.txt
echo "[child-beta] wrote $(cat output/beta.txt) (owner='$CONVERGE_VAR_OWNER' filtered out)"
```
