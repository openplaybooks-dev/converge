---
description: >
  Verify the stripped core monorepo builds correctly:
  - No apps/ directory
  - examples/ has exactly 16 subdirectories
  - pnpm install, build, and test pass
  - No references to split examples in core code
inputs:
  - . (core monorepo)
outputs:
  - (none — verification only)
checks:
  - id: no-apps-dir
    cmd: test ! -d apps
  - id: examples-has-16
    cmd: test $(ls -1 examples/ | wc -l) -eq 16
  - id: install-ok
    cmd: pnpm install
  - id: build-ok
    cmd: pnpm build
  - id: tests-ok
    cmd: pnpm test
  - id: no-stale-refs-in-packages
    cmd: grep -r "examples/" packages/ && exit 1 || true
skills: []
references: []
vars: {}
depends_on: []
---

Verify the stripped core monorepo.

```bash
# Confirm structure
echo "=== Directory check ==="
test ! -d apps || { echo "FAIL: apps/ still exists"; exit 1; }
echo "apps/ removed: OK"

count=$(ls -1 examples/ | wc -l)
test "$count" -eq 16 || { echo "FAIL: examples/ has $count dirs, expected 16"; exit 1; }
echo "examples/ count: $count OK"

# Confirm no stale references
echo "=== Stale reference check ==="
if grep -r "examples/game-aiwolf\|examples/game-assets-3d\|examples/baby-app\|examples/autonomous-pentest\|examples/unity-remix\|examples/unity-mono-remix\|apps/landing\|apps/planner\|apps/playbooks-to" packages/ docs/ 2>/dev/null; then
  echo "FAIL: stale references found"
  exit 1
fi
echo "No stale references: OK"

# Build and test
echo "=== Build ==="
pnpm install && pnpm build && pnpm test
echo "Build and test: OK"
```
