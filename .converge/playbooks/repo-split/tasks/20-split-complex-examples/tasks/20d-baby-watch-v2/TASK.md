---
description: >
  Create minhlucvan/stitch-to-flutter-baby-watch-v2 repo.
  Most feature-complete Flutter BLE child safety app — 14 lib subdirs, 4 unit tests.
inputs:
  - examples/stitch-to-flutter-baby-watch-v2/
outputs:
  - github.com/minhlucvan/stitch-to-flutter-baby-watch-v2
checks:
  - id: repo-exists
    cmd: gh repo view minhlucvan/stitch-to-flutter-baby-watch-v2 --json name >/dev/null 2>&1
  - id: has-readme
    cmd: test -s README.md
  - id: has-license
    cmd: test -s LICENSE
  - id: has-gitignore
    cmd: test -s .gitignore
  - id: has-ci
    cmd: test -s .github/workflows/ci.yml
  - id: has-pubspec
    cmd: test -s pubspec.yaml
skills: []
references: []
vars: {}
depends_on: []
---

Create the `minhlucvan/stitch-to-flutter-baby-watch-v2` repo.

```bash
# 1. Create repo
gh repo create minhlucvan/stitch-to-flutter-baby-watch-v2 --public --description "Child safety BLE beacon companion app — monitors proximity and alerts on separation"

# 2. Copy content
TMPDIR=$(mktemp -d)
cp -r examples/stitch-to-flutter-baby-watch-v2/* "$TMPDIR/"
cp -r examples/stitch-to-flutter-baby-watch-v2/.converge "$TMPDIR/" 2>/dev/null || true
cp -r examples/stitch-to-flutter-baby-watch-v2/.stitch "$TMPDIR/" 2>/dev/null || true

# 3. Clean converge runtime state
rm -rf "$TMPDIR/.converge/journal" 2>/dev/null || true
rm -rf "$TMPDIR/.converge/artifacts" 2>/dev/null || true

# 4. Add LICENSE if missing
if [ ! -f "$TMPDIR/LICENSE" ]; then
  cp LICENSE "$TMPDIR/LICENSE"
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
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.27.0'
      - run: flutter pub get
      - run: flutter analyze
      - run: flutter test
CI

# 6. Init git and push
cd "$TMPDIR"
git init
git add -A
git commit -m "Initial commit: extract stitch-to-flutter-baby-watch-v2 from converge monorepo

Child safety BLE beacon companion app. Monitors proximity to a BLE beacon
and alerts on separation. Production Flutter app with hardware integration.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git remote add origin "https://github.com/minhlucvan/stitch-to-flutter-baby-watch-v2.git"
git push -u origin main
```
