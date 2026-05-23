---
id: child-beta-template
title: Child Beta — declares only sprint_id, spawns 3 sub-beta children in a loop
passthrough: true
vars:
  # Only sprint_id is in the contract. Parent also passed `owner`, but
  # this template doesn't declare it — the framework silently drops it.
  # This is the strict-mode guarantee: undeclared parent vars don't leak.
  sprint_id:
outputs:
  - output/beta.txt
checks:
  - id: beta-has-sprint-no-owner
    # beta.txt must contain the sprint_id but NOT the owner — proving
    # the framework filtered the parent's `owner` out of this child.
    cmd: grep -q "^sprint-042$" output/beta.txt && ! grep -q "alice" output/beta.txt
---

# Child Beta body

```bash
mkdir -p output
# Only $CONVERGE_VAR_SPRINT_ID is set; $CONVERGE_VAR_OWNER is empty
# because the framework's strict contract dropped it.
echo "$CONVERGE_VAR_SPRINT_ID" > output/beta.txt

for i in 1 2 3; do
  converge spawn "sub-beta-$i" sub-beta \
    --var sprint_id="$CONVERGE_VAR_SPRINT_ID" \
    --var index="$i"
done

echo "[child-beta] spawned 3 sub-beta children; wrote $(cat output/beta.txt)"
```