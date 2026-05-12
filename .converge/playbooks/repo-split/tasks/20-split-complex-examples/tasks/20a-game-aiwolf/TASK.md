---
description: >
  Extract game-aiwolf into ../myanlabs/examples/game-aiwolf.
  Full game dev studio with 41 sub-agents, 78 skills, 21 docs.
inputs:
  - examples/game-aiwolf/
outputs:
  - ../myanlabs/examples/game-aiwolf/
checks:
  - id: extracted
    cmd: test -d ../myanlabs/examples/game-aiwolf
  - id: has-readme
    cmd: test -s ../myanlabs/examples/game-aiwolf/README.md
  - id: has-license
    cmd: test -s ../myanlabs/examples/game-aiwolf/LICENSE
  - id: has-gitignore
    cmd: test -s ../myanlabs/examples/game-aiwolf/.gitignore
  - id: has-claude-assets
    cmd: test -d ../myanlabs/examples/game-aiwolf/.claude
depends_on: []
---

Copy `examples/game-aiwolf/` into `../myanlabs/examples/game-aiwolf/`.

Use `rsync -a --delete` so dotfiles are preserved and stale destination files
are removed:

```bash
mkdir -p ../myanlabs/examples/game-aiwolf
rsync -a --delete \
  --exclude '.git/' \
  --exclude '.converge/journal/' \
  --exclude '.converge/artifacts/' \
  --exclude 'node_modules/' \
  --exclude 'dist/' \
  --exclude 'build/' \
  examples/game-aiwolf/ ../myanlabs/examples/game-aiwolf/
```

Preserve existing `.github/`, `.claude/`, `CLAUDE.md`, and `LICENSE` content.
Add only missing standalone scaffolding such as `.gitignore`; do not rewrite the
existing project identity.
