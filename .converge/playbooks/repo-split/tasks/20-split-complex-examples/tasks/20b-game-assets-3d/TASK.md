---
description: >
  Extract game-assets-3d into ../myanlabs/examples/game-assets-3d.
  TypeScript Lego-block library with Three.js and vite.
inputs:
  - examples/game-assets-3d/
outputs:
  - ../myanlabs/examples/game-assets-3d/
checks:
  - id: extracted
    cmd: test -d ../myanlabs/examples/game-assets-3d
  - id: has-readme
    cmd: test -s ../myanlabs/examples/game-assets-3d/README.md
  - id: has-license
    cmd: test -s ../myanlabs/examples/game-assets-3d/LICENSE
  - id: has-gitignore
    cmd: test -s ../myanlabs/examples/game-assets-3d/.gitignore
  - id: has-package-json
    cmd: test -s ../myanlabs/examples/game-assets-3d/package.json
depends_on: []
---

Copy `examples/game-assets-3d/` into
`../myanlabs/examples/game-assets-3d/`.

```bash
mkdir -p ../myanlabs/examples/game-assets-3d
rsync -a --delete \
  --exclude '.git/' \
  --exclude '.converge/journal/' \
  --exclude '.converge/artifacts/' \
  --exclude 'node_modules/' \
  --exclude 'dist/' \
  --exclude 'coverage/' \
  examples/game-assets-3d/ ../myanlabs/examples/game-assets-3d/
```

Add a LICENSE copied from the converge root if missing. Keep the package
buildable as a standalone TypeScript project and ensure `.gitignore` excludes
`node_modules/`, `dist/`, logs, and Converge runtime state.
