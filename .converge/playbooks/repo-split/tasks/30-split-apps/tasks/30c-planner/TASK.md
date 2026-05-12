---
description: >
  Extract planner into ../myanlabs/apps/planner.
  Next.js DAG planner UI with converge package dependencies.
inputs:
  - apps/planner/
outputs:
  - ../myanlabs/apps/planner/
checks:
  - id: extracted
    cmd: test -d ../myanlabs/apps/planner
  - id: has-readme
    cmd: test -s ../myanlabs/apps/planner/README.md
  - id: has-license
    cmd: test -s ../myanlabs/apps/planner/LICENSE
  - id: has-package-json
    cmd: test -s ../myanlabs/apps/planner/package.json
  - id: no-workspace-refs
    cmd: '! grep -R "workspace:" ../myanlabs/apps/planner/package.json'
depends_on: []
---

Copy `apps/planner/` into `../myanlabs/apps/planner/`.

```bash
mkdir -p ../myanlabs/apps/planner
rsync -a --delete \
  --exclude '.git/' \
  --exclude 'node_modules/' \
  --exclude '.next/' \
  apps/planner/ ../myanlabs/apps/planner/
```

This app currently depends on converge workspace packages. After copying,
replace `workspace:*` specs in `../myanlabs/apps/planner/package.json` with a
standalone dependency spec that can install outside the converge workspace.
Document the chosen dependency source in the planner README.

Add a LICENSE copied from the converge root if missing.
