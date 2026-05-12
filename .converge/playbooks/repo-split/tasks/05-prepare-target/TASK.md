---
description: >
  Prepare the local sibling repository at ../myanlabs before copying split
  examples and apps. This task is intentionally local-first and does not call
  gh or create remote repositories.
inputs: []
outputs:
  - ../myanlabs/README.md
  - ../myanlabs/examples/
  - ../myanlabs/apps/
checks:
  - id: target-root-exists
    cmd: test -d ../myanlabs
  - id: target-is-git-repo
    cmd: test -d ../myanlabs/.git
  - id: target-layout-exists
    cmd: test -d ../myanlabs/examples && test -d ../myanlabs/apps
depends_on:
  - 00-discover
---

Create or verify the local destination repo:

```bash
mkdir -p ../myanlabs/examples ../myanlabs/apps
cd ../myanlabs
git init
```

Add a concise `README.md` if one does not exist. It should state that this repo
contains projects split from `../converge`, with examples under `examples/` and
apps under `apps/`.

Do not delete existing content under `../myanlabs`. If a target subdirectory
already exists, leave replacement decisions to the specific split child task.
