---
description: >
  Create minhlucvan/financial-deep-research repo.
  Python-based professional equity research on Vietnamese stocks.
inputs:
  - examples/financial-deep-research/
outputs:
  - github.com/minhlucvan/financial-deep-research
checks:
  - id: repo-exists
    cmd: gh repo view minhlucvan/financial-deep-research --json name >/dev/null 2>&1
  - id: has-readme
    cmd: test -s README.md
  - id: has-license
    cmd: test -s LICENSE
  - id: has-gitignore
    cmd: test -s .gitignore
  - id: has-requirements
    cmd: test -s requirements.txt
  - id: has-ci
    cmd: test -s .github/workflows/ci.yml
skills: []
references: []
vars: {}
depends_on: []
---

Create the `minhlucvan/financial-deep-research` repo.

```bash
# 1. Create repo
gh repo create minhlucvan/financial-deep-research --public --description "Professional-grade equity research on Vietnamese stocks using vnstock Python library"

# 2. Copy content
TMPDIR=$(mktemp -d)
cp -r examples/financial-deep-research/* "$TMPDIR/"
cp -r examples/financial-deep-research/.claude "$TMPDIR/" 2>/dev/null || true
cp -r examples/financial-deep-research/.converge "$TMPDIR/" 2>/dev/null || true

# 3. Clean converge runtime state
rm -rf "$TMPDIR/.converge/journal" 2>/dev/null || true
rm -rf "$TMPDIR/.converge/artifacts" 2>/dev/null || true

# 4. Add LICENSE if missing
if [ ! -f "$TMPDIR/LICENSE" ]; then
  cp LICENSE "$TMPDIR/LICENSE"
fi

# 5. Create requirements.txt if missing
if [ ! -f "$TMPDIR/requirements.txt" ]; then
  cat > "$TMPDIR/requirements.txt" << 'REQS'
vnstock>=0.2.0
pandas>=2.0.0
numpy>=1.24.0
pyyaml>=6.0
REQS
fi

# 6. Add .gitignore
cat > "$TMPDIR/.gitignore" << 'GI'
__pycache__/
*.pyc
.env
*.log
data/
reports/
analysis/
.converge/journal/
.converge/artifacts/
GI

# 7. Add CI workflow
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
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install -r requirements.txt
      - name: Check required files
        run: |
          test -f README.md
          test -f tickers.json
CI

# 8. Init git and push
cd "$TMPDIR"
git init
git add -A
git commit -m "Initial commit: extract financial-deep-research from converge monorepo

Professional-grade equity research on Vietnamese stocks.
Multi-dimensional analysis: fundamental, technical, value, macro.
Uses vnstock Python library orchestrated by Converge.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git remote add origin "https://github.com/minhlucvan/financial-deep-research.git"
git push -u origin main
```
