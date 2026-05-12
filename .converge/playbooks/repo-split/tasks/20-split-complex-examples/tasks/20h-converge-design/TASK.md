---
description: >
  Extract converge-design into ../myanlabs/examples/converge-design.
  AI-powered design and landing page generator.
inputs:
  - examples/converge-design/
outputs:
  - ../myanlabs/examples/converge-design/
checks:
  - id: extracted
    cmd: test -d ../myanlabs/examples/converge-design
  - id: has-readme
    cmd: test -s ../myanlabs/examples/converge-design/README.md
  - id: has-license
    cmd: test -s ../myanlabs/examples/converge-design/LICENSE
  - id: has-gitignore
    cmd: test -s ../myanlabs/examples/converge-design/.gitignore
depends_on: []
---

Copy `examples/converge-design/` into
`../myanlabs/examples/converge-design/`.

```bash
mkdir -p ../myanlabs/examples/converge-design
rsync -a --delete \
  --exclude '.git/' \
  --exclude '.converge/journal/' \
  --exclude '.converge/artifacts/' \
  --exclude 'node_modules/' \
  --exclude 'dist/' \
  examples/converge-design/ ../myanlabs/examples/converge-design/
```

Preserve references, demos, scripts, and existing license metadata. Add only
missing standalone scaffolding.
