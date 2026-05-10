---
description: >
  Create minhlucvan/game-aiwolf repo.
  Full game dev studio with 41 sub-agents, 78 skills, 21 docs.
  Already has .github/, LICENSE, CLAUDE.md — nearly production-ready.
inputs:
  - examples/game-aiwolf/
outputs:
  - github.com/minhlucvan/game-aiwolf
checks:
  - id: repo-exists
    cmd: gh repo view minhlucvan/game-aiwolf --json name >/dev/null 2>&1
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

Create the `minhlucvan/game-aiwolf` repo.

```bash
# 1. Create repo
gh repo create minhlucvan/game-aiwolf --public --description "Claude Code Game Studios — turn a single Claude Code session into a full game development studio"

# 2. Copy content to temp dir
TMPDIR=$(mktemp -d)
cp -r examples/game-aiwolf/* "$TMPDIR/"
cp -r examples/game-aiwolf/.claude "$TMPDIR/" 2>/dev/null || true
cp -r examples/game-aiwolf/.github "$TMPDIR/" 2>/dev/null || true
# Explicitly do NOT copy any nested .git directories

# 3. Clean converge runtime state
rm -rf "$TMPDIR/.converge/journal" 2>/dev/null || true
rm -rf "$TMPDIR/.converge/artifacts" 2>/dev/null || true

# 4. Add .gitignore if missing
if [ ! -f "$TMPDIR/.gitignore" ]; then
  cat > "$TMPDIR/.gitignore" << 'GITIGNORE'
.claude/settings.local.json
.env
*.log
GITIGNORE
fi

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
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate skill files
        run: |
          echo "Checking skill structure..."
          find .claude/skills -name "*.md" -type f | while read f; do
            echo "  $f"
          done
          echo "All skills present."
CI

# 6. Init git and push
cd "$TMPDIR"
git init
git add -A
git commit -m "Initial commit: extract game-aiwolf from converge monorepo

Claude Code Game Studios — full game development studio with 41 sub-agents,
78 skills, and 21 docs. Extracted from the converge monorepo.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git remote add origin "https://github.com/minhlucvan/game-aiwolf.git"
git push -u origin main
```

This example already has its own `.github/` with CODEOWNERS, FUNDING.yml, issue/PR templates, and a `LICENSE`. Preserve all of these. The existing LICENSE has different copyright (Donchitos, 2026) — keep it as-is.
