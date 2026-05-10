---
description: >
  Create minhlucvan/cinematic-video-production repo.
  End-to-end AI film director — idea.md to clips/ with compositing.
inputs:
  - examples/cinematic-video-production/
outputs:
  - github.com/minhlucvan/cinematic-video-production
checks:
  - id: repo-exists
    cmd: gh repo view minhlucvan/cinematic-video-production --json name >/dev/null 2>&1
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

Create the `minhlucvan/cinematic-video-production` repo.

```bash
# 1. Create repo
gh repo create minhlucvan/cinematic-video-production --public --description "End-to-end AI film director — idea.md to final video with locked elements and compositing"

# 2. Copy content
TMPDIR=$(mktemp -d)
cp -r examples/cinematic-video-production/* "$TMPDIR/"
cp -r examples/cinematic-video-production/.converge "$TMPDIR/" 2>/dev/null || true

# 3. Clean converge runtime state
rm -rf "$TMPDIR/.converge/journal" 2>/dev/null || true
rm -rf "$TMPDIR/.converge/artifacts" 2>/dev/null || true

# 4. Add LICENSE if missing
if [ ! -f "$TMPDIR/LICENSE" ]; then
  cp LICENSE "$TMPDIR/LICENSE"
fi

# 5. Add .gitignore
cat > "$TMPDIR/.gitignore" << 'GI'
.env
*.log
clips/
output/
.converge/journal/
.converge/artifacts/
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
      - name: Verify manifest script
        run: node scripts/verify-manifest.js
      - name: Check required files
        run: |
          test -f README.md
          test -f idea.md
CI

# 7. Init git and push
cd "$TMPDIR"
git init
git add -A
git commit -m "Initial commit: extract cinematic-video-production from converge monorepo

End-to-end AI film director. Input an idea.md, get a final video
with locked character/element consistency and compositing.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git remote add origin "https://github.com/minhlucvan/cinematic-video-production.git"
git push -u origin main
```
