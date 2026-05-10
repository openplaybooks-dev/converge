---
description: >
  Create minhlucvan/game-assets-3d repo.
  TypeScript Lego-block library with package.json, Three.js, vite, 50+ TS files.
inputs:
  - examples/game-assets-3d/
outputs:
  - github.com/minhlucvan/game-assets-3d
checks:
  - id: repo-exists
    cmd: gh repo view minhlucvan/game-assets-3d --json name >/dev/null 2>&1
  - id: has-readme
    cmd: test -s README.md
  - id: has-license
    cmd: test -s LICENSE
  - id: has-gitignore
    cmd: test -s .gitignore
  - id: has-ci
    cmd: test -s .github/workflows/ci.yml
  - id: has-package-json
    cmd: test -s package.json
skills: []
references: []
vars: {}
depends_on: []
---

Create the `minhlucvan/game-assets-3d` repo.

```bash
# 1. Create repo
gh repo create minhlucvan/game-assets-3d --public --description "TypeScript Lego-block library for low-poly 3D indie game assets with rigging and animation"

# 2. Copy content
TMPDIR=$(mktemp -d)
cp -r examples/game-assets-3d/* "$TMPDIR/"
cp -r examples/game-assets-3d/.converge "$TMPDIR/" 2>/dev/null || true

# 3. Clean converge runtime state
rm -rf "$TMPDIR/.converge/journal" 2>/dev/null || true
rm -rf "$TMPDIR/.converge/artifacts" 2>/dev/null || true

# 4. Add LICENSE if missing
if [ ! -f "$TMPDIR/LICENSE" ]; then
  cat > "$TMPDIR/LICENSE" << 'LICENSE'
MIT License

Copyright (c) 2026 Converge

Permission is hereby granted, free of charge, to any person obtaining a copy...
LICENSE
  # Use a proper MIT license — copy from root LICENSE
  cp LICENSE "$TMPDIR/LICENSE"
fi

# 5. Add .gitignore if missing
if [ ! -f "$TMPDIR/.gitignore" ]; then
  cat > "$TMPDIR/.gitignore" << 'GI'
node_modules/
dist/
.env
*.log
GI
fi

# 6. Add CI workflow
mkdir -p "$TMPDIR/.github/workflows"
cat > "$TMPDIR/.github/workflows/ci.yml" << 'CI'
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install
      - run: pnpm build
      - run: pnpm typecheck
CI

# 7. Init git and push
cd "$TMPDIR"
git init
git add -A
git commit -m "Initial commit: extract game-assets-3d from converge monorepo

TypeScript Lego-block library for low-poly 3D indie game assets with
rigging and animation. Uses Three.js and vite.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git remote add origin "https://github.com/minhlucvan/game-assets-3d.git"
git push -u origin main
```
