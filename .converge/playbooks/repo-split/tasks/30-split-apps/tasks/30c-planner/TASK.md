---
description: >
  Create minhlucvan/converge-planner repo.
  Next.js DAG planner UI. Has workspace:* deps on @converge/core + @converge/project-root.
  Replace with git references: "github:minhlucvan/converge".
inputs:
  - apps/planner/
outputs:
  - github.com/minhlucvan/converge-planner
checks:
  - id: repo-exists
    cmd: gh repo view minhlucvan/converge-planner --json name >/dev/null 2>&1
  - id: has-readme
    cmd: test -s README.md
  - id: has-license
    cmd: test -s LICENSE
  - id: has-ci
    cmd: test -s .github/workflows/ci.yml
  - id: has-package-json
    cmd: test -s package.json
  - id: no-workspace-refs
    cmd: grep -c "workspace:" package.json || test $? -eq 1
  - id: has-git-deps
    cmd: grep -q "github:minhlucvan/converge" package.json
skills: []
references: []
vars: {}
depends_on: []
---

Create the `minhlucvan/converge-planner` repo.

This is the only app with converge package dependencies. Replace `workspace:*` with git references.

```bash
# 1. Create repo
gh repo create minhlucvan/converge-planner --public --description "Converge DAG planner UI — Next.js + React + Tailwind CSS"

# 2. Copy content
TMPDIR=$(mktemp -d)
cp -r apps/planner/* "$TMPDIR/"

# 3. Fix package.json — replace workspace:* with git references
cd "$TMPDIR"
# Replace workspace:* references with git URLs
# pnpm supports "github:owner/repo" as a dependency specifier
sed -i '' 's/"@converge\/core": "workspace:\*"/"@converge\/core": "github:minhlucvan\/converge"/' package.json
sed -i '' 's/"@converge\/project-root": "workspace:\*"/"@converge\/project-root": "github:minhlucvan\/converge"/' package.json

# Verify no remaining workspace:* refs
if grep -q "workspace:" package.json; then
  echo "ERROR: workspace:* references still present"
  grep "workspace:" package.json
  exit 1
fi

# 4. Add LICENSE
cp /Users/minh/Documents/converge/LICENSE "$TMPDIR/LICENSE"

# 5. Add CI workflow
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
      - run: pnpm lint
CI

# 6. Add README if missing
cat > "$TMPDIR/README.md" << 'README'
# Converge Planner

DAG planner UI for [Converge](https://github.com/myanlabs/converge) — visualize and manage playbook task graphs.

Built with [Next.js](https://nextjs.org/) + [React](https://react.dev/) + [Tailwind CSS](https://tailwindcss.com/).

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
git commit -m "Initial commit: extract planner from converge monorepo

Converge DAG planner UI — Next.js + React + Tailwind CSS.
Uses @converge/core and @converge/project-root via git dependencies.
Extracted from the converge monorepo apps/planner/.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git remote add origin "https://github.com/minhlucvan/converge-planner.git"
git push -u origin main
```
