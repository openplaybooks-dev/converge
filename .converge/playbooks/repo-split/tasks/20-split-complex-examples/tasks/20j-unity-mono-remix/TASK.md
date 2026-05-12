---
description: >
  Extract unity-mono-remix into ../myanlabs/examples/unity-mono-remix.
  Unity Mono analysis pipeline and starter project.
inputs:
  - examples/unity-mono-remix/
outputs:
  - ../myanlabs/examples/unity-mono-remix/
checks:
  - id: extracted
    cmd: test -d ../myanlabs/examples/unity-mono-remix
  - id: has-readme
    cmd: test -s ../myanlabs/examples/unity-mono-remix/README.md
  - id: has-license
    cmd: test -s ../myanlabs/examples/unity-mono-remix/LICENSE
  - id: has-gitignore
    cmd: test -s ../myanlabs/examples/unity-mono-remix/.gitignore
depends_on: []
---

Copy `examples/unity-mono-remix/` into
`../myanlabs/examples/unity-mono-remix/`.

```bash
mkdir -p ../myanlabs/examples/unity-mono-remix
rsync -a --delete \
  --exclude '.git/' \
  --exclude '.converge/journal/' \
  --exclude '.converge/artifacts/' \
  --exclude 'Library/' \
  --exclude 'Temp/' \
  --exclude 'Obj/' \
  --exclude 'Build/' \
  --exclude 'Builds/' \
  --exclude 'Logs/' \
  --exclude 'target/' \
  examples/unity-mono-remix/ ../myanlabs/examples/unity-mono-remix/
```

Ensure `.gitignore` has Unity excludes plus generated analysis/runtime paths.
Preserve scripts, tools, starter-project, app, and scope files.
