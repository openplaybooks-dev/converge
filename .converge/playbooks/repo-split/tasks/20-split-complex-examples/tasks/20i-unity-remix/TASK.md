---
description: >
  Extract unity-remix into ../myanlabs/examples/unity-remix.
  Unity il2cpp analysis pipeline and starter project.
inputs:
  - examples/unity-remix/
outputs:
  - ../myanlabs/examples/unity-remix/
checks:
  - id: extracted
    cmd: test -d ../myanlabs/examples/unity-remix
  - id: has-readme
    cmd: test -s ../myanlabs/examples/unity-remix/README.md
  - id: has-license
    cmd: test -s ../myanlabs/examples/unity-remix/LICENSE
  - id: has-gitignore
    cmd: test -s ../myanlabs/examples/unity-remix/.gitignore
depends_on: []
---

Copy `examples/unity-remix/` into `../myanlabs/examples/unity-remix/`.

```bash
mkdir -p ../myanlabs/examples/unity-remix
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
  examples/unity-remix/ ../myanlabs/examples/unity-remix/
```

Ensure `.gitignore` has Unity excludes plus generated analysis/runtime paths.
Preserve scripts, tools, starter-project, and scope files.
