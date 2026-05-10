---
description: Remove the entire apps/ directory (landing, planner, playbooks-to split out; studio stub deleted)
inputs:
  - apps/
outputs:
  - apps/ (removed)
checks:
  - id: apps-dir-gone
    cmd: test ! -d apps
skills: []
references: []
vars: {}
depends_on: []
---

Remove the entire `apps/` directory. All apps are being split to their own repos.

```bash
rm -rf apps
```
