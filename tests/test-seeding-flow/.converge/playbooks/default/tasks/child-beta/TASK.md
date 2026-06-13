---
id: child-beta
title: Child Beta — spawner task, declares only sprint_id
passthrough: true
vars:
  sprint_id:
outputs:
  - output/beta-manifest.json
checks:
  - id: beta-has-sprint-no-owner
    cmd: grep -q "^sprint-042$" output/beta.txt && ! grep -q "alice" output/beta.txt
---

# Child Beta

Declares only `sprint_id` (the strict contract drops the `owner` the flow
passed). Emits its own manifest of grandchildren (2 sub-betas) for the flow to
spawn — a different count than child-alpha, since each branch decides its own.

```bash
mkdir -p output
echo "{{sprint_id}}" > output/beta.txt
echo '{"subs":[{"index":1},{"index":2}]}' > output/beta-manifest.json
echo "[child-beta] emitted $(cat output/beta-manifest.json)"
```
