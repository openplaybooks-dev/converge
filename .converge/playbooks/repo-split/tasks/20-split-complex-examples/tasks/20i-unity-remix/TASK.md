---
description: >
  Create minhlucvan/unity-remix repo.
  Analyze shipping Unity Android game (il2cpp), produce starter project.
  20+ scripts, 14 skills.
inputs:
  - examples/unity-remix/
outputs:
  - github.com/minhlucvan/unity-remix
checks:
  - id: repo-exists
    cmd: gh repo view minhlucvan/unity-remix --json name >/dev/null 2>&1
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

Create the `minhlucvan/unity-remix` repo.

```bash
# 1. Create repo
gh repo create minhlucvan/unity-remix --public --description "Analyze shipping Unity Android game, produce fresh Unity starter project with original code"

# 2. Copy content
TMPDIR=$(mktemp -d)
cp -r examples/unity-remix/* "$TMPDIR/"
cp -r examples/unity-remix/.claude "$TMPDIR/" 2>/dev/null || true
cp -r examples/unity-remix/.converge "$TMPDIR/" 2>/dev/null || true

# 3. Clean converge runtime state
rm -rf "$TMPDIR/.converge/journal" 2>/dev/null || true
rm -rf "$TMPDIR/.converge/artifacts" 2>/dev/null || true
rm -rf "$TMPDIR/tmp" 2>/dev/null || true

# 4. Add LICENSE if missing
if [ ! -f "$TMPDIR/LICENSE" ]; then
  cp LICENSE "$TMPDIR/LICENSE"
fi

# 5. Add Unity-specific .gitignore
cat > "$TMPDIR/.gitignore" << 'GI'
# Unity
[Ll]ibrary/
[Tt]emp/
[Oo]bj/
[Bb]uild/
[Bb]uilds/
[Ll]ogs/
[Uu]ser[Ss]ettings/
*.apk
*.aab
*.unitypackage

# OS
.DS_Store
Thumbs.db

# Environment
.env
*.log

# Converge
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
      - name: Check required files
        run: |
          test -f README.md
          test -f scope.yml
      - name: ShellCheck scripts
        run: |
          for f in scripts/*.sh; do
            [ -f "$f" ] && shellcheck "$f" || true
          done
CI

# 7. Init git and push
cd "$TMPDIR"
git init
git add -A
git commit -m "Initial commit: extract unity-remix from converge monorepo

Analyze a shipping Unity Android game, study its architecture, then produce
a fresh Unity starter project replicating one gameplay stage.
il2cpp analysis pipeline with 20+ scripts.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git remote add origin "https://github.com/minhlucvan/unity-remix.git"
git push -u origin main
```
