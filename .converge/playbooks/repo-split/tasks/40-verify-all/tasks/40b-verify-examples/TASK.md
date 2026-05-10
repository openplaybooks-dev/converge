---
description: >
  Verify all 10 complex example repos exist on GitHub and are production-ready.
  Each must have README, LICENSE, .gitignore, and CI workflow.
inputs: []
outputs:
  - (none — verification only)
checks:
  - id: game-aiwolf-ready
    cmd: gh repo view minhlucvan/game-aiwolf --json name >/dev/null 2>&1
  - id: game-assets-3d-ready
    cmd: gh repo view minhlucvan/game-assets-3d --json name >/dev/null 2>&1
  - id: baby-app-ready
    cmd: gh repo view minhlucvan/baby-app --json name >/dev/null 2>&1
  - id: baby-watch-v2-ready
    cmd: gh repo view minhlucvan/stitch-to-flutter-baby-watch-v2 --json name >/dev/null 2>&1
  - id: autonomous-pentest-ready
    cmd: gh repo view minhlucvan/autonomous-pentest --json name >/dev/null 2>&1
  - id: cinematic-video-ready
    cmd: gh repo view minhlucvan/cinematic-video-production --json name >/dev/null 2>&1
  - id: financial-deep-research-ready
    cmd: gh repo view minhlucvan/financial-deep-research --json name >/dev/null 2>&1
  - id: converge-design-ready
    cmd: gh repo view minhlucvan/converge-design --json name >/dev/null 2>&1
  - id: unity-remix-ready
    cmd: gh repo view minhlucvan/unity-remix --json name >/dev/null 2>&1
  - id: unity-mono-remix-ready
    cmd: gh repo view minhlucvan/unity-mono-remix --json name >/dev/null 2>&1
skills: []
references: []
vars: {}
depends_on: []
---

Verify all 10 complex example repos exist and have required files.

```bash
repos="game-aiwolf game-assets-3d baby-app stitch-to-flutter-baby-watch-v2 autonomous-pentest cinematic-video-production financial-deep-research converge-design unity-remix unity-mono-remix"

failed=""
for repo in $repos; do
  echo "=== $repo ==="
  if gh repo view "minhlucvan/$repo" --json name >/dev/null 2>&1; then
    echo "  Repo exists: OK"
  else
    echo "  Repo exists: FAIL"
    failed="$failed $repo"
    continue
  fi

  # Clone and check
  TMPDIR=$(mktemp -d)
  if git clone "https://github.com/minhlucvan/$repo.git" "$TMPDIR" 2>/dev/null; then
    test -f "$TMPDIR/README.md" && echo "  README: OK" || { echo "  README: MISSING"; failed="$failed $repo"; }
    test -f "$TMPDIR/LICENSE" && echo "  LICENSE: OK" || { echo "  LICENSE: MISSING"; failed="$failed $repo"; }
    test -f "$TMPDIR/.gitignore" && echo "  .gitignore: OK" || { echo "  .gitignore: MISSING"; failed="$failed $repo"; }
    test -f "$TMPDIR/.github/workflows/ci.yml" && echo "  CI: OK" || { echo "  CI: MISSING"; failed="$failed $repo"; }
    rm -rf "$TMPDIR"
  else
    echo "  Clone: FAIL"
    failed="$failed $repo"
  fi
done

if [ -n "$failed" ]; then
  echo "FAILED repos:$failed"
  exit 1
fi
echo "All 10 example repos verified."
```
