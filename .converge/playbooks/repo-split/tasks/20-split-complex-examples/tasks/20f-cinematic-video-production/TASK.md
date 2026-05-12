---
description: >
  Extract cinematic-video-production into
  ../myanlabs/examples/cinematic-video-production.
  End-to-end AI film director playbook.
inputs:
  - examples/cinematic-video-production/
outputs:
  - ../myanlabs/examples/cinematic-video-production/
checks:
  - id: extracted
    cmd: test -d ../myanlabs/examples/cinematic-video-production
  - id: has-readme
    cmd: test -s ../myanlabs/examples/cinematic-video-production/README.md
  - id: has-license
    cmd: test -s ../myanlabs/examples/cinematic-video-production/LICENSE
  - id: has-gitignore
    cmd: test -s ../myanlabs/examples/cinematic-video-production/.gitignore
depends_on: []
---

Copy `examples/cinematic-video-production/` into
`../myanlabs/examples/cinematic-video-production/`.

```bash
mkdir -p ../myanlabs/examples/cinematic-video-production
rsync -a --delete \
  --exclude '.git/' \
  --exclude '.converge/journal/' \
  --exclude '.converge/artifacts/' \
  --exclude 'clips/' \
  --exclude 'output/' \
  examples/cinematic-video-production/ ../myanlabs/examples/cinematic-video-production/
```

Add a LICENSE copied from the converge root if missing. Ensure `.gitignore`
excludes generated video clips, outputs, logs, and runtime state.
