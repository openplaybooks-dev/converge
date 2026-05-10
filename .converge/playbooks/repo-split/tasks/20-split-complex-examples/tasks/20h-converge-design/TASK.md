---
description: >
  Create minhlucvan/converge-design repo.
  AI-powered design/landing page generator with 23 skills, PDF/PPTX export.
inputs:
  - examples/converge-design/
outputs:
  - github.com/minhlucvan/converge-design
checks:
  - id: repo-exists
    cmd: gh repo view minhlucvan/converge-design --json name >/dev/null 2>&1
  - id: has-readme
    cmd: test -s README.md
  - id: has-license
    cmd: test -s LICENSE
  - id: has-gitignore
    cmd: test -s .gitignore
  - id: has-ci
    cmd: test -s .github/workflows/ci.yml
skills: []
references: []
vars: {}
depends_on: []
---

Create the `minhlucvan/converge-design` repo.

```bash
# 1. Create repo
gh repo create minhlucvan/converge-design --public --description "AI-powered design and landing page generator — 'Nebula' AI code review tool"

# 2. Copy content
TMPDIR=$(mktemp -d)
cp -r examples/converge-design/* "$TMPDIR/"
cp -r examples/converge-design/.converge "$TMPDIR/" 2>/dev/null || true

# 3. Clean converge runtime state
rm -rf "$TMPDIR/.converge/journal" 2>/dev/null || true
rm -rf "$TMPDIR/.converge/artifacts" 2>/dev/null || true

# 4. LICENSE already exists — verify
test -f "$TMPDIR/LICENSE" || cp LICENSE "$TMPDIR/LICENSE"

# 5. .gitignore already exists — verify
test -f "$TMPDIR/.gitignore" || cat > "$TMPDIR/.gitignore" << 'GI'
node_modules/
.env
*.log
GI

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
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Check required files
        run: |
          test -f README.md
          test -f LICENSE
          test -f idea.md
CI

# 7. Init git and push
cd "$TMPDIR"
git init
git add -A
git commit -m "Initial commit: extract converge-design from converge monorepo

AI-powered design and landing page generator. Generates landing pages,
presentations, and design specs from prompts. Includes PDF/PPTX export.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git remote add origin "https://github.com/minhlucvan/converge-design.git"
git push -u origin main
```
