---
description: >
  Create minhlucvan/playbooks-to repo.
  Astro + Tailwind + Cloudflare playbooks directory site. No converge deps.
inputs:
  - apps/playbooks-to/
outputs:
  - github.com/minhlucvan/playbooks-to
checks:
  - id: repo-exists
    cmd: gh repo view minhlucvan/playbooks-to --json name >/dev/null 2>&1
  - id: has-readme
    cmd: test -s README.md
  - id: has-license
    cmd: test -s LICENSE
  - id: has-ci
    cmd: test -s .github/workflows/ci.yml
  - id: has-package-json
    cmd: test -s package.json
skills: []
references: []
vars: {}
depends_on: []
---

Create the `minhlucvan/playbooks-to` repo.

```bash
# 1. Create repo
gh repo create minhlucvan/playbooks-to --public --description "Playbooks directory site — Astro + Tailwind CSS + Cloudflare"

# 2. Copy content
TMPDIR=$(mktemp -d)
cp -r apps/playbooks-to/* "$TMPDIR/"
cp -r apps/playbooks-to/db "$TMPDIR/" 2>/dev/null || true

# 3. Add LICENSE
cp LICENSE "$TMPDIR/LICENSE"

# 4. Add CI workflow
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
CI

# 5. Verify no workspace deps
if grep -q "workspace:" "$TMPDIR/package.json"; then
  echo "ERROR: workspace:* references found — this app should have none"
  exit 1
fi

# 6. Add README if missing or thin
cat > "$TMPDIR/README.md" << 'README'
# Playbooks.to

Directory site for [Converge](https://github.com/myanlabs/converge) playbooks.

Built with [Astro](https://astro.build/) + [Tailwind CSS](https://tailwindcss.com/), deployed to Cloudflare Pages.

## Develop

```bash
pnpm install
pnpm dev
```

## Build

```bash
pnpm build
```
README

# 7. Init git and push
cd "$TMPDIR"
git init
git add -A
git commit -m "Initial commit: extract playbooks-to from converge monorepo

Playbooks directory site — Astro + Tailwind CSS + Cloudflare Pages.
Extracted from the converge monorepo apps/playbooks-to/.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git remote add origin "https://github.com/minhlucvan/playbooks-to.git"
git push -u origin main
```
